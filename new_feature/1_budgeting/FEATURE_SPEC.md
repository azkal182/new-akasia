Berikut **feature spec** lengkap untuk modul baru: **Budgeted Spending Tasks + Settlements + Global Wallet**, memakai **English naming**, **tanpa soft delete**, mendukung **multi-file receipt**, dan **1 receipt bisa punya banyak items**.

---

# 1) Feature Overview

## 1.1 Purpose

Modul ini dipakai untuk pendataan pembelanjaan berbasis budgeting (1 task = 1 funding) di mana:

* Dana diterima sekali (funding).
* Pembelanjaan dicatat berdasarkan **nota/receipt** (nominal sesuai nota + lampiran).
* 1 receipt dapat memiliki banyak item (itemized).
* Sistem menghitung otomatis **refund** (sisa dana) atau **reimburse** (kekurangan dana).
* **Cashback** dicatat ke **Global Wallet** sebagai saldo internal, tidak memengaruhi nota dan tidak memengaruhi kewajiban refund/reimburse.

## 1.2 Non-goals

* Tidak terhubung ke tabel `Transaction/Income/Expense/FuelPurchase`.
* Wallet tidak boleh dipakai untuk menutup kekurangan task.
* Tidak ada soft delete di modul ini.

---

# 2) Roles & Permissions

Saat ini requirement: **semua user bisa membuat task dan melakukan semua aksi** (create funding, add receipt, mark settlement, add cashback, wallet entries).
Jika nanti ingin diperketat, tinggal tambah policy.

---

# 3) Domain Model & State

## 3.1 Core Entities

* **SpendingTask**: pekerjaan pembelanjaan
* **TaskFunding**: pencairan dana (1x per task)
* **Receipt**: nota belanja (bisa lebih dari 1)
* **ReceiptAttachment**: file bukti nota (multi file)
* **ReceiptItem**: item per nota (multi)
* **TaskSettlement**: status penyelesaian selisih (refund / reimburse)
* **Wallet** (global)
* **WalletEntry**: mutasi wallet (cashback/manual debit/credit)
* **Cashback**: event cashback (terhubung task + menghasilkan wallet entry)

## 3.2 Task Status (state machine)

Enum `SpendingTaskStatus`:

* `DRAFT` – task dibuat, funding belum diisi
* `FUNDED` – funding sudah diisi
* `SPENDING` – ada receipt (atau receipt item) masuk
* `NEEDS_REFUND` – budget > total receipt
* `NEEDS_REIMBURSE` – total receipt > budget
* `SETTLED` – settlement selesai (refund done / reimburse done / no diff)

Aturan status dihitung dari kondisi data (recommended: “system-driven status”, bukan manual):

* Jika no funding → `DRAFT`
* Jika funding exists & no receipts → `FUNDED`
* Jika receipts exists:

  * diff = funding - totalReceipts
  * diff > 0 → `NEEDS_REFUND` (kecuali refund sudah DONE → `SETTLED`)
  * diff < 0 → `NEEDS_REIMBURSE` (kecuali reimburse sudah DONE → `SETTLED`)
  * diff = 0 → `SETTLED`

> `SPENDING` opsional (bisa hanya intermediate), tapi berguna untuk UI: “sudah ada pembelanjaan”.

---

# 4) Calculations & Invariants

Untuk setiap task:

* `budget = TaskFunding.amount`
* `totalReceipts = sum(Receipt.totalAmount)` (NOTA total, bukan item sum jika sudah disimpan)
* `diff = budget - totalReceipts`

  * `refundDue = max(diff, 0)`
  * `reimburseDue = max(-diff, 0)`

**Cashback**:

* Cashback **tidak mengubah** `totalReceipts`.
* Cashback selalu membuat `WalletEntry(type=CREDIT, source=CASHBACK)`.

---

# 5) Prisma Schema (module baru)

> Ini bisa ditaruh di schema Prisma yang sama (karena satu DB), tapi **terpisah dari transaksi lama**.

