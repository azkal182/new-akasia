# Cloudflare R2 Storage

Upload internal aplikasi menggunakan adapter di `src/lib/storage.ts`.

- `STORAGE_PROVIDER=supabase`: perilaku lama, cocok selama rollout.
- `STORAGE_PROVIDER=r2`: semua upload baru masuk ke Cloudflare R2.
- URL Supabase yang sudah tersimpan di database tetap digunakan tanpa perubahan.
- Delete object mengenali R2 atau Supabase dari URL publiknya.
- `STORAGE_FALLBACK_TO_SUPABASE=true` dapat dipakai sementara jika upload harus
  tetap berjalan saat R2 gagal. Default yang disarankan adalah `false`.

## Persiapan R2

1. Buat bucket R2.
2. Buat R2 API token dengan izin Object Read & Write untuk bucket tersebut.
3. Hubungkan custom domain publik atau aktifkan URL publik `r2.dev`.
4. Tambahkan konfigurasi berikut ke environment deployment:

```env
STORAGE_PROVIDER=r2
STORAGE_FALLBACK_TO_SUPABASE=false

R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET=akasia
R2_PUBLIC_URL=https://files.example.com
```

`R2_ACCOUNT_ID` harus berisi Account ID Cloudflare asli, bukan nama bucket,
bukan URL publik `r2.dev`, dan bukan placeholder `replace-with-*`.

`R2_ENDPOINT` hanya perlu diisi jika endpoint tidak menggunakan format default
`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.

Credential Supabase lama tetap perlu tersedia selama aplikasi masih harus
menghapus object lama atau menggunakan fallback.

## Rollout Aman

1. Deploy kode dengan `STORAGE_PROVIDER=supabase`.
2. Isi dan validasi seluruh credential R2.
3. Ubah `STORAGE_PROVIDER=r2` di staging dan tes upload receipt expense, fuel,
   dan spending.
4. Ubah `STORAGE_PROVIDER=r2` di production.
5. Pertahankan bucket Supabase lama agar URL existing tetap dapat dibuka.

Tidak ada migrasi database yang diperlukan karena aplikasi menyimpan URL publik
absolut. Object lama dapat dipindahkan kemudian dengan proses migrasi terpisah,
tetapi URL database harus diperbarui jika bucket Supabase lama akan dimatikan.
