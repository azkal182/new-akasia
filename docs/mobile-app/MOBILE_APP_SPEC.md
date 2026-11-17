# Spesifikasi Mobile App Akasia

Status: spesifikasi produk dan UX untuk implementasi mobile serta simulasi mock. Mengacu pada halaman, role, aksi, dan model yang ada di proyek per 4 Oktober 2026. Dokumen ini menjelaskan **apa yang pengguna lihat dan lakukan**, bukan pilihan teknologi.

## 1. Tujuan dan prinsip

Aplikasi mobile membawa fitur inti web ke pengalaman layar kecil untuk tiga role: `ADMIN`, `USER`, dan `DRIVER`. Semua role menggunakan satu aplikasi dan satu sistem navigasi berbasis permission. Backend menjadi sumber otorisasi final; menyembunyikan tombol saja tidak cukup.

Aplikasi harus dapat didemokan dan dikembangkan tanpa backend dengan mock yang stateful. Perubahan yang dilakukan di mock (misalnya mulai penggunaan mobil, membayar pajak, menambah receipt) langsung tercermin di layar berikutnya sampai data di-reset. Pengembang dapat mengganti persona/role dari panel simulasi tanpa login ulang.

Prinsip UX:

- Beranda memberi akses cepat ke tugas harian dan status yang perlu ditindaklanjuti.
- Navigasi memprioritaskan aktivitas yang sering dilakukan; seluruh fitur tersedia lewat menu, dengan menu dan aksi disesuaikan role.
- Status proses selalu terlihat: draft/pending/approved/rejected/settled, kendaraan available/in use/maintenance, pajak paid/unpaid.
- Form panjang dibagi menjadi langkah yang dapat disimpan sementara; kesalahan ditampilkan pada field terkait.
- Nominal menggunakan format Rupiah, tanggal ditampilkan dalam zona waktu lokal perangkat; data API tetap menyimpan timestamp kanonik.
- Operasi tulis harus memberi konfirmasi sukses/gagal dan mencegah submit ganda. Daftar memiliki pencarian/filter, sorting relevan, empty state, loading, error, dan pull-to-refresh.
- Bukti gambar/dokumen dapat dipilih dari kamera/galeri atau file, ditinjau sebelum dikirim, dan terlihat di detail.

## 2. Role dan mode akses

### ADMIN

Akses penuh: dashboard ringkasan, finance/fuel summary dan report, operasi transaksi, armada dan laporan, tax, pengajuan/perizinan dan approval, spending/wallet, manajemen user, dan Program Kerja sesuai divisi.

### USER

Akses operasional: dashboard umum, kendaraan dan pemakaian, input finance/fuel, pengajuan/perizinan, spending/wallet, dan Program Kerja sesuai divisi. Tidak melihat finance/fuel summary dan report admin-only. Tidak mengelola user/tax/master kendaraan kecuali permission khusus disepakati.

### DRIVER

Mode kerja sederhana: beranda operasional, status pemakaian sendiri, pilih kendaraan tersedia, mulai/akhiri pemakaian, daftar penggunaan sendiri, dan Program Kerja sesuai divisi. Ringkasan finance, report, menu admin, serta data pribadi pengguna lain tidak tampil. Ringkasan kendaraan dapat dilihat bila dibutuhkan.

**Keputusan produk yang harus dipertahankan dalam UX:** web `DriverView` menampilkan aksi pembelian BBM untuk driver, tetapi `can.inputFuel` hanya mengizinkan ADMIN/USER. Spec menampilkan aksi Isi BBM untuk DRIVER hanya dalam mode mock/permission konfigurabel; di mode backend tombol tampil hanya jika server mengirim capability `fuel.purchase=true`. Sebelum rollout, pemilik produk menetapkan apakah capability ini diberikan ke DRIVER.

### Policy capability

