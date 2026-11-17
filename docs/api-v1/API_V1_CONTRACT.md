# API v1 Contract (draft for mobile parallel development)

Status: **draft contract**, sesuai kebutuhan frontend/domain yang ditemukan pada 2026-10-04. Base URL produksi disediakan saat deployment. Root API: `/api/v1`. Semua contoh JSON UTF-8.

## Aturan umum

- Semua endpoint kecuali `POST /auth/login` dan `POST /auth/refresh` membutuhkan `Authorization: Bearer <accessToken>`. `POST /auth/logout` membutuhkan bearer.
- `Content-Type: application/json` kecuali upload. Timestamp dikirim sebagai ISO-8601 dengan zona (`2026-10-04T08:30:00+07:00`) dan dikembalikan sebagai UTC ISO (`2026-10-04T01:30:00.000Z`).
- Uang adalah integer rupiah (IDR), bukan string/float. Durasi dinyatakan integer menit. ID adalah UUID string. Null eksplisit bila field nullable.
- Enum mengikuti schema: role `ADMIN|USER|DRIVER`; car status `AVAILABLE|IN_USE|MAINTENANCE`; usage status `ONGOING|COMPLETED`; fuel type `SOLAR|BENSIN`.
- Query list: `page` default 1, `limit` default 20, maks 100. Response pagination seragam. Filter tidak dikenal menghasilkan `400 VALIDATION_ERROR`.
- Mutasi menerima `Idempotency-Key` UUID/opaque string; wajib pada pembelian BBM, direkomendasikan pada start usage. Server menyimpan hasil untuk retry dengan key yang sama. Key sama dengan payload berbeda menghasilkan `409 IDEMPOTENCY_KEY_REUSED`.

### Envelope sukses

```json
{
  "data": {},
  "meta": { "requestId": "req_01J..." }
}
```

List memakai `data` array dan `meta.pagination`:

```json
{
  "data": [],
  "meta": {
    "requestId": "req_01J...",
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

### Envelope error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Periksa kembali data yang dikirim.",
    "details": [{ "field": "carId", "message": "Kendaraan wajib dipilih." }],
    "requestId": "req_01J..."
  }
}
```

`details` opsional. Status: `400` payload/query invalid, `401` absent/invalid/expired auth, `403` tidak berhak, `404` resource tidak ada atau tidak terlihat bagi caller, `409` state conflict/duplicate, `413` upload terlalu besar, `415` MIME tidak didukung, `429` rate limit, `500` kesalahan tak terduga. Error tidak mengembalikan stack/SQL.

## Auth dan profil

### `POST /auth/login` — public

Request:

```json
{ "username": "driver01", "password": "secret", "device": { "name": "Pixel 8", "platform": "ANDROID", "appVersion": "1.0.0" } }
```

Response `200`:

```json
{
  "data": {
    "accessToken": "opaque-access-token",
    "accessTokenExpiresAt": "2026-10-04T02:00:00.000Z",
    "refreshToken": "opaque-refresh-token",
    "refreshTokenExpiresAt": "2026-11-03T01:45:00.000Z",
    "user": { "id": "uuid", "name": "Nama", "username": "driver01", "email": null, "role": "DRIVER" }
  },
  "meta": { "requestId": "req_..." }
}
```

Credential invalid, user nonaktif, atau terhapus memberi `401 INVALID_CREDENTIALS` tanpa membedakan penyebab.

### `POST /auth/refresh` — public

Request `{ "refreshToken": "opaque-refresh-token" }`. Response sama seperti login dengan token baru (rotation). Refresh lama langsung tidak berlaku; refresh reuse memberi `401 REFRESH_TOKEN_REUSED` dan mencabut keluarga sesi sesuai kebijakan keamanan.

### `POST /auth/logout` — bearer

Mencabut sesi/token keluarga saat ini. Response `204` tanpa body. Logout tetap sukses bila sesi sudah dicabut.

### `GET /me` — bearer

`200 { "data": { "id": "uuid", "name": "Nama", "username": "driver01", "email": null, "role": "DRIVER" }, "meta": {...} }`.

## Home dan armada

### `GET /home`

Payload gabungan untuk bootstrap layar DriverView:

```json
{
  "data": {
    "user": { "id": "uuid", "name": "Nama", "username": "driver01", "role": "DRIVER" },
    "myActiveUsage": [],
    "availableCars": [{ "id": "uuid", "name": "Avanza", "licensePlate": "B 1234 ABC", "status": "AVAILABLE" }],
    "activeUsageRecords": []
  },
  "meta": { "requestId": "req_...", "generatedAt": "2026-10-04T01:30:00.000Z" }
}
```

`myActiveUsage` dan `activeUsageRecords` item adalah usage resource berikut. `availableCars` hanya mobil tidak terhapus dan status AVAILABLE. `activeUsageRecords` tidak perlu diisi pada role yang tidak diizinkan melihat pemakaian user lain; rekomendasi v1: hanya `ADMIN` melihat global list, driver menerima `[]`.

### `GET /cars?status=AVAILABLE&page=1&limit=20`

`200` list CarSummary:

```json
{ "data": [{ "id": "uuid", "name": "Avanza", "licensePlate": "B 1234 ABC", "status": "AVAILABLE" }], "meta": { "requestId": "req_...", "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 } } }
```

Default `status=AVAILABLE` untuk pemilih kendaraan. Filter yang valid: `AVAILABLE|IN_USE|MAINTENANCE`. Driver hanya mendapat data ringkas yang dibutuhkan operasi.

## Penggunaan kendaraan

### Resource `UsageRecord`

```json
{
  "id": "uuid", "purpose": "Antar barang", "destination": "Surabaya",
  "estimatedDays": 1, "estimatedDurationMinutes": 180,
  "startTime": "2026-10-04T01:30:00.000Z", "endTime": null, "status": "ONGOING",
  "car": { "id": "uuid", "name": "Avanza", "licensePlate": "B 1234 ABC", "status": "IN_USE" },
  "user": { "id": "uuid", "name": "Nama", "username": "driver01" },
  "createdAt": "2026-10-04T01:30:00.000Z"
}
```

Field `user` dikembalikan hanya kepada ADMIN atau pemilik record. `estimatedDays` dapat null; `estimatedDurationMinutes` direkomendasikan selalu diisi oleh API v1. `status` adalah `COMPLETED` saat `endTime` tidak null.

### `GET /me/usage-records?active=true&page=1&limit=20`

Riwayat milik user terautentikasi. `active=true` berarti `endTime=null`; `active=false` berarti sudah berakhir; bila tidak dikirim semua. Urut terbaru dulu. Mengembalikan paginated list.

### `GET /usage-records?active=true&carId={uuid}&page=1&limit=20`

ADMIN/USER yang memiliki akses Armada dapat meminta daftar global sesuai permission aplikasi. DRIVER hanya boleh meminta record sendiri; server menerapkan filter pemilik secara paksa. `active` memakai semantik di atas.

### `POST /usage-records`

Request:

```json
{
  "carId": "uuid",
  "purpose": "Antar barang",
  "destination": "Surabaya",
  "estimatedDurationMinutes": 180,
  "startTime": "2026-10-04T08:30:00+07:00"
}
```

`estimatedDurationMinutes` integer positif; batas maksimum direkomendasikan 30 hari (43200 menit). `startTime` optional; default waktu server bila tidak dikirim. Untuk kompatibilitas frontend, `estimatedDays` boleh diterima sebagai alternatif jika minutes tidak diberikan, dikonversi ke `days*1440`; jangan menerima keduanya berbeda nilai.

Response `201` berisi UsageRecord lengkap. Kendaraan hilang/terhapus `404 CAR_NOT_FOUND`, tidak tersedia `409 CAR_UNAVAILABLE`, invalid `400 VALIDATION_ERROR`. User ID selalu berasal dari bearer. Satu request hanya membuat satu record; request ulang dengan Idempotency-Key sama mengembalikan hasil pertama.

### `POST /usage-records/{usageRecordId}/end`

Request `{ "endTime": "2026-10-04T12:30:00+07:00" }`; `endTime` optional (default server time). Response `200` berisi UsageRecord final dan car status AVAILABLE. Pemilik atau ADMIN; user lain `404`/`403` sesuai kebijakan cegah enumerasi. Record sudah selesai atau mobil/record state tidak konsisten `409 USAGE_ALREADY_ENDED` / `409 CAR_STATE_CONFLICT`. Update record dan car wajib atomik. Idempotent untuk retry: record yang telah selesai dapat dikembalikan sebagai sukses hanya bila idempotency key request sama.

