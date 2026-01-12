import {
  Car,
  Wallet,
  Fuel,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardDriverStatus } from '@/components/dashboard-driver-status';

export default function DashboardPage() {
  // TODO: Fetch real data from database
  const stats = [
    {
      title: 'Total Saldo',
      value: 'Rp 12.500.000',
      change: '+12%',
      trend: 'up',
      icon: Wallet,
      color: 'from-emerald-500 to-green-600',
    },
    {
      title: 'Jumlah Armada',
      value: '8',
      change: '+2',
      trend: 'up',
      icon: Car,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      title: 'Pengeluaran BBM',
      value: 'Rp 3.200.000',
      change: '-5%',
      trend: 'down',
      icon: Fuel,
      color: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Pengajuan Pending',
      value: '3',
      change: 'menunggu',
      trend: 'neutral',
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
              <div className="mt-1 flex items-center gap-1">
                {stat.trend === 'up' && (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                )}
                {stat.trend === 'down' && (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                {stat.trend === 'neutral' && (
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                )}
                <span
                  className={`text-xs ${
                    stat.trend === 'up'
                      ? 'text-emerald-500'
                      : stat.trend === 'down'
                        ? 'text-red-500'
                        : 'text-amber-500'
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-xs text-neutral-500">dari bulan lalu</span>
              </div>
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
              {[
                { desc: 'Pembelian Solar', amount: '-Rp 500.000', type: 'expense' },
                { desc: 'Dana Yayasan', amount: '+Rp 5.000.000', type: 'income' },
                { desc: 'Service Kendaraan', amount: '-Rp 1.200.000', type: 'expense' },
              ].map((trx, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-3">
                  <span className="text-sm text-neutral-300">{trx.desc}</span>
                  <span
                    className={`text-sm font-medium ${
                      trx.type === 'income' ? 'text-emerald-500' : 'text-red-400'
                    }`}
                  >
                    {trx.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              Status Armada
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                6 Tersedia
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Toyota Innova', plate: 'B 1234 XYZ', status: 'available' },
                { name: 'Mitsubishi Pajero', plate: 'B 5678 ABC', status: 'in_use' },
                { name: 'Toyota Avanza', plate: 'B 9012 DEF', status: 'available' },
              ].map((car, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{car.name}</p>
                    <p className="text-xs text-neutral-500">{car.plate}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      car.status === 'available'
                        ? 'border-emerald-500/50 text-emerald-400'
                        : 'border-amber-500/50 text-amber-400'
                    }
                  >
                    {car.status === 'available' ? 'Tersedia' : 'Digunakan'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              Pajak Mendatang
              <Badge variant="outline" className="border-red-500/50 text-red-400">
                2 Jatuh Tempo
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { car: 'Innova (B 1234 XYZ)', type: 'Tahunan', due: '15 Jan 2025' },
                { car: 'Pajero (B 5678 ABC)', type: '5 Tahun', due: '20 Feb 2025' },
                { car: 'Avanza (B 9012 DEF)', type: 'Tahunan', due: '10 Mar 2025' },
              ].map((tax, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{tax.car}</p>
                    <p className="text-xs text-neutral-500">{tax.type}</p>
                  </div>
                  <span className="text-xs text-amber-400">{tax.due}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