| Area | ADMIN | USER | DRIVER |
|---|---|---|---|
| Dashboard umum | Penuh | Ringkas | Operasional |
| Finance ringkasan/report | Ya | Tidak | Tidak |
| Finance input income/expense | Ya | Ya | Tidak |
| Fuel ringkasan/report | Ya | Tidak | Tidak |
| Fuel input income/purchase | Ya | Ya | Keputusan produk |
| Car list/summary/detail | Penuh | Operasional | Ringkas/operasional |
| Car CRUD/status | Ya | Tidak | Tidak |
| Usage sendiri | Ya | Ya | Ya |
| Usage global | Ya | Sesuai akses armada | Tidak |
| Tax CRUD/payment | Ya | Tidak | Tidak |
| Pengajuan create/list | Ya | Ya | Sesuai kebijakan; mock awal izinkan buat |
| Pengajuan approve/reject | Ya | Tidak | Tidak |
| Perizinan create/list | Ya | Ya | Sesuai kebutuhan operasional |
| Perizinan approve/reject/token | Ya | Tidak | Tidak |
| Spending/wallet | Ya | Ya* | Tidak |
| User management | Ya | Tidak | Tidak |
| Program Kerja | Ya | Ya | Ya |

`*` Fitur spending actions saat ini belum memiliki policy konsisten; mock menggunakan ADMIN/USER dan konfigurasi capability agar dapat menguji pembatasan.

## 3. Peta navigasi

### Navigasi utama

- **Beranda** — ringkasan personal dan shortcut.
- **Operasional** — Armada, Pemakaian, BBM, Program Kerja (yang tampil mengikuti role).
- **Administrasi** — Finance, Pengajuan, Perizinan, Pajak, Spending (yang tampil mengikuti role).
- **Lainnya** — Laporan, Manajemen pengguna (ADMIN), profil, pengaturan, bantuan.

Pada layar kecil, gunakan navigasi bawah untuk Beranda, Operasional, Pengajuan/Spending sesuai role, dan Menu. Daftar lengkap berada di Menu. Driver melihat navigasi bawah khusus Beranda, Pemakaian, Program Kerja, Profil; aksi utama mulai pemakaian berada di Beranda/Pemakaian.

### Role switching di mock

Panel simulasi dev tersedia dari menu profil: `Persona: ADMIN | USER | DRIVER`, pilih akun/persona, reset skenario, pilih skenario awal, aktifkan/menonaktifkan capability opsional. Panel tidak muncul di build rilis. Perubahan role memuat ulang menu, beranda, guard layar dan aksi, bukan hanya label role.

## 4. Inventaris halaman dan kebutuhan

### 4.1 Autentikasi dan akun

**Login**

- Field username dan password, tampil/sembunyikan password, validasi kosong, status submit.
- Error kredensial generik, akun nonaktif, koneksi gagal, retry.
- Sukses mengambil profil/capability lalu mengarahkan ke Beranda role terkait.
- Mock memungkinkan memilih persona dari halaman login atau masuk sebagai persona demo; tidak menampilkan password nyata.

**Profil & sesi**

- Nama, username, email bila ada, role, logout.
- Status offline/sinkronisasi.
- Di mock ada panel pergantian persona/reset; di rilis tidak ada.

**Manajemen user (ADMIN)**

- Daftar: cari nama/username, filter role dan aktif/nonaktif; tampilkan jumlah aktivitas jika tersedia.
- Detail/edit: nama, username, email, role, status aktif.
- Tambah user: nama, username, email opsional, password, role.
- Ubah password user dan konfirmasi aksi.
- Nonaktifkan/soft delete dengan dialog konfirmasi; sesi user dinonaktifkan.
- Empty state dan error duplikasi username/email.

### 4.2 Beranda

Beranda disusun berdasarkan role dan menampilkan data dari aktivitas aktual:

- Greeting dan tanggal lokal; badge jaringan/mock.
- **ADMIN:** ringkasan Finance (saldo, income/expense periode), Fuel, jumlah/status kendaraan, pajak mendatang, pengajuan/perizinan menunggu, spending aktif; shortcut transaksi, approvals, armada, laporan.
- **USER:** shortcut input income/expense/BBM, buat pengajuan/perizinan, spending task, kendaraan tersedia, Program Kerja hari ini; tanpa nilai ringkasan yang dibatasi admin.
- **DRIVER:** kartu status mengemudi (aktif/tidak), kendaraan yang dipakai, tujuan, timer estimasi, CTA Mulai/Akhiri, kendaraan tersedia dan aktivitas Program Kerja hari ini. Tombol BBM bergantung capability.
- Tap kartu membuka list/detail terkait. Tampilkan skeleton/loading, error dengan retry, empty state yang memberi CTA.

