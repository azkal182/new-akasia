import { notFound } from 'next/navigation';
import { CheckCircle2, AlertCircle, Clock, MapPin, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { validateToken } from '@/features/perizinan/actions';
import ApproveButton from './approve-button';

interface ApprovePageProps {
  params: Promise<{ token: string }>;
}

export default async function ApprovePage({ params }: ApprovePageProps) {
  const { token } = await params;

  // Validate token
  const validation = await validateToken(token);

  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <Card className="border-red-500/30 bg-red-500/10 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-400 text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Link Tidak Valid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-neutral-300">{validation.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validation.tokenData?.type !== 'APPROVE') {
    notFound();
  }

  const perizinan = validation.tokenData.perizinan;
  if (!perizinan) {
    notFound();
  }

  // If already approved/rejected
  if (perizinan.status !== 'PENDING') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <Card className={`max-w-md w-full ${
          perizinan.status === 'APPROVED'
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-red-500/30 bg-red-500/10'
        }`}>
          <CardContent className="py-12 text-center">
            {perizinan.status === 'APPROVED' ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Sudah Disetujui</h2>
                <p className="text-neutral-300">Perizinan ini sudah disetujui sebelumnya.</p>
              </>
            ) : (
              <>
                <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Sudah Ditolak</h2>
                <p className="text-neutral-300">Perizinan ini sudah ditolak sebelumnya.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Persetujuan Perizinan</h1>
          <p className="text-neutral-400 mt-2">Review dan setujui permohonan berikut</p>
        </div>

        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Detail Permohonan</CardTitle>
              <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                Menunggu
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Pemohon</p>
                  <p className="text-white font-medium">{perizinan.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Tujuan</p>
                  <p className="text-white font-medium">{perizinan.destination}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Tanggal & Durasi</p>
                  <p className="text-white font-medium">
                    {new Date(perizinan.date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                    {' '}• {perizinan.estimation} hari
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Keperluan</p>
                  <p className="text-white font-medium">{perizinan.purpose}</p>
                </div>
              </div>
            </div>

            {perizinan.description && (
              <div className="pt-3 border-t border-neutral-800">
                <p className="text-sm text-neutral-400 mb-1">Keterangan:</p>
                <p className="text-neutral-300">{perizinan.description}</p>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-800">
              <p className="text-sm text-neutral-400 mb-1">Kendaraan:</p>
              <p className="text-white font-medium">
                {perizinan.car.name} - {perizinan.car.licensePlate}
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-800">
              <p className="text-sm text-neutral-400 mb-1">Jumlah Penumpang:</p>
              <p className="text-white font-medium">{perizinan.numberOfPassengers} orang</p>
            </div>
          </CardContent>
        </Card>

        <ApproveButton token={token} />
      </div>
    </div>
  );
}
