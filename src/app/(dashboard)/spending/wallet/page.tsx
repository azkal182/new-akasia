import Link from "next/link";
import { ArrowLeft, Wallet as WalletIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRupiah } from "@/lib/utils";
import { getWalletOverview } from "@/features/spending/actions";
import { WalletEntryForm } from "@/features/spending/components/wallet-entry-form";

export default async function WalletPage() {
  const { balance, entries } = await getWalletOverview();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/spending">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dompet Global</h1>
          <p className="text-muted-foreground">
            Saldo internal dari pengembalian & catatan manual
          </p>
        </div>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Saldo Saat Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-3xl font-bold ${
              balance >= 0 ? "text-emerald-500" : "text-red-400"
            }`}
          >
            {formatRupiah(balance)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Tambah Catatan</CardTitle>
        </CardHeader>
        <CardContent>
          <WalletEntryForm />
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Riwayat Catatan</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada catatan.</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-muted/40 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {entry.description ||
                        (entry.source === "CASHBACK"
                          ? "Pengembalian"
                          : "Catatan manual")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.occurredAt)} •{" "}
                      {entry.createdBy?.name ?? "Sistem"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        entry.type === "CREDIT"
                          ? "text-emerald-500"
                          : "text-red-400"
                      }`}
                    >
                      {entry.type === "CREDIT" ? "+" : "-"}
                      {formatRupiah(entry.amount)}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground"
                    >
                      {entry.type === "CREDIT" ? "Kredit" : "Debit"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