### 4.3 Armada dan mobil

**Daftar kendaraan**

- Search nama/plat; filter status `AVAILABLE`, `IN_USE`, `MAINTENANCE`.
- Item: nama, plat, status, driver aktif (role yang boleh melihat), aksi detail.
- DRIVER hanya melihat data ringkas dan kendaraan yang relevan untuk pemilihan.

**Detail kendaraan**

- Informasi dasar; detail sensitif chassis/BPKB hanya role armada.
- Status saat ini, penggunaan terakhir/aktif, histori pemakaian, pembelian BBM, pajak terkait.
- CTA edit hanya ADMIN.

**Tambah/edit mobil (ADMIN)**

- Nama, plat nomor, nomor rangka, nama pemilik BPKB, barcode; status diubah terpisah dengan validasi kendaraan tidak sedang dipakai.
- Duplikasi plat/barcode/rangka ditampilkan sebagai kesalahan field.

**Ringkasan/laporan armada (ADMIN)**

- Filter tanggal/periode dan kendaraan.
- Statistik pemakaian, durasi, kendaraan aktif, ekspor jika memang disediakan web; mobile minimum menampilkan agregat dan daftar.

### 4.4 Pemakaian kendaraan

**List/panel pemakaian**

- Tab Aktif dan Riwayat; filter kendaraan/pengguna/tanggal untuk role yang boleh.
- Kartu menampilkan kendaraan, pengguna (hanya bila berhak), tujuan/purpose, waktu mulai, estimasi, waktu berakhir dan status.
- DRIVER hanya data milik sendiri.

**Mulai pemakaian**

1. Pilih kendaraan AVAILABLE; search nama/plat.
2. Isi tujuan penggunaan dan tempat tujuan.
3. Isi estimasi + satuan menit/jam/hari; UI mengonversi ke menit.
4. Tanggal/waktu mulai default waktu sekarang; konfirmasi ringkasan.
5. Submit: jika kendaraan baru dipakai orang lain tampilkan conflict dan refresh daftar; sukses tampilkan kartu status aktif dan timer.

**Akhiri pemakaian**

1. CTA dari kartu aktif.
2. Tampilkan kendaraan, waktu, durasi; konfirmasi akhiri.
3. Sukses menutup aktivitas, mobil kembali AVAILABLE dan riwayat diperbarui.
4. Non-owner tidak melihat CTA; ADMIN dapat menyelesaikan record sesuai policy.

### 4.5 Keuangan

**Finance overview (ADMIN)**

- Saldo, income/expense periode, filter bulan/tahun Gregorian dan Hijriah bila didukung, transaksi terbaru, tautan report.
- USER hanya menu input/list yang diizinkan; beranda/menu tidak memuat ringkasan sensitif.

**Daftar transaksi**

- Tab pemasukan/pengeluaran; filter tanggal, sumber/deskripsi, pencarian, pagination.
- Item nominal, tanggal, deskripsi, creator; detail item expense.

**Tambah/edit income (ADMIN/USER)**

- Jumlah Rupiah, sumber, tanggal, catatan; review lalu simpan.

**Tambah/edit expense (ADMIN/USER)**

- Tanggal, deskripsi, item belanja berulang (deskripsi, jumlah, harga/unit, kendaraan opsional), catatan dan bukti nota.
- Total dihitung otomatis; validasi item; unggah/pratinjau nota; ringkasan sebelum simpan.
- Edit/hapus meminta konfirmasi karena dapat mengubah saldo ledger.

**Report finance (ADMIN)**

- Pilih kalender (Gregorian/Hijriah) dan periode; ringkasan, tren harian, rincian income/expense dan transaksi.
- Empty state untuk periode tanpa data.

### 4.6 BBM

**Fuel overview**

- ADMIN melihat saldo, pemasukan/pembelian, periode, report. USER melihat aktivitas dan form input yang diizinkan. DRIVER hanya jika capability.
- Filter kalender Gregorian/Hijriah jika relevan pada layar saat ini.

