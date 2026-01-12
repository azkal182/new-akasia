## App Summary — Fitur “Budgeted Spending Task + Settlement + Global Wallet”

Fitur ini menambahkan modul **pendataan pembelanjaan berbasis budgeting** yang **terpisah dari sistem transaksi/ledger yang sudah ada**. Modul ini dipakai saat pengguna diberi tugas pembelanjaan (material/operasional/dll), menerima dana dari yayasan, melakukan belanja dengan bukti nota, dan menyelesaikan selisih antara dana yang diterima dan total nota (refund sisa atau reimbursement kekurangan). Selain itu terdapat **Global Wallet** untuk mencatat saldo internal yang berasal dari **cashback (uang balik dari toko)** dan transaksi wallet manual lainnya—tanpa memengaruhi data pembelanjaan utama.

---

# 1) Tujuan & Prinsip

### Tujuan utama

1. Mendokumentasikan **tugas pembelanjaan** yang memiliki **1 pencairan dana**.
2. Mencatat **realisasi belanja berdasarkan nota** (nilai dan bukti upload).
3. Mengelola **selisih** (sisa atau kekurangan) dengan status yang jelas sampai selesai.
4. Mencatat **cashback** ke **Global Wallet** (saldo sistem) tanpa mengubah nilai nota.

### Prinsip yang tidak boleh dilanggar

* **Nilai pembelanjaan utama selalu sesuai nota.**
  Cashback tidak boleh mengurangi angka nota.
* **Sisa dana (budget - total nota) wajib dikembalikan** ke yayasan.
* **Kekurangan dana (total nota - budget) dianggap talangan pribadi** dan harus ada pencatatan penggantian dari yayasan.
* **Global Wallet terpisah penuh** dan **tidak boleh dipakai untuk menutup kekurangan** task.
* Modul ini **tidak terhubung** ke tabel `Transaction/Income/Expense/FuelPurchase` yang sudah ada.

---

# 2) Konsep Entitas (level domain)

### A. Spending Task (Task Pembelanjaan)

Objek utama yang mewakili 1 pekerjaan belanja.

* punya 1 funding (pencairan)
* punya banyak expense receipts (nota belanja)
* punya settlement (refund atau reimburse) bila ada selisih

### B. Funding (Pencairan Dana)

Dana yang diterima untuk task.

* jumlah dana (budget)
* tanggal penerimaan
* sumber (default: yayasan)

### C. Receipts/Expenses (Nota)

Realisasi pembelanjaan.

* nominal sesuai nota
* kategori/deskripsi
* file nota (upload)

### D. Settlement (Penyelesaian Selisih)

Pencatatan status penyelesaian selisih:

* refund (sisa) → “harus dikembalikan” sampai “sudah dikembalikan”
* reimburse (kekurangan) → “harus diganti yayasan” sampai “sudah diganti”

### E. Global Wallet

Saldo internal sistem untuk mencatat:

* cashback (uang balik dari toko)
* pemasukan/pengeluaran wallet manual (pencatatan terpisah)

---

# 3) Status & State Machine

## Status Task (disarankan)

1. **DRAFT**
   Task dibuat, belum ada pencairan.
2. **FUNDED**
   Pencairan dana tercatat (budget sudah ada).
3. **SPENDING**
   Sudah ada minimal 1 nota masuk.
4. **NEEDS_REFUND**
   Ada sisa dana berdasarkan perhitungan (wajib refund).
5. **NEEDS_REIMBURSE**
   Ada kekurangan dana berdasarkan perhitungan (perlu penggantian yayasan).
6. **SETTLED**
   Semua settlement selesai (refund/reimburse tuntas).
7. **CLOSED** (opsional)
   Dikunci/dinyatakan selesai secara administratif.

> Catatan: DRAFT → FUNDED itu wajib. SPENDING bisa terjadi setelah FUNDED.

---

# 4) Perhitungan Otomatis (Aturan Sistem)

Untuk setiap Task:

* **Budget** = jumlah pencairan dana (1x)
* **Total Nota** = total semua nominal receipt yang diinput (sesuai nota)
* **Selisih** = Budget - Total Nota

Interpretasi:

* Jika **Selisih > 0** → ada **SISA** → status task menjadi **NEEDS_REFUND** sebesar Selisih
* Jika **Selisih < 0** → ada **KEKURANGAN** → status task menjadi **NEEDS_REIMBURSE** sebesar |Selisih|
* Jika **Selisih = 0** → settlement tidak diperlukan → task dapat menjadi **SETTLED**

Cashback:

* Cashback **tidak ikut** ke perhitungan `Total Nota`.
* Cashback menghasilkan **WalletEntry CREDIT** (menambah saldo wallet).
* Cashback boleh direlasikan ke task hanya untuk jejak (opsional), tetapi tidak memengaruhi settlement.

---

# 5) Flow Utama (User Journey)

## Flow 1 — Normal: Belanja sesuai budget, ada sisa → refund

1. User membuat Task (DRAFT): “Pembelian pasir”.
2. User input Funding: menerima 1.000.000 → Task menjadi FUNDED.
3. User belanja:

   * input receipt pasir 800.000 + upload nota
   * input receipt BBM 150.000 + upload nota
     Total Nota = 950.000
