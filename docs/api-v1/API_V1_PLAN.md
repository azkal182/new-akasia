# Rencana pembangunan API v1 untuk aplikasi mobile

## Ringkasan

API v1 menjadi antarmuka REST stabil untuk client mobile, sementara Next.js web tetap memakai Server Actions pada fase pertama. Prisma/PostgreSQL, model domain, validasi dan layanan bisnis tetap menjadi sumber kebenaran yang sama. Endpoint mobile memanggil service/use-case bersama; hindari menyalin logika transaksi dari Server Actions ke route handlers.

Cakupan v1 yang disarankan adalah **mobile operasional driver** karena frontend memiliki `DriverView` khusus: melihat status mengemudi sendiri, memilih kendaraan, memulai/mengakhiri penggunaan, dan membeli BBM dengan bukti nota. Fitur ini didukung model `Car`, `UsageRecord`, `Transaction` dan `FuelPurchase`. Perluasan admin/keuangan direncanakan setelah baseline operasional stabil.

## Temuan arsitektur dan frontend

- Next.js 16 App Router, TypeScript, Prisma 7, PostgreSQL; NextAuth 5 Credentials login dengan `username`/`password`, bcrypt, session JWT internal web.
- Role `ADMIN`, `USER`, `DRIVER`; helper `can` mengizinkan driver melihat Program Kerja, sedangkan ringkasan keuangan/laporan/admin dibatasi ke ADMIN. Driver mode menampilkan `DriverView` di luar halaman Program Kerja dan ringkasan armada.
- `DriverView` memuat `getCurrentUserDrivingStatus()`, `getCars()` dan `getActiveUsageRecords()`. Form mulai memakai `carId`, `purpose`, `destination`, satuan durasi (menit/jam/hari), `startTime`; form selesai memakai `recordId`, `endTime`. Form isi BBM memakai `carId`, jumlah nominal, tanggal dan file nota wajib.
- `startCarUsage` memeriksa ketersediaan dan secara atomik mengubah status mobil menjadi `IN_USE` serta membuat record. `endCarUsage` hanya dapat dilakukan oleh pemilik record kecuali ADMIN, lalu mengubah mobil menjadi `AVAILABLE`. API harus mempertahankan aturan dan transaksi atomik ini.
- `purchaseFuel` memerlukan receipt, menulis ledger transaksi BBM, dan menentukan deskripsi dari mobil. Validasi tanggal BBM dan logika saldo berada di action/util terkait; pindahkan ke service bersama sebelum expose lewat API.
- API `/api/integration/*` yang ada adalah proxy ke layanan eksternal memakai `x-integration-key`, bukan API mobile/domain lokal. Jangan gunakan kunci integrasi itu sebagai autentikasi mobile.
- Action lain mengindikasikan fitur keuangan (ledger dan mutasi), pajak/pembayaran, pengajuan, perizinan, spending/wallet dan program kerja. Beberapa list action belum melakukan filter soft-delete/pagination; kontrak baru perlu merapikan ini tanpa mengubah makna bisnis secara diam-diam.

## Sasaran dan batasan

### Sasaran v1

1. Login mobile, sesi access/refresh yang dapat dicabut, identitas dan role yang jelas.
2. Inisialisasi beranda operasional: profil, status berkendara aktif, record aktif user, kendaraan yang bisa dipilih, dan kendaraan sedang dipakai.
3. Mulai dan akhiri penggunaan kendaraan dengan validasi otorisasi serta perlindungan race condition.
4. Catat pembelian BBM untuk kendaraan dengan upload bukti aman.
5. Respons JSON konsisten, tanggal ISO-8601 UTC, nominal rupiah dalam integer IDR, kontrak yang bisa dipakai oleh mobile sebelum implementasi.
6. Jejak audit dasar (aktor, waktu, request ID), rate limit auth, log tanpa password/token.

### Tidak termasuk fase pertama

