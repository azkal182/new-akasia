import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { validateToken, getPublicCars } from '@/features/perizinan/actions';
import PublicPerizinanForm from './form';

interface PublicFormPageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { token } = await params;

  // Validate token
  const validation = await validateToken(token);

  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-red-500/30 bg-red-500/10 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-400 text-center">Link Tidak Valid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-foreground">{validation.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validation.tokenData?.type !== 'FORM') {
    notFound();
  }

  // Get cars for the form
  const cars = await getPublicCars();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Form Perizinan Kendaraan</h1>
          <p className="text-muted-foreground mt-2">Isi formulir untuk mengajukan izin penggunaan kendaraan</p>
        </div>

        <PublicPerizinanForm token={token} cars={cars} />
      </div>
    </div>
  );
}