## Upload bukti dan pembelian BBM

### `POST /uploads` — upload intent

Request:

```json
{ "purpose": "FUEL_RECEIPT", "fileName": "nota.jpg", "mimeType": "image/jpeg", "sizeBytes": 324000 }
```

Response `201`:

```json
{ "data": { "uploadId": "uuid", "uploadUrl": "https://signed-storage-url", "method": "PUT", "headers": { "Content-Type": "image/jpeg" }, "expiresAt": "2026-10-04T01:45:00.000Z", "objectKey": "receipts/fuel/..." }, "meta": { "requestId": "req_..." } }
```

Client upload ke URL dengan method/headers tepat; URL/headers bersifat sementara. Batas awal disarankan image/jpeg, image/png, image/webp, maksimum 10 MiB. Jangan kirim `uploadUrl` ke endpoint bisnis sebagai URL bebas.

### `POST /uploads/{uploadId}/complete`

Request `{}` setelah upload sukses. Server memverifikasi upload benar-benar ada, ukuran/MIME sesuai, dan upload intent milik user. Response `200`:

```json
{ "data": { "uploadId": "uuid", "fileUrl": "https://storage/...", "fileName": "nota.jpg", "mimeType": "image/jpeg", "sizeBytes": 324000, "status": "READY" }, "meta": { "requestId": "req_..." } }
```

URL dikeluarkan server; client menyimpan `uploadId` untuk mutasi.

### `POST /fuel/purchases`

Permission rekomendasi mengikuti `can.inputFuel`: `ADMIN` dan `USER`. Jangan anggap keberadaan tombol pada DriverView sebagai grant permission untuk role DRIVER; policy harus diputuskan sebelum release.

Header wajib `Idempotency-Key: <key>`.

Request:

```json
{
  "carId": "uuid",
  "totalAmount": 250000,
  "date": "2026-10-04T08:30:00+07:00",
  "notes": "Isi di SPBU",
  "receiptUploadId": "uuid"
}
```

Nilai `totalAmount` integer > 0; tanggal memenuhi aturan tanggal BBM dari `src/features/fuel/constants.ts`; receipt READY dan dimiliki user. `literAmount`/`pricePerLiter` tidak diinput oleh frontend saat ini (aksi mengisi 0), jadi API v1 tidak meminta keduanya.

Response `201`:

```json
{
  "data": {
    "id": "uuid",
    "type": "FUEL_PURCHASE",
    "ledger": "FUEL",
    "amount": 250000,
    "description": "Pembelian BBM - Avanza (B 1234 ABC)",
    "date": "2026-10-04T01:30:00.000Z",
    "balanceBefore": 1000000,
    "balanceAfter": 750000,
    "fuelPurchase": {
      "id": "uuid", "carId": "uuid", "literAmount": 0, "pricePerLiter": 0,
      "totalAmount": 250000, "fuelType": "SOLAR", "receiptUrl": "https://storage/...", "notes": "Isi di SPBU"
    },
    "createdBy": { "id": "uuid", "name": "Nama" },
    "createdAt": "2026-10-04T01:30:00.000Z"
  },
  "meta": { "requestId": "req_..." }
}
```

`balanceBefore/After` ditentukan server. Mobil tidak ditemukan `404 CAR_NOT_FOUND`; invalid upload/tanggal `400`; role tak berhak `403`; idempotency conflict `409`.

## Endpoint fase lanjutan (nama disiapkan, bukan komitmen implementasi fase 1)