CRUD administratif penuh untuk pengguna, transaksi ledger umum, pengeluaran kompleks, report PDF, approval link publik, dan konfigurasi master data. Endpoint eksternal program kerja dapat diintegrasikan kemudian; endpoint proxy yang sekarang tidak boleh diasumsikan sebagai domain lokal.

## Desain teknis

- Route handlers berada di `src/app/api/v1/**/route.ts`; tetapkan `runtime = "nodejs"` untuk Prisma/bcrypt/upload.
- Buat modul bersama `src/lib/api-v1/` untuk response/error, auth access token, role/permission, parsing pagination, request ID, dan validasi Zod. Extract use-case domain misalnya `src/features/cars/services/usage.service.ts` dan `src/features/fuel/services/fuel.service.ts`; Server Actions web dan REST handlers memanggil use-case yang sama.
- Jangan menjadikan NextAuth cookie/session JWT sebagai bearer API. Rekomendasi: opaque access token berumur pendek (mis. 15 menit) dan refresh token berotasi (mis. 30 hari) disimpan sebagai hash di tabel `MobileSession` baru, berisi user, expiry, revokedAt, device metadata. Akses dengan `Authorization: Bearer`. Logout mencabut sesi; rotasi refresh mencabut token lama dan mendeteksi penggunaan ulang. Rencana migrasi/auth alternatif harus disepakati sebelum implementasi.
- Autentikasi memvalidasi user masih `isActive`, `deletedAt == null`; authorization server-side berdasarkan role dan ownership. Jangan percaya `userId` yang dikirim client untuk aksi atas nama user.
- Upload receipt menggunakan presigned upload flow: API memberi URL bertanda tangan dan object key terbatas, client upload, lalu mengonfirmasi metadata/URL. Alternatif multipart langsung boleh dipilih jika infrastruktur storage membutuhkannya. URL final harus dinormalisasi melalui storage helper; jangan menerima URL sembarang dari client. Buat upload intent terikat ke sesi/user, batasi tipe MIME/ukuran dan scan bila fasilitas tersedia.
- Aturan availability dijaga di DB transaction/updateMany conditional (`status = AVAILABLE`) dan kegagalan konflik jadi `409 CAR_UNAVAILABLE`; jangan check-then-write saja. Ending record memverifikasi kepemilikan serta status aktif dan mengubah record + status mobil atomik.
- Untuk ledger BBM, rangkum kalkulasi saldo dan create transaction/fuelPurchase dalam transaksi DB yang aman terhadap penulisan bersamaan. Hindari mengandalkan angka saldo yang dikirim client.
- Pagination cursor atau page/limit diseragamkan. Gunakan limit default 20, maksimum 100. Untuk v1, endpoint list penggunaan terbaru dengan filter yang didukung saja.

## Tahapan implementasi dan hasil

### 0. Keputusan dan fondasi kontrak

- Validasi scope mobile/role dan flow upload dengan pemilik produk/mobile.
- Kunci contract pada `API_V1_CONTRACT.md`; sepakati camelCase, enum Prisma saat ini, waktu UTC, IDR integer, error envelope, auth lifetime, dan upload transport.
- Buat OpenAPI 3.1 dari kontrak (sumber tunggal, jangan dokumentasi ganda manual) dan berikan mock server/fixture kepada tim mobile.
- Definisikan tabel sesi mobile, migrasi, indeks expiry/user, strategi revoke semua sesi saat akun dinonaktifkan/perubahan password.

**Selesai bila:** tim mobile bisa membuat client/mock tanpa membaca implementasi, dan contoh payload lolos schema.

### 1. API platform

- Tambah response helper, `ApiError`, validasi body/query, `requestId`, parser tanggal dan serializer eksplisit (jangan return object Prisma mentah).
- Implementasi login, refresh rotation, logout, `GET /me`, guard bearer dan role guard.
- Tambah rate limiting login/refresh, redaksi log, CORS allowlist untuk kebutuhan mobile/webview bila relevan (native app tidak dibatasi CORS), security headers dan mekanisme revoke.