```prisma
enum SpendingTaskStatus {
  DRAFT
  FUNDED
  SPENDING
  NEEDS_REFUND
  NEEDS_REIMBURSE
  SETTLED
}

enum SettlementType {
  REFUND
  REIMBURSE
}

enum SettlementStatus {
  PENDING
  DONE
}

enum WalletEntryType {
  CREDIT
  DEBIT
}

enum WalletEntrySource {
  CASHBACK
  MANUAL
}

model SpendingTask {
  id          String             @id @default(uuid())
  title       String
  description String?
  status      SpendingTaskStatus @default(DRAFT)

  // assignee / creator
  createdById String
  createdBy   User   @relation(fields: [createdById], references: [id])

  funding     TaskFunding?
  receipts    Receipt[]
  settlements TaskSettlement[]
  cashbacks   Cashback[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
  @@index([createdAt])
  @@index([createdById])
}

model TaskFunding {
  id            String   @id @default(uuid())
  amount        Int
  receivedAt    DateTime @default(now())
  source        String   @default("Yayasan")
  notes         String?

  taskId        String   @unique
  task          SpendingTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([receivedAt])
}

model Receipt {
  id          String   @id @default(uuid())
  vendor      String?
  receiptNo   String?
  receiptDate DateTime?
  notes       String?

  // stored total from receipt
  totalAmount Int

  taskId      String
  task        SpendingTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  attachments ReceiptAttachment[]
  items       ReceiptItem[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([taskId])
  @@index([receiptDate])
}

model ReceiptAttachment {
  id        String @id @default(uuid())
  fileUrl   String
  fileName  String?
  mimeType  String?
  sizeBytes Int?

  receiptId String
  receipt   Receipt @relation(fields: [receiptId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([receiptId])
}

model ReceiptItem {
  id          String  @id @default(uuid())
  description String
  quantity    Int     @default(1)
  unitPrice   Int
  total       Int

  receiptId   String
  receipt     Receipt @relation(fields: [receiptId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([receiptId])
}

model TaskSettlement {
  id        String           @id @default(uuid())
  type      SettlementType
  amount    Int
  status    SettlementStatus @default(PENDING)
  doneAt    DateTime?
  notes     String?

  taskId    String
  task      SpendingTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([taskId, type])
  @@index([status])
}

model Wallet {
  id        String   @id @default(uuid())
  name      String   @default("Global Wallet")

  entries   WalletEntry[]

  createdAt DateTime @default(now())
}

model WalletEntry {
  id          String           @id @default(uuid())
  type        WalletEntryType
  source      WalletEntrySource
  amount      Int
  description String?
  occurredAt  DateTime         @default(now())

  attachmentUrl String?

  walletId    String
  wallet      Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  // Optional reference for traceability
  taskId      String?
  task        SpendingTask? @relation(fields: [taskId], references: [id])

  cashbackId  String? @unique
  cashback    Cashback? @relation(fields: [cashbackId], references: [id])

  createdById String
  createdBy   User @relation(fields: [createdById], references: [id])

  createdAt   DateTime @default(now())

  @@index([walletId, occurredAt])
  @@index([type])
  @@index([source])
}

model Cashback {
  id          String   @id @default(uuid())
  amount      Int
  vendor      String?
  notes       String?
  occurredAt  DateTime @default(now())

  taskId      String
  task        SpendingTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  walletEntry WalletEntry?

  createdById String
  createdBy   User @relation(fields: [createdById], references: [id])

  createdAt   DateTime @default(now())

  @@index([taskId])
  @@index([occurredAt])
}
```

### Catatan desain penting

* `TaskSettlement` dibuat per task per type (unique `[taskId, type]`), jadi maksimal 1 refund settlement dan 1 reimburse settlement.
* `Receipt.totalAmount` disimpan langsung supaya perhitungan cepat. Validasi: harus sama dengan sum(items.total) kalau itemized (lihat rules).
* Wallet global: table `Wallet` hanya 1 row (diinisialisasi via seed).

---

# 6) Business Rules (Validation)

## 6.1 Funding