| Modul frontend | Rute yang disarankan | Data penting |
|---|---|---|
| Dashboard admin | `GET /dashboard/summary?period=...` | finance/fuel summary hanya ADMIN |
| Keuangan | `GET/POST /finance/transactions`, `GET /finance/balance`, `GET /finance/reports/monthly` | ledger, tipe, jumlah, balance, income/expense items |
| Fuel admin | `GET /fuel/transactions`, `GET /fuel/reports/monthly`, `POST /fuel/incomes` | transaksi dan laporan Hijri/Gregorian harus ditentukan |
| Tax | `GET/POST /taxes`, `GET /taxes/upcoming`, `POST /taxes/{id}/payments` | mobil, dueDate, payment history |
| Pengajuan | `GET/POST /fund-requests`, `POST /fund-requests/{id}/approve`, `POST .../reject` | items, estimation, image, status |
| Perizinan | `GET/POST /vehicle-permissions`, `POST /vehicle-permissions/{id}/approve|reject` | pemohon, kendaraan, date, passengers, estimation |
| Spending | `/spending/tasks`, `/spending/tasks/{id}/funding`, `/receipts`, `/cashbacks`, `/settlements` | workflow status dan itemized receipts |
| Users/Cars admin | CRUD `/users`, `/cars` | ADMIN; password tidak pernah diserialisasi |
| Program kerja | `GET /work-program/today`, `/schedules`, `/reports` | saat ini sumbernya eksternal lewat integration proxy |

Rute lanjutan harus tetap memakai envelope/error/auth di atas dan dibuat sesuai kebutuhan aktual tiap halaman, bukan mengekspos semua field Prisma.

## Mapping field: UI -> API

| UI field / kebutuhan | Request/response API | Catatan |
|---|---|---|
| Nama mobil + plat + status | `CarSummary` | `licensePlate` nullable |
| Tujuan penggunaan | `purpose` | string wajib |
| Tempat tujuan | `destination` | string wajib |
| Estimasi UI (menit/jam/hari) | `estimatedDurationMinutes` | UI mengonversi ke menit |
| Mulai/selesai | `startTime`, `endTime` | ISO offset input, UTC response |
| Mobil sedang digunakan | `activeUsageRecords[].car` | untuk daftar busy/global status |
| Driver aktif | `activeUsageRecords[].user` | jangan expose ke nonauthorized role |
| Nominal pembelian | `totalAmount` | integer IDR |
| Bukti nota | `receiptUploadId` | upload intent milik user |
| Identitas akun | `user` | tidak pernah sertakan password/hash |

## Contoh cURL

```bash
curl -X POST "$API/api/v1/usage-records" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3870f89d-19f1-4af7-a32b-859ef893e4cb" \
  -d '{"carId":"00000000-0000-4000-8000-000000000001","purpose":"Antar barang","destination":"Surabaya","estimatedDurationMinutes":180,"startTime":"2026-10-04T08:30:00+07:00"}'
```

## Catatan untuk tim mobile

- Simpan refresh token di secure storage OS (Keychain/Keystore), access token hanya di memory/secure storage sesuai platform. Tangani `401` dengan satu refresh terkoordinasi, lalu ulang request hanya untuk operasi idempotent.
- Format rupiah, countdown estimasi dan label durasi adalah presentasi client; server mengembalikan menit/timestamp yang kanonik.
- List global record pengguna lain perlu dirender hanya bila role/policy mengizinkan.
- Contract ini draft cukup untuk membuat networking layer dan mock DriverView. Perubahan enum/field breaking harus menaikkan versi (`/api/v2`) atau melalui deprecation yang diumumkan.

# Kontrak fitur lengkap (fase setelah baseline)

Bagian ini melengkapi matrix endpoint awal menjadi cakupan seluruh menu/fitur lokal yang ada. Semua memakai aturan envelope, auth, tanggal, pagination dan error di bagian sebelumnya. Kecuali disebutkan lain, endpoint list memakai `page`, `limit`; endpoint admin harus memvalidasi role pada server. JSON resource berikut menjelaskan field minimum yang dijamin; field relasi yang tidak dicantumkan tidak dikirim.

## Dashboard

- `GET /dashboard/summary?year=2026&month=10` — ADMIN; gabungan saldo finance/fuel, income/expense bulan berjalan, jumlah mobil dan status, penggunaan aktif, pajak jatuh tempo, pengajuan/perizinan pending. Bentuk `data: { period:{year,month}, finance:{balance,income,expense}, fuel:{balance,income,purchase}, fleet:{total,available,inUse,maintenance}, activeUsageCount, upcomingTaxCount, pendingFundRequests, pendingVehiclePermissions }`. `GET /home` tetap bootstrap role aware untuk aplikasi mobile; tidak mengirim nilai keuangan pada role yang tidak punya akses.
- `GET /dashboard/notifications` opsional hanya setelah sumber notifikasi ditetapkan; tracking notifikasi pajak saat ini sudah ada di model, tetapi belum ada pusat notifikasi mobile.

