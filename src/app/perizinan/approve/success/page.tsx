import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ApprovalSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="border-emerald-500/30 bg-emerald-500/10 max-w-md w-full">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Perizinan Disetujui</h1>
          <p className="text-foreground">
            Perizinan kendaraan berhasil disetujui. Notifikasi persetujuan akan dikirim melalui
            WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
