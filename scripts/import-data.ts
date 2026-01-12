/**
 * Data Migration - Import Script
 *
 * This script imports data from the old database JSON export to the NEW database.
 * Run this in the NEW project directory (new-akasia).
 *
 * Usage: npx tsx scripts/import-data.ts <path-to-export.json>
 */

// import { prisma } from '../src/lib/prisma';
import { TransactionType, CarStatus, UsageStatus } from '../src/generated/prisma/client';
import * as fs from 'fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const connectionString = `postgresql://postgres@localhost:5432/akasia?schema=public`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

interface OldUser {
  id: string;
  name: string;
  username: string;
  password: string;
  ROLE: 'USER' | 'ADMIN' | 'DRIVER';
  createdAt: string;
  updatedAt: string;
  driving: boolean;
  active: boolean | null;
}

interface OldCar {
  id: string;
  name: string;
  licensePlate: string | null;
  status: 'AVAILABLE' | 'IN_USE';
  createdAt: string;
  updatedAt: string;
  barcodeString: string | null;
}

interface OldTransaction {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  userId: string;
  timeStamp: string | null;
}

interface OldIncome {
  id: string;
  date: string;
  amount: number;
  description: string;
  transactionId: string;
}

interface OldExpense {
  id: string;
  date: string;
  total: number;
  notaFilePath: string | null;
  transactionId: string;
}

interface OldItem {
  id: string;
  description: string;
  armada: string | null;
  quantity: number;
  total: number;
  expenseId: string;
}

interface OldUsageRecord {
  id: string;
  carId: string;
  purpose: string;
  destination: string;
  startTime: string;
  endTime: string | null;
  status: 'ONGOING' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  userId: string | null;
}

interface OldCashflow {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  description: string | null;
  userId: string;
}

interface OldCashIncome {
  id: string;
  source: string;
  notes: string | null;
  cashflowId: string;
}

interface OldFuelUsage {
  id: string;
  carId: string;
  fuelType: 'SOLAR' | 'BENSIN';
  receiptFile: string | null;
  notes: string | null;
  cashflowId: string;
}

interface OldPengajuan {
  id: string;
  date: string;
}

interface OldPengajuanItem {
  id: string;
  requirement: string;
  cardId: string; // Note: typo in old schema
  estimation: number;
  pengajuanId: string | null;
  imageUrl: string | null;
}

interface OldPerizinan {
  id: string;
  name: string;
  purpose: string;
  destination: string;
  description: string | null;
  numberOfPassengers: number;
  date: string;
  estimation: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  carId: string;
  createdAt: string;
  updatedAt: string;
}

interface OldTax {
  id: string;
  carId: string;
  type: 'ANNUAL' | 'FIVE_YEAR';
  dueDate: string;
  isPaid: boolean;
  paidAt: string | null;
  notes: string | null;
}

interface OldTaxPayment {
  id: string;
  taxId: string;
  paidAt: string;
  notes: string | null;
}

interface ExportedData {
  users: OldUser[];
  cars: OldCar[];
  transactions: OldTransaction[];
  incomes: OldIncome[];
  expenses: OldExpense[];
  items: OldItem[];
  usageRecords: OldUsageRecord[];
  cashflows: OldCashflow[];
  cashIncomes: OldCashIncome[];
  fuelUsages: OldFuelUsage[];
  pengajuans: OldPengajuan[];
  pengajuanItems: OldPengajuanItem[];
  perizinans: OldPerizinan[];
  taxes: OldTax[];
  taxPayments: OldTaxPayment[];
  exportedAt: string;
  version: string;
}