## Kendaraan dan laporan armada

- `GET /cars/{id}` — CarDetail: `id,name,licensePlate,chassisNumber,bpkbOwnerName,barcodeString,status,createdAt,updatedAt`, `recentUsage[]`, `recentFuelPurchases[]`, `taxes[]`. Sensitif (nomor rangka/nama pemilik BPKB) hanya untuk role armada yang berhak; response driver sebaiknya CarSummary.
- `POST /cars`, `PATCH /cars/{id}`, `DELETE /cars/{id}` — ADMIN. Request create/update `{name,licensePlate,chassisNumber?,bpkbOwnerName?,barcodeString?}`; update dapat mengubah `status` hanya melalui aksi terpisah dengan pemeriksaan tidak ada pemakaian ongoing. Delete adalah soft delete dan ditolak `409 CAR_IN_USE` bila sedang digunakan.
- `GET /cars/summary?from&to` — ADMIN; statistik penggunaan per kendaraan dan status.
- `GET /cars/reports/usage?from&to&carId?` — ADMIN; rekap pemakaian dan durasi.
- `GET /cars/{id}/usage-records` — role Armada; filter tanggal/status, pagination. Resource mengikuti UsageRecord.
- `GET /cars/{id}/fuel-purchases` — ADMIN/USER sesuai akses Fuel; item meliputi nominal dan receipt.

## Penggunaan kendaraan

Endpoint `/usage-records` dan `/me/usage-records` pada kontrak awal meliputi daftar dan start/end. Tambahan: `GET /usage-records/{id}`; `GET /usage-records/monthly?year&month` dan `GET /usage-records/monthly?hijriYear&hijriMonth` mendukung halaman report yang menggunakan kalender Hijriah. Jangan mengirim dua sistem tanggal bersamaan; response menyertakan `period:{calendar:"GREGORIAN"|"HIJRI",year,month,startAt,endAt}` dan agregat `count,totalDurationMinutes,byCar[]`.

## Keuangan

Permission mengikuti helper saat ini: ringkasan dan report hanya ADMIN; input pemasukan/pengeluaran ADMIN atau USER. Mutasi finance wajib idempotency key.

- `GET /finance/transactions?type=INCOME|EXPENSE&from&to&year&month&search&page&limit`; `GET /finance/transactions/{id}`.
- Resource Transaction: `{id,type,ledger:"FINANCE",amount,description,date,balanceBefore,balanceAfter,user:{id,name},income?:{source,notes},expense?:{receiptUrl,notes,items:[{id,description,quantity,unitPrice,total,carId,car?}]},createdAt,updatedAt}`.
- `POST /finance/incomes` body `{amount,source,date,notes?}`; `PATCH /finance/incomes/{transactionId}` body field sama; `DELETE /finance/transactions/{id}` soft delete bila aman untuk urutan ledger. Income response Transaction.
- `POST /finance/expenses` body `{date,description,notes?,receiptUploadId?,items:[{description,quantity,unitPrice,carId?}]}`; `PATCH /finance/expenses/{transactionId}` dengan bentuk setara; `DELETE /finance/transactions/{id}`. Backend menghitung `total = sum(quantity*unitPrice)`, receipt harus owned upload. Validasi harga mengikuti schema frontend (quantity/unitPrice positive).
- `GET /finance/balance` response `{balance,asOf}`; `GET /finance/reports/monthly?year&month` response `{period,income,expense,balance,transactionsByDay[]}`.
- `GET /finance/reports/monthly?hijriYear&hijriMonth` dan `GET /finance/transactions?hijriYear&hijriMonth` mengikuti halaman Hijri; response menyertakan batas Gregorian hasil konversi server.
- Menghapus/mengedit transaksi historis dapat mengubah saldo transaksi berikutnya. Perhitungan balanceBefore/After dan perubahan ledger wajib berada dalam satu transaksi DB/strategi konsistensi; mobile tidak pernah mengirim saldo.