* Task hanya boleh punya **1 funding**.
* Funding amount > 0.
* Setelah funding dibuat, status minimal `FUNDED`.

## 6.2 Receipt

* `totalAmount > 0`.
* Minimal 1 attachment (recommended), tapi bisa dibuat optional jika Anda ingin fleksibel.
* Jika receipt punya items:

  * `sum(items.total)` **harus sama** dengan `receipt.totalAmount` (strict)
    atau
  * jika ingin toleransi: `sum(items.total)` boleh, tapi receipt.totalAmount jadi “source of truth”. (Saya rekomendasikan strict agar rapih.)

## 6.3 Receipt Item

* quantity >= 1
* unitPrice >= 0
* total = quantity * unitPrice (auto-calc server)

## 6.4 Settlement

* Jika `refundDue > 0`, sistem harus memiliki `TaskSettlement(type=REFUND, amount=refundDue, status=PENDING)` (auto-upsert).
* Jika user mark refund DONE:

  * hanya valid bila `refundDue > 0`
  * set `doneAt=now`, `status=DONE`
* Jika kemudian receipts berubah dan refundDue berubah:

  * kalau settlement masih PENDING → amount diupdate
  * kalau settlement sudah DONE → **receipts tidak boleh diubah** (recommended lock), atau harus “re-open” (lebih kompleks).
    **Rekomendasi spec:** setelah settlement DONE, task **locked** dari perubahan receipts/funding.

Sama untuk reimburse.

## 6.5 Cashback & Wallet

* Cashback amount > 0.
* Membuat cashback harus otomatis membuat `WalletEntry(CREDIT, source=CASHBACK, amount=cashback.amount)`.
* Wallet entry manual:

  * `type=CREDIT|DEBIT`, `source=MANUAL`
  * amount > 0
* Wallet tidak pernah mempengaruhi settlement.

---

# 7) API Spec (Next.js App Router)

Base: `/api/spending`

## 7.1 Tasks

### Create task

* `POST /api/spending/tasks`
  Request:

```json
{ "title": "Buy sand", "description": "Project A" }
```

Response: task

### List tasks

* `GET /api/spending/tasks?status=NEEDS_REFUND&from=2026-01-01&to=2026-01-31&createdById=...`
  Response: paginated list (or simple list)

### Get task detail (includes aggregates)

* `GET /api/spending/tasks/:taskId`
  Response includes:
* task core
* funding
* receipts + attachments + items
* settlements
* cashbacks
* computed summary:

  * budget
  * totalReceipts
  * diff, refundDue, reimburseDue
  * isLocked

### Update task meta

* `PATCH /api/spending/tasks/:taskId`
  Request:

```json
{ "title": "...", "description": "..." }
```

## 7.2 Funding (1x)

### Create funding

* `POST /api/spending/tasks/:taskId/funding`
  Request:

```json
{ "amount": 1000000, "receivedAt": "2026-01-12T10:00:00.000Z", "source": "Yayasan", "notes": "Cash" }
```

Rules: reject if funding already exists.

### Update funding (optional)

* `PATCH /api/spending/tasks/:taskId/funding`
  Rules: reject if task locked.

## 7.3 Receipts

### Create receipt (with attachments + items)

* `POST /api/spending/tasks/:taskId/receipts`
  Request:

```json
{
  "vendor": "Toko Bangunan A",
  "receiptNo": "INV-123",
  "receiptDate": "2026-01-12T00:00:00.000Z",
  "notes": "",
  "attachments": [{ "fileUrl": "...", "fileName": "nota1.jpg", "mimeType": "image/jpeg", "sizeBytes": 12345 }],
  "items": [
    { "description": "Sand", "quantity": 1, "unitPrice": 800000 }
  ],
  "totalAmount": 800000
}
```

### Update receipt (optional)

* `PATCH /api/spending/receipts/:receiptId`
  Rules: reject if task locked.

### Delete receipt (optional)

* `DELETE /api/spending/receipts/:receiptId`
  Rules: reject if task locked.

### Add attachment

* `POST /api/spending/receipts/:receiptId/attachments`

### Remove attachment