**Pembelian BBM**

1. Pilih mobil.
2. Masukkan nominal total dan tanggal.
3. Tambah catatan opsional.
4. Ambil/pilih foto nota wajib, preview, ganti/hapus sebelum submit.
5. Tinjau dan konfirmasi; sukses menampilkan transaksi, nominal, mobil, foto nota.
6. Tanggal di luar periode yang diizinkan menampilkan pesan dari server.

**Pemasukan BBM (ADMIN/USER)**

- Jumlah, sumber, tanggal, catatan; edit/hapus melalui konfirmasi.

**Riwayat dan report**

- Filter transaksi income/purchase, mobil, tanggal.
- Detail transaksi menampilkan ledger balance hanya untuk role berhak; report bulanan total income, purchase, saldo, agregasi per hari/mobil.

### 4.7 Pajak (ADMIN)

**Daftar pajak**

- Tab Belum dibayar/Sudah dibayar, filter mobil, due date; urut jatuh tempo.
- Badge terlambat/segera/jauh; kartu pajak menampilkan mobil, tipe ANNUAL/FIVE_YEAR, due date dan status.

**Detail pajak**

- Informasi pajak/mobil/catatan, riwayat pembayaran, tombol bayar, edit/hapus sesuai status.

**Tambah/edit pajak**

- Mobil, tipe pajak, due date, catatan; opsi generate cycle bila tersedia dan preview jumlah record yang dibuat.

**Bayar pajak**

- Jumlah, tanggal pembayaran, catatan, opsional tanggal jatuh tempo berikutnya; konfirmasi; sukses menampilkan payment dan state lunas.

### 4.8 Pengajuan dana

**Daftar pengajuan**

- Filter status `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`; kartu tanggal, jumlah item/estimasi, status.
- Tap membuka detail dan semua item.

**Buat pengajuan**

- Catatan opsional, satu atau lebih item: persyaratan, estimasi biaya, kendaraan, gambar pendukung.
- Simpan sebagai pending; halaman konfirmasi/detail.

**Detail dan keputusan**

- Tampilkan semua item, kendaraan, estimasi, gambar dan catatan.
- ADMIN: setujui atau tolak dengan alasan; transisi status terlihat di timeline. Penyelesaian hanya jika tersedia alur UI yang sah.
- USER pemohon dapat melihat status, tidak melihat kontrol approval.

### 4.9 Perizinan kendaraan

**Daftar**

- Filter pending/approved/rejected, tanggal, kendaraan; kartu nama pemohon, tujuan, tanggal, status.

**Buat izin**

- Mobil, nama pemohon, tujuan penggunaan, destinasi, deskripsi opsional, jumlah penumpang, tanggal/waktu, estimasi biaya.
- Konfirmasi, lalu status pending. Notifikasi WhatsApp (bila terkonfigurasi) tidak menghalangi sukses penyimpanan.

**Detail/approval**

- Semua data, mobil, status, aktivitas approval.
- ADMIN menyetujui/menolak dengan konfirmasi. Setelah approval tampilkan status notifikasi, tidak membocorkan token.

**Form/token publik**

- ADMIN membuat form link dengan expiry, menyalin/membagikan link dan mencabut token.
- Layar publik tanpa login: validasi link, pilih kendaraan, isi form, kirim; tampilkan kedaluwarsa/terpakai dan halaman sukses.
- Approval via link publik: ringkasan permintaan dan tombol setujui, konfirmasi, status selesai. Token tidak pernah ditampilkan di list umum atau log mock yang dibagikan.

### 4.10 Spending dan wallet

**Daftar task**

- Filter status `DRAFT`, `FUNDED`, `SPENDING`, `NEEDS_REFUND`, `NEEDS_REIMBURSE`, `SETTLED`.
- Kartu judul, creator, anggaran, total receipt, selisih, status settlement.

**Buat/edit task**

- Judul dan deskripsi; edit terkunci setelah settlement selesai.

**Detail task**

- Ringkasan budget, total bukti, diff, refund due, reimburse due, lock state.
- Tab pendanaan, receipt, cashback, settlement.