## BBM

Permission yang direkomendasikan tetap ADMIN/USER untuk input; report dan ringkasan ADMIN. Selain `POST /fuel/purchases` pada kontrak awal:

- `GET /fuel/transactions?type=INCOME|FUEL_PURCHASE&carId&from&to&page&limit`; `GET /fuel/transactions/{id}`.
- `POST /fuel/incomes` `{amount,source,date,notes?}`; `PATCH /fuel/incomes/{transactionId}`; `DELETE /fuel/transactions/{id}`.
- `PATCH /fuel/purchases/{transactionId}` `{carId,totalAmount,date,notes?,receiptUploadId?}`; `DELETE /fuel/transactions/{id}`. Hapus/edit transaksi memerlukan guard ledger dan authorization.
- `GET /fuel/balance`; `GET /fuel/reports/monthly?year&month`; varian Hijriah `?hijriYear&hijriMonth`; `GET /fuel/purchases/monthly?hijriYear&hijriMonth` untuk halaman pembelian.
- FuelPurchase resource: `{id,carId,literAmount,pricePerLiter,totalAmount,fuelType,receiptUrl,notes,createdAt}`. Frontend driver flow saat ini membuat liter dan harga per liter nol, sementara fitur administrasi mungkin mengelola field tambahan; pertahankan nilai nol di alur itu hingga aturan bisnis diperbarui.

## Pajak kendaraan

Role baca/input pajak ditetapkan ADMIN (sesuai menu dashboard/admin); pembayaran harus berupa transaksi idempotent.

- `GET /taxes?isPaid=true|false&carId&dueBefore&dueAfter&page&limit`, `GET /taxes/upcoming?days=30`, `GET /taxes/{id}`.
- Tax resource `{id,type:"ANNUAL"|"FIVE_YEAR",dueDate,isPaid,paidAt,notes,car:{id,name,licensePlate},payments:[{id,amount,paidAt,notes}],createdAt,updatedAt}`.
- `POST /taxes` `{carId,type,dueDate,notes?,generateCycle?}`. `generateCycle` menjalankan siklus/backfill yang ada; API mengembalikan `{created:[Tax...]}` sehingga client tahu seluruh record yang dibuat.
- `PATCH /taxes/{id}` `{type,dueDate,notes}`; `DELETE /taxes/{id}` hanya jika belum dibayar/tidak ada dependensi sesuai aturan.
- `POST /taxes/{id}/payments` `{amount,paidAt?,notes?,nextDueDate?}`. Response `{tax,payment,generatedNextTax?}`; transisi `isPaid` dan pembayaran atomik. Jangan tandai lunas tanpa payment record.

## Pengajuan dana (fund request)

Enum status `PENDING|APPROVED|REJECTED|COMPLETED`. List/detail/create untuk USER/ADMIN; approve/reject/complete ADMIN. Model tidak menyimpan aktor pembuat atau reviewer, jadi audit actor harus ditambahkan ke schema/migration sebelum kontrak menjanjikan audit trail.

- `GET /fund-requests?status&page&limit`, `GET /fund-requests/{id}`.
- `POST /fund-requests` body `{notes?,items:[{requirement,estimation,carId,imageUploadId?}]}`; minimal satu item. `date` dibuat server saat ini karena frontend tidak meminta tanggal.
- FundRequest response `{id,date,status,notes,items:[{id,requirement,estimation,imageUrl,car:{id,name,licensePlate}}],createdAt,updatedAt}`.
- `POST /fund-requests/{id}/approve` body `{}`; `POST /fund-requests/{id}/reject` `{reason}`; `POST /fund-requests/{id}/complete` `{}` untuk menyelesaikan status yang saat ini tersedia di enum tetapi action UI perlu diverifikasi. Transisi invalid `409 INVALID_STATUS_TRANSITION`.

## Perizinan kendaraan + tautan publik

Status `PENDING|APPROVED|REJECTED`; Token type `FORM|APPROVE`. ADMIN mengelola dan menyetujui; formulir umum tetap dapat diakses tanpa bearer memakai token terbatas. Jangan memaparkan approval token pada daftar perizinan.

