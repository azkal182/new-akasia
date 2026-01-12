import { Car, Wallet, Fuel, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardDriverStatus } from '@/components/dashboard-driver-status';
import { formatDate, formatRupiah } from '@/lib/utils';
import { getBalance, getTransactions } from '@/features/finance/actions';
import { getCars } from '@/features/cars/actions';
import { getPengajuans } from '@/features/pengajuan/actions';
import { getUpcomingTaxes } from '@/features/tax/actions';
import { getCurrentHijriDate, getFuelMonthlyReport } from '@/features/fuel/actions';

export default async function DashboardPage() {
  const hijri = await getCurrentHijriDate();
  const [
    balance,
    cars,
    pengajuans,
    recentTransactions,
    upcomingTaxes,
    fuelReport,
  ] = await Promise.all([
    getBalance(),
    getCars(),
    getPengajuans(),
    getTransactions({ limit: 3 }),
    getUpcomingTaxes(30),
    getFuelMonthlyReport(hijri.hijriYear, hijri.hijriMonth),
  ]);

  const availableCars = cars.filter((car) => car.status === 'AVAILABLE').length;
  const inUseCars = cars.filter((car) => car.status === 'IN_USE').length;
  const pendingPengajuans = pengajuans.filter((p) => p.status === 'PENDING').length;

  const stats = [
    {
      title: 'Total Saldo',
      value: formatRupiah(balance),
      subtitle: 'Saldo bersih operasional',
      icon: Wallet,
      color: 'from-emerald-500 to-green-600',
    },
    {
      title: 'Jumlah Armada',
      value: String(cars.length),
      subtitle: `${availableCars} tersedia • ${inUseCars} digunakan`,
      icon: Car,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      title: 'Pengeluaran BBM',
      value: formatRupiah(fuelReport.totalExpense),
      subtitle: `${fuelReport.hijriMonth} ${fuelReport.hijriYear}H`,
      icon: Fuel,
      color: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Pengajuan Pending',
      value: String(pendingPengajuans),
      subtitle: `Total ${pengajuans.length} pengajuan`,
      icon: FileText,
      color: 'from-purple-500 to-pink-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400">Selamat datang kembali!</p>
      </div>

      {/* Driver Status Card */}
      <DashboardDriverStatus />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-neutral-800 bg-neutral-900/50 backdrop-blur-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-400">
                {stat.title}
              </CardTitle>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color}`}
              >
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="mt-1 text-xs text-neutral-500">{stat.subtitle}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              Transaksi Terakhir
              <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                Lihat Semua
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-neutral-500">Belum ada transaksi.</p>
              ) : (
                recentTransactions.map((trx) => (
                  <div
                    key={trx.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-neutral-300">
                        {trx.description || `Pengeluaran untuk ${trx.expense?.items[0]?.car?.name ?? 'armada'}`}
                      </span>
                      <span className="text-xs text-neutral-600">
                        {formatDate(trx.date)}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        trx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-400'
                      }`}
                    >
                      {trx.type === 'INCOME' ? '+' : '-'}
                      {formatRupiah(trx.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              Status Armada
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                {availableCars} Tersedia
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cars.slice(0, 3).map((car) => {
                const statusLabel =
                  car.status === 'AVAILABLE'
                    ? 'Tersedia'
                    : car.status === 'IN_USE'
                      ? 'Digunakan'
                      : 'Perawatan';
                const statusClass =
                  car.status === 'AVAILABLE'
                    ? 'border-emerald-500/50 text-emerald-400'
                    : car.status === 'IN_USE'
                      ? 'border-amber-500/50 text-amber-400'
                      : 'border-red-500/50 text-red-400';
                return (
                  <div
                    key={car.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{car.name}</p>
                      <p className="text-xs text-neutral-500">{car.licensePlate ?? '-'}</p>
                    </div>
                    <Badge variant="outline" className={statusClass}>
                      {statusLabel}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              Pajak Mendatang
              <Badge variant="outline" className="border-red-500/50 text-red-400">
                {upcomingTaxes.length} Jatuh Tempo
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTaxes.length === 0 ? (
                <p className="text-sm text-neutral-500">Tidak ada pajak mendatang.</p>
              ) : (
                upcomingTaxes.slice(0, 3).map((tax) => (
                  <div
                    key={tax.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {tax.car.name} ({tax.car.licensePlate ?? '-'})
                      </p>
                      <p className="text-xs text-neutral-500">
                        {tax.type === 'FIVE_YEAR' ? 'STNK 5 Tahunan' : 'Pajak Tahunan'}
                      </p>
                    </div>
                    <span className="text-xs text-amber-400">{formatDate(tax.dueDate)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
