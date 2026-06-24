'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { approveWithToken } from '@/features/perizinan/actions';

interface ApproveButtonProps {
  token: string;
}

export default function ApproveButton({ token }: ApproveButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleApprove() {
    if (!confirm('Yakin ingin menyetujui perizinan ini?')) return;

    setIsSubmitting(true);
    try {
      const result = await approveWithToken(token);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.replace('/perizinan/approve/success');
      }
    } catch {
      toast.error('Gagal menyetujui perizinan');
    } finally {
      setIsSubmitting(false);
    }
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