- `GET /vehicle-permissions?status&carId&from&to&page&limit`, `GET /vehicle-permissions/{id}`.
- `POST /vehicle-permissions` `{carId,name,purpose,destination,description?,numberOfPassengers,date,estimation}`. Membuat permintaan dan mengirim notifikasi WhatsApp asinkron sesuai service.
- `POST /vehicle-permissions/{id}/approve`, `POST /vehicle-permissions/{id}/reject` body `{reason?}`. APPROVED memicu notifikasi.
- `POST /vehicle-permission-form-tokens` ADMIN `{expiresInDays?:number}`; response `{token,expiresAt,formUrl}`. `GET /public/vehicle-permission-forms/{token}` memberi `{valid,expiresAt,cars:[CarSummary]}` tanpa user session. `POST /public/vehicle-permission-forms/{token}/submissions` memakai payload create permission minus auth. Token sekali pakai/expired memberi `410 TOKEN_EXPIRED_OR_USED`.
- `POST /vehicle-permissions/{id}/approval-tokens` ADMIN `{expiresInHours?:number}`; response token/link hanya saat dibuat. Public `POST /public/vehicle-permission-approvals/{token}` body `{decision:"APPROVE"|"REJECT",reason?}`; bila frontend public sekarang hanya approve, reject ditambahkan hanya jika alur produk disepakati. Gunakan rate limit dan token sekali pakai.
- `GET /vehicle-permission-tokens` ADMIN metadata tanpa token rahasia (id,type,expiresAt,usedAt,perizinanId); `DELETE /vehicle-permission-tokens/{id}` ADMIN mencabut.

## Spending, receipt, wallet, cashback, settlement

Enums: task `DRAFT|FUNDED|SPENDING|NEEDS_REFUND|NEEDS_REIMBURSE|SETTLED`; settlement `REFUND|REIMBURSE`; settlement status `PENDING|DONE`; wallet type `CREDIT|DEBIT`; source `CASHBACK|MANUAL`. Hak saat ini belum ditetapkan konsisten oleh semua action; kontrak implementasi harus menetapkan role policy (rekomendasi ADMIN/USER, DRIVER tidak diberi akses finansial).

- `GET /spending/tasks?status&page&limit`, `POST /spending/tasks` `{title,description?}`, `GET /spending/tasks/{id}`, `PATCH /spending/tasks/{id}` `{title,description?}`. Task summary `{budget,totalReceipts,diff,refundDue,reimburseDue,isLocked}` dihitung server. Perubahan task terkunci bila settlement DONE.
- `POST /spending/tasks/{id}/funding` `{amount,receivedAt?,source?,notes?}`, `PATCH` endpoint sama untuk update funding.
- `POST /spending/tasks/{id}/receipts` `{vendor?,receiptNo?,receiptDate?,notes?,totalAmount,items:[{description,quantity,unitPrice}],attachmentUploadIds?:[]}`. Minimal satu item; backend hitung total item dan validasi dengan totalAmount atau jelaskan toleransi selisih. `DELETE /spending/receipts/{receiptId}` hanya saat task belum locked.
- Receipt response `{id,vendor,receiptNo,receiptDate,notes,totalAmount,items:[{id,description,quantity,unitPrice,total}],attachments:[{id,fileUrl,fileName,mimeType,sizeBytes}],cashbacks:[...],createdAt}`.
- `POST /spending/receipts/{receiptId}/cashbacks` `{amount,vendor?,notes?,occurredAt?}`; server membuat Cashback sekaligus WalletEntry CREDIT source CASHBACK atomik.
- `POST /spending/tasks/{id}/settlements/refund/complete` `{notes?}`; `POST /spending/tasks/{id}/settlements/reimburse/complete` `{notes?}`. Server hitung due berdasarkan funding dan receipt/cashback; jangan percaya nominal settlement dari client. Response task summary + settlement.
- `GET /spending/wallet?limit=25` response `{balance,entries:[{id,type,source,amount,description,occurredAt,attachmentUrl,taskId,createdBy:{id,name}}]}`; balance = credit minus debit.
- `POST /spending/wallet/entries` `{type,amount,description?,occurredAt?,attachmentUploadId?}`; source selalu MANUAL dari server, createdBy dari token. Hanya ADMIN/authorized finance role.
- `GET /spending/reports/monthly?year&month` (frontend `getSpendingReport(year,month)`) mengembalikan spending/funding/receipt/cashback/refund/reimburse totals dan detail agregat yang dipakai report UI.