**Funding**

- Input jumlah, tanggal diterima, sumber, catatan; edit funding jika diizinkan.

**Receipt**

- Vendor, nomor receipt, tanggal, catatan, total, item (deskripsi/qty/harga), attachment.
- Detail receipt menampilkan item, attachment dan cashback. Hapus hanya jika task tidak terkunci.

**Cashback**

- Dari receipt: jumlah, vendor, catatan, tanggal; sukses membuat wallet credit dan memperbarui summary.

**Settlement**

- Refund/reimburse due dihitung server. Aksi menandai selesai dengan catatan; confirmation modal menampilkan nominal dan dampak status. Task terkunci sesudah settlement selesai.

**Wallet**

- Saldo, list credit/debit, sumber cashback/manual, tanggal, attachment, task terkait.
- Input manual: tipe credit/debit, jumlah, deskripsi, waktu, attachment.

**Laporan spending**

- Periode bulan/tahun; total anggaran, receipt, cashback, refund/reimburse, rincian task.

### 4.11 Program Kerja

Fitur ini bergantung layanan eksternal dan membagi jadwal, sesi, laporan, foto serta dokumen.

- **Hari ini:** jadwal berdasarkan divisi/tanggal, status dan aksi mulai/buka.
- **Jadwal:** daftar tanggal/periode/divisi, detail jadwal.
- **Mulai sesi:** buat sesi dari jadwal; tampilkan status aktif.
- **Sesi:** lihat detail, unggah/hapus foto dan dokumen, isi status selesai atau selesai dengan kendala + catatan.
- **Laporan:** pilih jadwal, status `COMPLETED|COMPLETED_WITH_ISSUE|NOT_EXECUTED`, catatan, evidence foto/dokumen, kirim; lihat report per divisi.
- Tampilkan offline/error upstream dengan retry; jangan menganggap submit berhasil sebelum adapter mengonfirmasi.
- Divisi harus mengikuti assignment user; pengguna tidak memilih ID divisi sembarang.

### 4.12 Notifikasi, pencarian dan pengaturan

- Notifikasi lokal/in-app untuk pengingat penggunaan aktif yang melewati estimasi, pajak mendekati jatuh tempo, keputusan pengajuan/perizinan, dan kegagalan sinkronisasi—hanya jika backend mendukung event/push.
- Pengaturan: logout, profil, preferensi tampilan dan bantuan. Mode gelap/tema opsional sesuai web.
- Pencarian lintas fitur bukan syarat fase awal; setiap daftar tetap memiliki search/filter kontekstual.

## 5. Alur end-to-end utama

### A. Login dan role-aware bootstrap

1. User login.
2. Aplikasi mengambil profil, role, dan daftar capability.
3. Beranda/menu dibentuk berdasar capability, bukan daftar statis.
4. Token invalid membawa ke login; refresh gagal menghapus sesi lokal.
5. Mock dapat memilih ADMIN/USER/DRIVER dan menjalankan alur yang sama.

### B. Driver memakai kendaraan

1. Buka Beranda/Pemakaian; lihat usage aktif dan mobil tersedia.
2. Mulai → validasi field → konfirmasi → request.
3. Conflict ketersediaan → state tidak berubah, refresh car list dan pilih ulang.
4. Sukses → aktif card + countdown berdasarkan `startTime + estimatedDurationMinutes`.
5. Akhiri → konfirmasi → usage completed, mobil available, riwayat diperbarui.

### C. Catat transaksi dengan gambar

1. Buka form transaksi sesuai capability.
2. Isi fields dan pilih/ambil foto.
3. Preview dan validasi; jika gagal upload, pertahankan draft.
4. Kirim sekali dengan idempotency; loading mencegah double tap.
5. Sukses → detail transaksi/receipt; retry setelah timeout tidak menggandakan data.

### D. Approval

1. ADMIN melihat badge pending pada home/list.
2. Buka detail, review data/evidence.
3. Approve/reject, isi alasan bila diperlukan, konfirmasi.
4. Status berubah dan pengguna pemohon dapat melihat hasil.

### E. Spending reconciliation

