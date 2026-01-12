import Link from 'next/link';
import { Plus, Users, Shield, User, MoreHorizontal, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { getUsers } from '@/features/users/actions';

export default async function UsersPage() {
  const users = await getUsers({ includeInactive: true });

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengguna</h1>
          <p className="text-muted-foreground">Kelola pengguna sistem</p>
        </div>
        <Link href="/dashboard/users/new">
          <Button className="bg-blue-600 hover:bg-blue-500">
            <Plus className="mr-2 h-4 w-4" />
            Tambah User
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Total Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{users.length}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Shield className="h-4 w-4 text-amber-500" />
              Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{adminCount}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{activeCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Belum ada pengguna
              </p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg bg-muted/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      user.role === 'ADMIN'
                        ? 'bg-amber-500/20 text-amber-500'
                        : user.role === 'DRIVER'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {user.role === 'ADMIN' ? (
                        <Shield className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{user.name}</p>
                        {!user.isActive && (
                          <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">
                            Nonaktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{user.username} • {user.email || 'Tidak ada email'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          user.role === 'ADMIN'
                              ? 'border-amber-500/50 text-amber-400'
                              : user.role === 'DRIVER'
                                ? 'border-blue-500/50 text-blue-400'
                              : 'border-border text-muted-foreground'
                        }
                      >
                        {user.role}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dibuat: {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-border bg-card">
                        <DropdownMenuItem asChild className="text-foreground">
                          <Link href={`/dashboard/users/${user.id}/edit`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="text-foreground">
                          <Link href={`/dashboard/users/${user.id}/password`}>Ubah Password</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
