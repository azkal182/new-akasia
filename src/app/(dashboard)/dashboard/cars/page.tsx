import Link from 'next/link';
import { Plus, Car, Fuel, FileText, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCars } from '@/features/cars/actions';

export default async function CarsPage() {
  const cars = await getCars();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Armada</h1>
          <p className="text-sm text-neutral-400">Kelola kendaraan operasional</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/cars/usage">
            <Button variant="outline" size="sm" className="border-neutral-700 hover:bg-neutral-800">
              <Car className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Penggunaan</span>
            </Button>
          </Link>
          <Link href="/dashboard/cars/new">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Tambah</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">
              Total Kendaraan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{cars.length}</div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">
              Sedang Digunakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {cars.filter((c) => c.usageRecords[0]?.endTime === null).length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">
              Tersedia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {cars.filter((c) => !c.usageRecords[0] || c.usageRecords[0]?.endTime !== null).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Car List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cars.length === 0 ? (
          <div className="col-span-full rounded-lg border border-neutral-800 bg-neutral-900/50 p-8 text-center">
            <Car className="mx-auto h-12 w-12 text-neutral-600" />
            <p className="mt-4 text-neutral-400">Belum ada kendaraan terdaftar</p>
            <Link href="/dashboard/cars/new">
              <Button className="mt-4 bg-blue-600 hover:bg-blue-500">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Mobil Pertama
              </Button>
            </Link>
          </div>
        ) : (
          cars.map((car) => {
            const isInUse = car.usageRecords[0]?.endTime === null;
            return (
              <Link key={car.id} href={`/dashboard/cars/${car.id}`} className="block">
                <Card className="border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-800/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isInUse ? 'bg-amber-500/20' : 'bg-blue-500/20'
                    }`}>
                      <Car className={`h-5 w-5 ${isInUse ? 'text-amber-500' : 'text-blue-500'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base text-white">{car.name}</CardTitle>
                      <p className="text-sm text-neutral-500">{car.licensePlate}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-neutral-400">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-neutral-800 bg-neutral-900">
                      <DropdownMenuItem className="text-neutral-300">
                        <Link href={`/dashboard/cars/${car.id}`}>Lihat Detail</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-neutral-300">
                        <Link href={`/dashboard/cars/${car.id}/edit`}>Edit</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={isInUse
                          ? 'border-amber-500/50 text-amber-400'
                          : 'border-emerald-500/50 text-emerald-400'
                        }
                      >
                        {isInUse ? 'Digunakan' : 'Tersedia'}
                      </Badge>
                      {isInUse && car.usageRecords[0]?.user && (
                        <span className="text-xs text-neutral-500">
                          oleh {car.usageRecords[0].user.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                      <div className="flex items-center gap-1">
                        <Fuel className="h-4 w-4" />
                        <span>{car._count.fuelPurchases} BBM</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{car._count.taxes} Pajak</span>
                      </div>
                    </div>
                  </div>
              </CardContent>
              </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