1. Buat task dan catat funding.
2. Tambah beberapa receipt beserta item/evidence.
3. Summary menghitung budget, total receipt, refund/reimburse.
4. Tambahkan cashback bila ada; wallet credit bertambah.
5. Selesaikan refund/reimburse; task menjadi locked/settled.

### F. Simulasi Program Kerja

1. Pilih jadwal hari ini.
2. Mulai sesi.
3. Tambah evidence foto/dokumen.
4. Kirim status lengkap/bermasalah atau report tidak terlaksana.
5. UI beralih ke submitted state; simulasi offline/error/retry.

## 6. Aturan umum layar

### State standar

Setiap layar data harus menyediakan:

- Loading awal dan refresh.
- Empty state dengan CTA sesuai role.
- Error state berisi pesan ramah, aksi coba lagi, dan detail error hanya di mode developer.
- Success feedback non-blocking dan navigasi ke detail yang relevan.
- Offline state: data cache tetap terlihat bila aman; mutasi berisiko tidak masuk antrean diam-diam.
- Pagination/infinite scroll untuk list besar.

### Form

- Validasi inline dan ringkasan error jika submit gagal.
- Pertahankan nilai input saat error jaringan.
- Tampilkan konfirmasi hanya untuk aksi destruktif/berdampak ledger/approval.
- Tombol submit dinonaktifkan selama request.
- Tampilkan perbedaan waktu setempat vs tanggal yang dipilih bila transaksi bisa lintas timezone.

### Permission

- Capability yang hilang menghilangkan entry navigasi dan CTA.
- Deep link ke layar terlarang menampilkan halaman akses terbatas, bukan data parsial.
- `403` setelah request memperbarui capability/session dan memberi pesan; tidak menampilkan data sensitif dari cache role lain.
- Saat mock mengganti persona, bersihkan cache data yang tidak berhak dilihat persona baru.

## 7. Spesifikasi mock dan demo

### Tujuan mock

Mock harus membolehkan tim desain, mobile dan backend menguji seluruh layar/alur sebelum API siap. Mock bukan kumpulan response statis saja; harus menyimulasikan state transitions, validation, permissions, loading, error, upload, retry, dan konflik.

### Mock mode dan kontrol

- Pilihan mode di konfigurasi dev: **Mock** atau **API**. Default developer build adalah Mock sampai endpoint tersedia.
- Panel Dev Tools tersembunyi pada build produksi: persona/role, skenario, reset data, percepat waktu, toggle offline, atur latency, inject error, lihat event log.
- Per-role seed user: `admin.demo`, `user.demo`, `driver.demo` (kredensial dummy yang dijelaskan di app demo; tidak terkait akun produksi).
- Seed data disimpan terpisah dari fixture immutable; mutasi diterapkan ke working copy. `Reset scenario` mengembalikan data awal.
- Mock API memakai kontrak yang sama dengan `API_V1_CONTRACT.md`: path, query, envelope, HTTP status, error code dan bentuk resource. UI tidak boleh bergantung pada shortcut mock-only.

### Data seed minimum

- 3 user/persona masing-masing role; driver sendiri punya satu usage aktif dalam skenario tertentu.
- 6 mobil: tersedia, dipakai driver demo, dipakai user lain, maintenance, plat null bila data mengizinkan; contoh duplikasi untuk validasi.
- Usage ongoing dan completed, estimasi dalam menit/jam/hari.
- Finance: beberapa income/expense dengan items dan receipt, transaksi di lebih dari satu bulan.
- Fuel: purchase dengan nota, income, transaksi tanggal batas aturan.
- Tax: due segera, overdue, paid dengan payment history, annual dan five-year.
- Pengajuan: pending, approved, rejected, lengkap dengan multi-item dan gambar.
- Perizinan: pending/approved/rejected dan token form valid/expired/used.
- Spending: draft, funded, spending, needs refund, needs reimburse, settled; receipts multipel/itemized; cashback/wallet credit+debit; settlement pending/done.
- Program kerja: jadwal hari ini dan mendatang, sesi aktif, report sukses/bermasalah, evidence foto/dokumen.

### Perilaku mock yang wajib

