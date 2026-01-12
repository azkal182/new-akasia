'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { approveWithToken } from '@/features/perizinan/actions';

interface ApproveButtonProps {
  token: string;
}

export default function ApproveButton({ token }: ApproveButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  async function handleApprove() {
    if (!confirm('Yakin ingin menyetujui perizinan ini?')) return;

    setIsSubmitting(true);
    try {
      const result = await approveWithToken(token);
      if (result.error) {
        toast.error(result.error);
      } else {
        setIsApproved(true);
      }
    } catch {
      toast.error('Gagal menyetujui perizinan');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isApproved) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/10">
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Berhasil Disetujui!</h3>
          <p className="text-neutral-300 text-sm mt-1">Perizinan telah disetujui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button
      onClick={handleApprove}
      disabled={isSubmitting}
      className="w-full bg-emerald-600 hover:bg-emerald-500 h-12 text-lg"
    >
      {isSubmitting ? 'Memproses...' : 'Setujui Perizinan'}
    </Button>
  );
}