**Selesai bila:** flow auth bekerja pada instalasi baru, token invalid/expired/nonaktif ditolak konsisten dan session dapat direvoke.

### 2. Alur driver + kendaraan

- `GET /home` mengembalikan data gabungan yang dibutuhkan layar awal; `GET /cars` hanya kendaraan tidak terhapus dengan informasi ringkas/status.
- `GET /me/usage-records?active=true`; `POST /usage-records`; `POST /usage-records/{id}/end`.
- Periksa ulang `getCars()` dan aturan kepemilikan record aktif. Tetapkan apakah user dibolehkan memiliki beberapa record aktif sekaligus; frontend menampilkan array, jadi kontrak sementara juga array. Rekomendasi produk: larang start kedua untuk user sampai record pertama ditutup.
- Tes konkurensi start satu mobil oleh dua request, end ganda, record milik orang lain, dan aksi ADMIN.

**Selesai bila:** semua keadaan layar DriverView bisa dirender hanya dari REST, konflik menghasilkan status HTTP yang benar.

### 3. Pembelian BBM dengan receipt

- Upload intent, konfirmasi receipt dan `POST /fuel/purchases`.
- Pindahkan validasi tanggal, saldo/ledger, penyimpanan receipt dan create transaction ke service bersama. Respons berisi transaksi yang diserialisasi dan mobil ringkas.
- Definisikan idempotency key untuk create mutasi agar retry jaringan tidak menggandakan transaksi; simpan key+user+hasil secara unik.
- Jangan izinkan DRIVER melakukan input BBM kecuali kebijakan saat ini secara eksplisit memutuskan demikian. Frontend `DriverView` memunculkan isi BBM pada DriverView, sedangkan helper `can.inputFuel` hanya ADMIN/USER. Ini konflik kebijakan UI/domain yang harus diselesaikan. Rekomendasi default: otorisasi server mengikuti `can.inputFuel` (ADMIN/USER), atau tambah izin eksplisit untuk DRIVER sebelum release.

**Selesai bila:** upload putus/retry aman, receipt terhubung, serta saldo/ledger tetap konsisten.

### 4. Hardening, observability, rilis

- Kontrak OpenAPI dipublish sebagai artifact internal; contract tests untuk route dan generated client mobile.
- Uji skenario permission per role, expiry/revocation, idempotensi, batas ukuran file, zona waktu Jakarta, soft-delete, dan database transaction.
- Monitoring latensi/error per route, log request ID tanpa data kredensial, alert kegagalan refresh dan ledger.
- Versi deploy `/api/v1`; gunakan feature flag untuk pilot; dokumentasikan environment/secrets, rotasi signing/storage keys, dan proses rollback.

## Tahapan lanjutan setelah operasional

1. **Driver + program kerja:** jadwal/today/report hanya bila domain jadwal milik aplikasi atau adapter integrasi memiliki skema stabil. Saat ini `/api/integration/*` memanggil service eksternal.
2. **Pengajuan/perizinan:** list/detail/create/status serta approval ADMIN; pertahankan alur token publik terpisah dan jangan bocorkan token approval pada endpoint mobile.
3. **Pajak/armada admin:** daftar pajak, jatuh tempo, pembayaran; CRUD mobil/user dengan guard ADMIN.
4. **Keuangan/BBM admin:** ledger, filter tanggal/tipe, ringkasan dan laporan. Saldo harus dihitung dari ledger; pertimbangkan konsistensi saldo tersimpan.
5. **Spending/wallet:** task, funding, receipt/items, cashback, settlement dan saldo wallet. Ini workflow multi-step; desain state transition khusus dan audit trail sebelum expose.

## Risiko dan keputusan produk yang perlu dibekukan

