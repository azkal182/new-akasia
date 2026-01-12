'use client';

import { useState } from 'react';
import { Check, X, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { approvePerizinan, rejectPerizinan, generateApprovalToken } from '@/features/perizinan/actions';

interface PerizinanActionsProps {
  perizinanId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function PerizinanActions({ perizinanId, status }: PerizinanActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  async function handleApprove() {
    setIsApproving(true);
    try {
      const result = await approvePerizinan(perizinanId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Perizinan disetujui');
        setCurrentStatus('APPROVED');
      }
    } catch {
      toast.error('Gagal menyetujui');
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    if (!confirm('Yakin ingin menolak perizinan ini?')) return;

    setIsRejecting(true);
    try {
      const result = await rejectPerizinan(perizinanId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Perizinan ditolak');
        setCurrentStatus('REJECTED');
      }
    } catch {
      toast.error('Gagal menolak');
    } finally {
      setIsRejecting(false);
    }
  }

  async function handleGenerateLink() {
    setIsGeneratingLink(true);
    try {
      const result = await generateApprovalToken(perizinanId, 48);
      if (result.error) {
        toast.error(result.error);
      } else if (result.token) {
        const link = `${window.location.origin}/perizinan/approve/${result.token}`;
        await navigator.clipboard.writeText(link);
        toast.success('Link approval disalin ke clipboard');
      }
    } catch {
      toast.error('Gagal membuat link');
    } finally {
      setIsGeneratingLink(false);
    }
  }

  // If already processed, don't show actions
  if (currentStatus !== 'PENDING') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        size="sm"
        onClick={handleApprove}
        disabled={isApproving || isRejecting}
        className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs"
      >
        {isApproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
        Setuju
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleReject}
        disabled={isApproving || isRejecting}
        className="h-7 text-xs"
      >
        {isRejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
        Tolak
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerateLink}
        disabled={isGeneratingLink}
        className="h-7 text-xs border-border"
        title="Salin link approval untuk WhatsApp"
      >
        {isGeneratingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
      </Button>
    </div>
  );
}