async function importData(filepath: string) {
  console.log('🔄 Starting data import to new database...\n');

  // Read export file
  const rawData = fs.readFileSync(filepath, 'utf-8');
  const data: ExportedData = JSON.parse(rawData);

  console.log(`📁 Loading export from: ${filepath}`);
  console.log(`📅 Export date: ${data.exportedAt}`);
  console.log(`📊 Version: ${data.version}\n`);

  try {
    // ========================================
    // 1. Import Users
    // ========================================
    console.log('📦 Importing users...');
    for (const oldUser of data.users) {
      await prisma.user.upsert({
        where: { id: oldUser.id },
        update: {},
        create: {
          id: oldUser.id,
          name: oldUser.name,
          username: oldUser.username,
          password: oldUser.password,
          role: oldUser.ROLE, // ROLE -> role
          isActive: oldUser.active ?? true,
          createdAt: new Date(oldUser.createdAt),
          updatedAt: new Date(oldUser.updatedAt),
        },
      });
    }
    console.log(`   ✅ ${data.users.length} users imported`);

    // ========================================
    // 2. Import Cars
    // ========================================
    console.log('📦 Importing cars...');
    for (const oldCar of data.cars) {
      await prisma.car.upsert({
        where: { id: oldCar.id },
        update: {},
        create: {
          id: oldCar.id,
          name: oldCar.name,
          licensePlate: oldCar.licensePlate,
          barcodeString: oldCar.barcodeString,
          status: oldCar.status as CarStatus,
          createdAt: new Date(oldCar.createdAt),
          updatedAt: new Date(oldCar.updatedAt),
        },
      });
    }
    console.log(`   ✅ ${data.cars.length} cars imported`);

    // ========================================
    // 3. Import Transactions with Income/Expense
    // ========================================
    console.log('📦 Importing transactions...');

    // Create lookup maps
    const incomeByTrxId = new Map(data.incomes.map((i) => [i.transactionId, i]));
    const expenseByTrxId = new Map(data.expenses.map((e) => [e.transactionId, e]));
    const itemsByExpenseId = new Map<string, OldItem[]>();
    for (const item of data.items) {
      if (!itemsByExpenseId.has(item.expenseId)) {
        itemsByExpenseId.set(item.expenseId, []);
      }
      itemsByExpenseId.get(item.expenseId)!.push(item);
    }

    // Find car by name (for expense items armada field)
    const carsByName = new Map(data.cars.map((c) => [c.name, c]));

    let trxCount = 0;
    for (const oldTrx of data.transactions) {
      const income = incomeByTrxId.get(oldTrx.id);
      const expense = expenseByTrxId.get(oldTrx.id);

      let type: TransactionType;
      if (income) {
        type = TransactionType.INCOME;
      } else if (expense) {
        type = TransactionType.EXPENSE;
      } else {
        // Skip transactions without income or expense
        continue;
      }

      const amount = income?.amount ?? expense?.total ?? 0;
      const balanceBefore = oldTrx.balance - (income ? amount : -amount);

      await prisma.transaction.upsert({
        where: { id: oldTrx.id },
        update: {},
        create: {
          id: oldTrx.id,
          type,
          amount,
          description: oldTrx.description,
          date: new Date(oldTrx.date),
          balanceBefore: balanceBefore,
          balanceAfter: oldTrx.balance,
          userId: oldTrx.userId,
          createdAt: new Date(oldTrx.timeStamp ?? oldTrx.date),
          updatedAt: new Date(oldTrx.timeStamp ?? oldTrx.date),
          ...(income && {
            income: {
              create: {
                id: income.id,
                source: 'Yayasan', // Default source
                notes: income.description,
              },
            },
          }),
          ...(expense && {
            expense: {
              create: {
                id: expense.id,
                receiptUrl: expense.notaFilePath,
                items: {
                  create: (itemsByExpenseId.get(expense.id) ?? []).map((item) => {
                    const car = item.armada ? carsByName.get(item.armada) : null;
                    return {
                      id: item.id,
                      description: item.description,
                      quantity: item.quantity,
                      unitPrice: Math.round(item.total / item.quantity),
                      total: item.total,
                      carId: car?.id,
                    };
                  }),
                },
              },
            },
          }),
        },
      });
      trxCount++;
    }
    console.log(`   ✅ ${trxCount} transactions imported`);

    // ========================================
    // 4. Import Cashflows as Transactions (Fuel purchases)
    // ========================================
    console.log('📦 Importing fuel purchases from cashflows...');

    // Create lookup maps
    const cashIncomeById = new Map(data.cashIncomes.map((c) => [c.cashflowId, c]));
    const fuelUsageById = new Map(data.fuelUsages.map((f) => [f.cashflowId, f]));

    let fuelCount = 0;
    for (const cashflow of data.cashflows) {
      const fuelUsage = fuelUsageById.get(cashflow.id);
      const cashIncome = cashIncomeById.get(cashflow.id);

      if (fuelUsage) {
        // This is a fuel purchase
        await prisma.transaction.create({
          data: {
            type: TransactionType.FUEL_PURCHASE,
            amount: cashflow.amount,
            description: cashflow.description ?? `Isi BBM ${fuelUsage.fuelType}`,
            date: new Date(cashflow.date),
            balanceBefore: 0, // Will be recalculated
            balanceAfter: 0, // Will be recalculated
            userId: cashflow.userId,
            createdAt: new Date(cashflow.date),
            updatedAt: new Date(cashflow.date),
            fuelPurchase: {
              create: {
                fuelType: fuelUsage.fuelType,
                carId: fuelUsage.carId,
                receiptUrl: fuelUsage.receiptFile,
                notes: fuelUsage.notes,
                literAmount: 0, // Not available in old data
                pricePerLiter: 0, // Not available in old data
                totalAmount: cashflow.amount, // Total amount from cashflow
              },
            },
          },
        });
        fuelCount++;
      } else if (cashIncome && cashflow.type === 'INCOME') {
        // This is a cash income - already handled in transactions
        // Skip to avoid duplicates
      }
    }
    console.log(`   ✅ ${fuelCount} fuel purchases imported`);

    // ========================================
    // 5. Import Usage Records
    // ========================================
    console.log('📦 Importing usage records...');
    for (const record of data.usageRecords) {
      if (!record.userId) continue; // Skip records without user

      await prisma.usageRecord.upsert({
        where: { id: record.id },
        update: {},
        create: {
          id: record.id,
          carId: record.carId,
          userId: record.userId,
          purpose: record.purpose,
          destination: record.destination,
          startTime: new Date(record.startTime),
          endTime: record.endTime ? new Date(record.endTime) : null,
          status: record.status as UsageStatus,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        },
      });
    }
    console.log(`   ✅ ${data.usageRecords.length} usage records imported`);

    // ========================================
    // 6. Import Pengajuans
    // ========================================
    console.log('📦 Importing pengajuans...');
    for (const pengajuan of data.pengajuans) {
      const items = data.pengajuanItems.filter((i) => i.pengajuanId === pengajuan.id);

      await prisma.pengajuan.upsert({
        where: { id: pengajuan.id },
        update: {},
        create: {
          id: pengajuan.id,
          date: new Date(pengajuan.date),
          status: 'PENDING',
          createdAt: new Date(pengajuan.date),
          updatedAt: new Date(pengajuan.date),
          items: {
            create: items.map((item) => ({
              id: item.id,
              requirement: item.requirement,
              carId: item.cardId, // Note: typo fix cardId -> carId
              estimation: item.estimation,
              imageUrl: item.imageUrl,
            })),
          },
        },
      });
    }
    console.log(`   ✅ ${data.pengajuans.length} pengajuans imported`);

    // ========================================
    // 7. Import Perizinans
    // ========================================
    console.log('📦 Importing perizinans...');
    for (const perizinan of data.perizinans) {
      await prisma.perizinan.upsert({
        where: { id: perizinan.id },
        update: {},
        create: {
          id: perizinan.id,
          name: perizinan.name,
          purpose: perizinan.purpose,
          destination: perizinan.destination,
          description: perizinan.description,
          numberOfPassengers: perizinan.numberOfPassengers,
          date: new Date(perizinan.date),
          estimation: perizinan.estimation,
          status: perizinan.status,
          carId: perizinan.carId,
          createdAt: new Date(perizinan.createdAt),
          updatedAt: new Date(perizinan.updatedAt),
        },
      });
    }
    console.log(`   ✅ ${data.perizinans.length} perizinans imported`);

    // ========================================
    // 8. Import Taxes
    // ========================================
    console.log('📦 Importing taxes...');
    for (const tax of data.taxes) {
      const payments = data.taxPayments.filter((p) => p.taxId === tax.id);

      await prisma.tax.upsert({
        where: { id: tax.id },
        update: {},
        create: {
          id: tax.id,
          carId: tax.carId,
          type: tax.type,
          dueDate: new Date(tax.dueDate),
          isPaid: tax.isPaid,
          paidAt: tax.paidAt ? new Date(tax.paidAt) : null,
          notes: tax.notes,
          createdAt: new Date(tax.dueDate),
          updatedAt: new Date(tax.dueDate),
          payments: {
            create: payments.map((p) => ({
              id: p.id,
              amount: 0, // Not available in old data
              paidAt: new Date(p.paidAt),
              notes: p.notes,
            })),
          },
        },
      });
    }
    console.log(`   ✅ ${data.taxes.length} taxes imported`);

    // ========================================
    // 9. Recalculate Running Balances
    // ========================================
    console.log('\n🔄 Recalculating running balances...');
    await recalculateBalances();
    console.log('   ✅ Balances recalculated');

    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function recalculateBalances() {
  // Get all transactions ordered by date
  const transactions = await prisma.transaction.findMany({
    where: { deletedAt: null },
    orderBy: { date: 'asc' },
  });

  let balance = 0;
  for (const trx of transactions) {
    const balanceBefore = balance;
    if (trx.type === TransactionType.INCOME) {
      balance += trx.amount;
    } else {
      balance -= trx.amount;
    }

    await prisma.transaction.update({
      where: { id: trx.id },
      data: {
        balanceBefore,
        balanceAfter: balance,
      },
    });
  }
}

// Get filepath from command line
const filepath = process.argv[2];
if (!filepath) {
  console.error('Usage: npx tsx scripts/import-data.ts <path-to-export.json>');
  process.exit(1);
}

importData(filepath).catch(console.error);