* `DELETE /api/spending/attachments/:attachmentId`

### Items CRUD

* `POST /api/spending/receipts/:receiptId/items`
* `PATCH /api/spending/items/:itemId`
* `DELETE /api/spending/items/:itemId`
  Rules: after item change, server recalculates receipt.totalAmount (jika Anda ingin receipt.totalAmount derived dari items) atau memvalidasi (jika strict).

## 7.4 Settlement actions

### Mark refund done

* `POST /api/spending/tasks/:taskId/settlements/refund/done`
  Request:

```json
{ "notes": "Returned cash to foundation" }
```

### Mark reimburse done

* `POST /api/spending/tasks/:taskId/settlements/reimburse/done`
  Request:

```json
{ "notes": "Foundation reimbursed" }
```

> Setiap action ini harus menjalankan “recompute summary” dan memastikan due amount sesuai.

## 7.5 Cashback & Wallet

### Add cashback (creates WalletEntry)

* `POST /api/spending/tasks/:taskId/cashbacks`
  Request:

```json
{ "amount": 50000, "vendor": "Toko Bangunan A", "notes": "Promo cashback", "occurredAt": "2026-01-12T10:00:00.000Z" }
```

### Wallet overview

* `GET /api/spending/wallet`
  Response:
* wallet info
* current balance (computed)
* latest entries

### Wallet entries list

* `GET /api/spending/wallet/entries?from=...&to=...&type=CREDIT`

### Create manual wallet entry

* `POST /api/spending/wallet/entries`
  Request:

```json
{ "type": "DEBIT", "amount": 20000, "description": "Snacks", "occurredAt": "..." }
```

---

# 8) Server Logic: Recompute & Consistency

Buat satu util server (mis. `recomputeTask(taskId)`) yang dipanggil setelah:

* funding create/update
* receipt create/update/delete
* item changes
* settlement done

**Output recompute:**

* budget, totalReceipts, diff, refundDue, reimburseDue
* upsert settlement rows:

  * jika refundDue > 0 → upsert refund settlement (PENDING) amount=refundDue kecuali sudah DONE
  * jika refundDue == 0 → jika settlement refund masih PENDING bisa dihapus atau set amount 0 (pilih salah satu; rekomendasi: delete PENDING)
  * hal sama untuk reimburse
* set task.status sesuai state machine
* determine `locked = (refund settlement DONE) OR (reimburse settlement DONE) OR status=SETTLED` (pilih rule)

  * rekomendasi: lock jika salah satu DONE (menghindari mismatch)

---

# 9) Zod Schemas (validation layer)

Contoh schema inti (ringkas, Anda bisa expand):

```ts
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
});

export const createFundingSchema = z.object({
  amount: z.number().int().positive(),
  receivedAt: z.string().datetime().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const receiptItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().int().min(0),
});

export const receiptAttachmentSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().optional(),
});

export const createReceiptSchema = z.object({
  vendor: z.string().optional(),
  receiptNo: z.string().optional(),
  receiptDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  totalAmount: z.number().int().positive(),
  items: z.array(receiptItemSchema).min(1),
  attachments: z.array(receiptAttachmentSchema).min(1),
}).superRefine((val, ctx) => {
  const sum = val.items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  if (sum !== val.totalAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `totalAmount must equal sum(items). Expected ${sum}`,
      path: ["totalAmount"],
    });
  }
});

export const createCashbackSchema = z.object({
  amount: z.number().int().positive(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
});

export const createWalletEntrySchema = z.object({
  type: z.enum(["CREDIT", "DEBIT"]),
  amount: z.number().int().positive(),
  description: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  attachmentUrl: z.string().url().optional(),
});
```

---

# 10) Frontend Spec (Next.js + RHF + TanStack Query)

## 10.1 Routes (pages)

* `/spending/tasks`

  * list, filters, quick summary
* `/spending/tasks/new`

  * create task form
* `/spending/tasks/[taskId]`

  * detail + actions
* `/spending/wallet`

  * global wallet overview + entries

## 10.2 Query Keys (TanStack Query)