4. Sistem menghitung Selisih = 1.000.000 - 950.000 = 50.000 → Task menjadi NEEDS_REFUND.
5. User mengembalikan 50.000 ke yayasan.
6. User menandai Refund “DONE” → Task menjadi SETTLED (atau CLOSED).

## Flow 2 — Normal: Belanja pas, tidak ada sisa/kekurangan

1. Task dibuat → Funding 1.000.000.
2. Receipts total 1.000.000.
3. Selisih = 0 → Task langsung SETTLED.

## Flow 3 — Kekurangan: Talangan pribadi → reimburse dari yayasan

1. Funding 1.000.000.
2. Receipts total 1.200.000 (mis. ada kebutuhan tambahan).
3. Selisih = -200.000 → Task menjadi NEEDS_REIMBURSE.
4. Kondisi riil: user menalangi 200.000 dari uang pribadi (implisit, karena dana yayasan kurang).
5. Saat yayasan mengganti 200.000 ke user:

   * user menandai Reimburse “DONE”
6. Task menjadi SETTLED.

## Flow 4 — Cashback: Uang balik toko → masuk Global Wallet (tidak memengaruhi nota)

1. Funding 1.000.000.
2. User belanja pasir, nota 800.000 (input receipt 800.000).
3. Toko memberi cashback tunai 50.000 (tidak tertulis di nota).
4. User input “Cashback 50.000” → masuk **Global Wallet** sebagai CREDIT.
5. Sistem pembelanjaan utama tetap menghitung Selisih berdasarkan nota:

   * Jika hanya ada nota 800.000, Selisih budget vs nota = 200.000 → itu **tetap sisa dan wajib refund 200.000**.
6. Wallet tidak mengurangi kewajiban refund.

---

# 6) Kasus-Kasus (Case Catalog) yang Harus Didukung

## A. Task & Funding

* Task dibuat tanpa funding (DRAFT).
* Funding hanya boleh **sekali per task**.
* Task boleh dibuat oleh siapa saja.
* Semua user boleh input funding, nota, cashback, dan mark settlement (sesuai requirement saat ini).

## B. Nota (Receipts)

* Satu task bisa punya banyak nota.
* Setiap nota wajib punya:

  * jumlah (sesuai nota)
  * bukti upload (receiptUrl)
  * deskripsi/kategori (minimal deskripsi)
* Nota bisa mencakup pembelanjaan yang awalnya tidak direncanakan (mis. BBM tambahan) dan tetap masuk ke task yang sama.

## C. Refund (Sisa dana)

* Jika `Budget > Total Nota` maka refund wajib.
* Sistem menampilkan indikator jelas:

  * “Sisa: Rp X — Wajib dikembalikan”
* User bisa menandai “Sudah dikembalikan” dengan timestamp dan catatan (opsional).
* Setelah refund done, status task berubah menjadi SETTLED (jika tidak ada reimburse).

## D. Reimburse (Kekurangan)

* Jika `Total Nota > Budget` maka reimburse wajib.
* Sistem menampilkan indikator jelas:

  * “Kekurangan: Rp X — Menunggu penggantian”
* User menandai “Sudah diganti yayasan” dengan timestamp dan catatan.
* Setelah reimburse done, status task menjadi SETTLED (jika tidak ada refund).

## E. Cashback ke Wallet

* Cashback adalah event terpisah:

  * nominal
  * deskripsi (toko/trigger)
  * bukti (opsional, jika ingin)
* Cashback menambah saldo Global Wallet.
* Cashback tidak mengubah:

  * total nota
  * perhitungan refund/reimburse
  * status settlement

## F. Wallet Global (manual entries)

* Wallet dapat mencatat pemasukan/pengeluaran manual yang tidak terkait task.
* Wallet hanya untuk pencatatan internal; tidak menjadi sumber dana untuk task.

---

# 7) Tampilan Data yang Wajib Ada (Output/Indicator)

## Pada List Task

* Nama task / tujuan
* Budget (funding)
* Total Nota
* Selisih (Sisa/Kurang)
* Status badge (DRAFT/FUNDED/SPENDING/NEEDS_REFUND/NEEDS_REIMBURSE/SETTLED)

## Pada Detail Task

* Informasi funding (jumlah, tanggal, sumber)
* List nota + preview link/attachment
* Ringkasan hitung:

  * Budget
  * Total Nota
  * Selisih (Sisa/Kurang)
* Panel settlement:

  * tombol mark refund done jika sisa > 0
  * tombol mark reimburse done jika kekurangan > 0
* Panel cashback:

  * daftar cashback entries yang terkait (opsional)
  * tombol tambah cashback (masuk wallet)

## Pada Halaman Wallet

* Saldo terkini
* Daftar `WalletEntry` (CREDIT/DEBIT)
* Form tambah entry manual

---

# 8) Aturan Validasi (minimal)

* Tidak boleh input receipt sebelum task punya funding?
  **Rekomendasi:** boleh dibatasi (lebih aman) → receipt hanya bisa dibuat setelah FUNDED.
* Receipt amount harus > 0 dan receiptUrl wajib.
* Cashback amount harus > 0.
* Tidak boleh mark refund done jika selisih tidak > 0.
* Tidak boleh mark reimburse done jika selisih tidak < 0.

---

# 9) Dampak ke Sistem Lama (nol)

* Tidak menambah row ke `Transaction`, `Expense`, `Income`, `FuelPurchase`.
* Tidak bergantung pada running balance.
* Tidak mengubah schema existing.