- Hak akses DRIVER untuk refuel dari UI tidak cocok dengan `can.inputFuel`.
- Auth mobile belum ada; strategi refresh rotation dan tabel sesi perlu dibuat, jangan mengekspos NextAuth credentials sebagai API baru tanpa lifecycle sesi.
- Start usage hanya cek ketersediaan kendaraan; tidak mencegah user yang sama mempunyai beberapa mobil aktif. Putuskan invariant bisnis.
- `CarStatus` dan `UsageRecord` dapat tidak konsisten dari data lama; siapkan reconciliation/operational check sebelum rollout.
- Pembelian BBM membuat `literAmount` dan `pricePerLiter` bernilai nol pada flow driver dan memasukkan hanya nominal total; mobile jangan meminta liter/harga per liter di v1 kecuali skema bisnis diperbarui.
- Soft delete berlaku pada `User`/`Car`/`Transaction`, tidak konsisten di semua query/actions. API baru wajib mengecualikan data terhapus.
- Definisi timezone tanggal input harus menggunakan ISO offset eksplisit; database menyimpan timestamp. UI web menerima date lokal, sehingga kontrak mobile harus menjelaskan interpretasi UTC.

## Pemetaan sumber frontend/domain

| Kebutuhan layar | Sumber saat ini | Data/API v1 |
|---|---|---|
| Driver home/status | `src/components/driver-view.tsx`; `getCurrentUserDrivingStatus`, `getActiveUsageRecords` | `/home`, `/me/usage-records`, `/usage-records?active=true` |
| Pilih kendaraan | `getCars` dan `Car` | `/cars?status=AVAILABLE` |
| Mulai/akhiri pemakaian | `src/features/cars/actions/usage.action.ts` | `POST /usage-records`, `POST /usage-records/{id}/end` |
| Beli BBM/nota | `src/features/fuel/actions/fuel.action.ts` | `/uploads`, `POST /fuel/purchases` |
| Dashboard/admin lain | halaman `src/app/(dashboard)/dashboard/**`, actions `src/features/**/actions` | Fase berikutnya sesuai modul |

## Cakupan fitur lengkap yang sudah dipetakan

Kontrak lengkap mencakup semua kelompok halaman frontend lokal: dashboard; kendaraan dan penggunaan; finance; fuel; pajak; pengajuan; perizinan dan token publik; spending task, funding, receipt, cashback, wallet, settlement dan report; users; serta Program Kerja yang saat ini merupakan adapter layanan eksternal. Definisi tiap route, field payload minimum, permission dan catatan domain tersedia di `API_V1_CONTRACT.md`.

### Urutan delivery jika seluruh fitur masuk v1

1. **Platform/auth + domain types + OpenAPI**. Tanpa fondasi auth dan response seragam, tiap modul akan membuat pola sendiri.
2. **Master data + operasi**: users (admin), cars, usage, upload dan fuel. Ini mendukung driver serta data inti.
3. **Ledger**: finance dan fuel income/expense/purchase/report. Migrasikan perhitungan saldo ke service transaksional dan lakukan verifikasi saldo historis.
4. **Workflow administrasi**: tax/payments, pengajuan/approval, perizinan/approval-token publik.
5. **Spending kompleks**: task/funding/receipt/cashback/wallet/settlement/report; definisikan state transitions, lock rules, dan audit actor terlebih dahulu.
6. **Dashboard + integration adapter**: agregasi role-aware dan hardening proxy Program Kerja; adapter external API perlu auth user sebelum mobile.
7. **Release readiness**: mock server, contract compatibility gate, rate limit, idempotency, observability, migrasi, rollout bertahap dan dokumentasi client.

Setiap tahap dibangun route-by-route dengan service/use-case yang dipakai juga oleh web Server Actions. Per modul perlu: inventarisasi semua pembacaan/mutasi UI, DTO (bukan Prisma model), schema validasi, permission matrix, transaksi/idempotensi, respons/error, contoh fixture, serta acceptance flow. Full feature parity berarti tidak hanya seluruh route tersedia, tetapi aksi/filters/report yang tampak di setiap halaman punya hasil yang sama pada web dan mobile.