## Pengguna dan akun

- `GET /users?role&includeInactive&page&limit`, `GET /users/{id}` — ADMIN.
- `POST /users` `{name,username,email?,password,role}` — ADMIN; password min 6 saat ini, hashing server, response tanpa password/hash.
- `PATCH /users/{id}` `{name,username,email?,role,isActive}` — ADMIN.
- `PUT /users/{id}/password` `{newPassword}` — ADMIN; semua sesi mobile target dicabut. `PUT /me/password` `{currentPassword,newPassword}` untuk perubahan mandiri perlu ditambahkan ke UI/API jika dibutuhkan.
- `PATCH /users/{id}/status` `{isActive}`; `DELETE /users/{id}` soft delete (endpoint lebih baik diganti status disable agar tidak ambigu). Operasi revoke sesi akun.
- User resource `{id,name,username,email,role,isActive,createdAt,counts:{transactions,usageRecords}}`; tidak pernah mengirim hash.

## Program kerja / Integrasi eksternal

Halaman Program Kerja menggunakan integration client yang memanggil upstream `/api/integrations/v1/...` dengan `x-integration-key` server-side. Aplikasi lokal tidak punya model jadwal/sesi sendiri. Mobile sebaiknya memanggil adapter lokal yang meneruskan autentikasi user dan menerapkan permission, bukan mengakses upstream atau mendapatkan integration key.

Rute adapter yang sudah tersedia di `/api/integration/*`:

- `GET /integration/field/today?divisionId` dan `GET /integration/schedules?divisionId&date`.
- `GET /integration/divisions/{divisionId}/schedules?date`, `POST /integration/sessions` `{scheduleId}`, `GET /integration/sessions/{id}`, `PUT /integration/sessions/{id}` `{status:"COMPLETED"|"COMPLETED_WITH_ISSUE",issueNote?}`.
- `GET/POST/DELETE /integration/sessions/{id}/photos`; multipart upload; delete memakai `photoId` query.
- `GET/POST/DELETE /integration/sessions/{id}/documents`; multipart upload; delete memakai `documentId` query.
- `POST /integration/reports` dan `POST /integration/divisions/{divisionId}/reports` dengan `{scheduleId,status:"COMPLETED"|"COMPLETED_WITH_ISSUE"|"NOT_EXECUTED",issueNote?,replaceEvidence?,evidences?:[{type:"PHOTO",url,caption?}|{type:"DOCUMENT",url,filename}]}`.
- `GET /integration/divisions/{divisionId}/reports`.

Endpoint ini saat ini memiliki handler proxy tetapi dokumentasi rute tidak menunjukkan autentikasi user domain di handler. Sebelum memasukkannya dalam API v1 publik, tambahkan guard, allowlist division, validasi kepemilikan session/evidence, dan normalisasi error ke envelope v1. Jangan menaruh `x-integration-key` di aplikasi mobile.

## Matriks role yang disarankan

| Kapabilitas | ADMIN | USER | DRIVER |
|---|---:|---:|---:|
| Profil, daftar mobil operasional | Ya | Ya | Ya (ringkas) |
| Memulai/mengakhiri pemakaian sendiri | Ya | Ya | Ya |
| Melihat pemakaian user lain | Ya | sesuai akses Armada | Tidak |
| Input BBM | Ya | Ya | Perlu keputusan; UI menunjukkan tombol |
| Ringkasan/laporan finance dan fuel | Ya | Tidak | Tidak |
| Input pemasukan/pengeluaran finance/fuel | Ya | Ya | Tidak |
| CRUD car/user/tax dan approvals | Ya | Tidak | Tidak |
| Program kerja | Ya | Ya | Ya, sesuai integrasi/division |
| Spending/wallet | Ya | Ya (policy perlu formal) | Tidak direkomendasikan |

Permission matrix ini target untuk mobile; implementasi wajib memeriksa permission per route dan resource. Perbedaan kebijakan yang ada di frontend harus diselesaikan, tidak ditafsirkan longgar dari menu yang terlihat.