- **Auth:** login sukses/gagal, akun disabled, token expired, refresh success/failure, logout.
- **Role:** ganti persona mengubah capability/menu; tes deep-link forbidden; data user lain tidak bocor ke driver.
- **Car:** daftar/filter; create/edit role admin; validasi unique; start usage mengubah status mobil; simulasi mobil sudah direbut request lain.
- **Usage:** start, timer, end; validasi field; ownership; ganda/retry idempotent; history terbarui.
- **Upload:** progress, preview, format/ukuran invalid, upload fail/retry, sukses dan file URL dummy.
- **Ledger:** create/edit/delete income/expense/fuel; jumlah dihitung; saldo berubah konsisten; retry idempotent.
- **Tax:** filter, due state, create cycle, payment menandai lunas dan menambah payment.
- **Pengajuan/perizinan:** create, approval/reject, alasan, status berubah; link publik token valid/expired/used.
- **Spending:** funding, receipt item sum, cashback menambah wallet credit, refund/reimburse, lock setelah settlement; invalid transition ditolak.
- **Program kerja:** jadwal, start session, upload/remove evidence, submit success/issue/not-executed, upstream error dan retry.
- **Resilience:** delay, timeout, 401, 403, 404, 409 conflict, 422/400 validation, 429, 500, offline; error tampil sesuai envelope.

### Skenario demo siap pakai

1. **Driver normal:** mulai kendaraan, lihat countdown, isi BBM bila capability on, akhiri dan cek mobil kembali tersedia.
2. **Race condition:** driver A dan user B memilih mobil sama; request kedua menerima conflict dan refresh state.
3. **Admin full suite:** lihat dashboard, tambah user/car/tax, bayar pajak, approval, lihat finance/fuel/spending report.
4. **User operations:** input income/expense/fuel, buat pengajuan dan perizinan, buat spending task dengan receipt/cashback.
5. **Permission audit:** driver mencoba link finance/users/tax; akses ditolak dan tidak ada data sensitif di cache.
6. **Upload gagal lalu retry:** foto bukti ditolak ukuran, user memilih ulang, upload berhasil, mutasi satu kali.
7. **Spending settled:** funding kurang/lebih dari receipt, cashback, refund/reimburse selesai dan task terkunci.
8. **Program kerja offline:** mulai dengan jadwal cached, submit gagal offline, retry setelah online, evidence tidak terduplikasi.

### Kriteria kesiapan mock

Mock dianggap siap ketika:

- Ketiga role dapat login/switch dan melihat navigasi yang tepat.
- Setiap layar yang disebut pada bagian 4 dapat dibuka menggunakan data seed.
- Seluruh alur utama bagian 5 dapat diselesaikan tanpa backend dan state konsisten setelah berpindah layar.
- Permission dan error dapat didemokan lewat skenario tanpa mengubah source.
- Bentuk mock response cocok dengan API contract; tidak ada komponen yang mengakses database/mock store secara langsung.
- Satu klik reset mengembalikan skenario awal dan menghapus mutasi.

## 8. Prioritas rilis aplikasi

### MVP operasional

Login/profil, beranda role-aware, armada ringkas, usage start/end, Program Kerja inti, upload dasar, mock lengkap untuk ADMIN/USER/DRIVER. Isi BBM driver mengikuti keputusan capability.

### Full feature parity

Tambah finance, fuel admin, pajak, pengajuan, perizinan, spending/wallet, user management, dashboard/report, seluruh filter/edit/approval dan link publik.

MVP tidak menghapus halaman/fitur dari spesifikasi; ia mengurutkan delivery. Mock harus mencakup Full feature parity sejak awal sehingga screen dan flow dapat dibangun/ditinjau paralel.

## 9. Keterkaitan dengan kontrak API

Kontrak payload, enum, status HTTP dan error berada di [API v1 contract](../api-v1/API_V1_CONTRACT.md). Rencana backend berada di [API v1 plan](../api-v1/API_V1_PLAN.md). Mock dan aplikasi harus menggunakan DTO/aturan dari kontrak itu. Perbedaan UI yang perlu diputuskan: permission isi BBM DRIVER, kebijakan spending USER, alur complete pengajuan, dan reject pada approval publik.
