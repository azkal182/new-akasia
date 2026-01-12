'use client';

import { useState } from 'react';
import { Link2, Copy, ExternalLink, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateFormToken, generateApprovalToken } from '@/features/perizinan/actions';

interface TokenGeneratorProps {
  perizinanId?: string; // For approval token
}

export default function TokenGenerator({ perizinanId }: TokenGeneratorProps) {
  const [formLink, setFormLink] = useState<string | null>(null);
  const [approvalLink, setApprovalLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState<'form' | 'approval' | null>(null);

  async function handleGenerateFormLink() {
    setIsGenerating(true);
    try {
      const result = await generateFormToken(7); // 7 days expiry
      if (result.error) {
        toast.error(result.error);
      } else if (result.token) {
        const link = `${window.location.origin}/perizinan/form/${result.token}`;
        setFormLink(link);
        toast.success('Link berhasil dibuat');
      }
    } catch {
      toast.error('Gagal membuat link');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateApprovalLink() {
    if (!perizinanId) return;

    setIsGenerating(true);
    try {
      const result = await generateApprovalToken(perizinanId, 48); // 48 hours expiry
      if (result.error) {
        toast.error(result.error);
      } else if (result.token) {
        const link = `${window.location.origin}/perizinan/approve/${result.token}`;
        setApprovalLink(link);
        toast.success('Link approval berhasil dibuat');
      }
    } catch {
      toast.error('Gagal membuat link');
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyToClipboard(link: string, type: 'form' | 'approval') {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(type);
      toast.success('Link disalin ke clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Gagal menyalin link');
    }
  }

  return (
    <Card className="border-border bg-card/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Link2 className="h-5 w-5" />
          Buat Link Publik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form Link */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Link Form (untuk diisi oleh pemohon)
          </p>
          {formLink ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs text-foreground truncate">
                {formLink}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(formLink, 'form')}
                className="border-border"
              >
                {copied === 'form' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => window.open(formLink, '_blank')}
                className="border-border"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleGenerateFormLink}
              disabled={isGenerating}
              variant="outline"
              className="border-border"
            >
              {isGenerating ? 'Membuat...' : 'Buat Link Form'}
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-1">Valid 7 hari</p>
        </div>

        {/* Approval Link */}
        {perizinanId && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Link Persetujuan (untuk dikirim via WhatsApp)
            </p>
            {approvalLink ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs text-foreground truncate">
                  {approvalLink}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(approvalLink, 'approval')}
                  className="border-border"
                >
                  {copied === 'approval' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => window.open(approvalLink, '_blank')}
                  className="border-border"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleGenerateApprovalLink}
                disabled={isGenerating}
                variant="outline"
                className="border-border"
              >
                {isGenerating ? 'Membuat...' : 'Buat Link Approval'}
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-1">Valid 48 jam, sekali pakai</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