* `["spendingTasks", filters]`
* `["spendingTask", taskId]`
* `["wallet"]`
* `["walletEntries", filters]`

## 10.3 Mutations

* createTask
* createFunding / updateFunding
* createReceipt / updateReceipt / deleteReceipt
* addReceiptAttachment / removeReceiptAttachment
* CRUD receipt items
* markRefundDone / markReimburseDone
* addCashback
* createWalletEntry

Semua mutation sukses harus:

* invalidate `["spendingTask", taskId]`
* jika list page, invalidate `["spendingTasks"]`
* untuk wallet/cashback, invalidate `["wallet"]` dan `["walletEntries"]`

## 10.4 Forms (React Hook Form)

### Task form

* title, description

### Funding form

* amount, receivedAt, notes

### Receipt form (advanced)

* vendor, receiptNo, receiptDate
* attachments (multi file upload → menghasilkan array fileUrl)
* items dynamic field array:

  * description, quantity, unitPrice
* totalAmount auto-calc:

  * UI menghitung sum(items) dan mengisi readonly `totalAmount` (server tetap validasi)
* submit createReceipt

### Cashback form

* amount, vendor, notes, occurredAt

### Wallet manual entry form

* type (CREDIT/DEBIT)
* amount
* description
* optional attachmentUrl

---

# 11) UI Behavior & Indicators (yang wajib tampil)

## Task List row

* Title
* Status badge
* Budget, Total Receipts
* Refund due / Reimburse due (tampilkan salah satu)
* CreatedAt, CreatedBy

## Task Detail

**Header Summary Card**

* Budget
* Total Receipts
* Diff
* Refund Due (if > 0)
* Reimburse Due (if > 0)
* Status

**Funding Section**

* if no funding: show create funding form
* else show funding info (+ edit jika belum locked)

**Receipts Section**

* list receipts:

  * vendor, receiptDate, totalAmount
  * attachments (links)
  * item table (desc, qty, unit, total)
* add receipt button (disabled if locked)

**Settlement Section**

* if refundDue > 0:

  * show “Must refund: Rp X”
  * button “Mark Refund Done”
* if reimburseDue > 0:

  * show “Must reimburse: Rp X”
  * button “Mark Reimburse Done”
* if settled: show “Settled” + doneAt if any

**Cashback Section**

* list cashbacks
* add cashback form/button
* show “Cashback goes to Global Wallet”

## Wallet Page

* Balance
* entries table:

  * occurredAt, type, amount, source, description, createdBy
* create manual entry

---

# 12) Edge Cases (explicit)

1. **Receipt dibuat sebelum funding**

* Rekomendasi: blok (harus funding dulu). Kalau tidak diblok, status logic tetap jalan tapi bisa bikin UX kacau.

2. **Settlement DONE lalu receipt diubah**

* Rekomendasi: lock. Semua aksi perubahan funding/receipt/items ditolak dengan error `TASK_LOCKED`.

3. **RefundDue & ReimburseDue tidak mungkin > 0 bersamaan**

* Dengan diff tunggal, hanya salah satu yang aktif.

4. **Cashback ada tetapi tetap wajib refund jika budget > total receipts**

* Cashback tidak mengurangi kewajiban refund (sesuai requirement Anda).

5. **Multi attachments**

* Minimal 1, bisa lebih.

---

# 13) Error Contract (API)

Gunakan error code konsisten (JSON):

```json
{ "error": { "code": "TASK_LOCKED", "message": "Task is settled and locked." } }
```

Daftar code yang disarankan:

* `NOT_FOUND`
* `VALIDATION_ERROR`
* `FUNDING_ALREADY_EXISTS`
* `FUNDING_REQUIRED`
* `TASK_LOCKED`
* `SETTLEMENT_NOT_REQUIRED`
* `WALLET_NOT_INITIALIZED`

---

# 14) Initialization / Seed

* Buat 1 row `Wallet` saat deploy/migrate (seed).
* Endpoint wallet memastikan wallet ada; jika belum, create otomatis (opsional).
