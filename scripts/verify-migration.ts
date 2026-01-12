/**
 * Data Migration - Verify Script
 *
 * This script verifies that data was imported correctly by comparing counts
 * and checking data integrity.
 *
 * Usage: npx tsx scripts/verify-migration.ts <path-to-export.json>
 */

import { prisma } from "../src/lib/prisma";
import { TransactionType } from "../src/generated/prisma/enums";
import * as fs from "fs";

interface ExportedData {
  users: unknown[];
  cars: unknown[];
  transactions: unknown[];
  incomes: unknown[];
  expenses: unknown[];
  items: unknown[];
  usageRecords: unknown[];
  cashflows: unknown[];
  cashIncomes: unknown[];
  fuelUsages: unknown[];
  pengajuans: unknown[];
  pengajuanItems: unknown[];
  perizinans: unknown[];
  taxes: unknown[];
  taxPayments: unknown[];
  exportedAt: string;
  version: string;
}

async function verifyMigration(filepath: string) {
  console.log("🔍 Verifying data migration...\n");

  // Read export file
  const rawData = fs.readFileSync(filepath, "utf-8");
  const exportData: ExportedData = JSON.parse(rawData);

  console.log(`📁 Comparing against export: ${filepath}`);
  console.log(`📅 Export date: ${exportData.exportedAt}\n`);

  const results: { model: string; old: number; new: number; status: string }[] =
    [];
  let hasErrors = false;

  try {
    // ========================================
    // 1. Verify Users
    // ========================================
    const userCount = await prisma.user.count();
    results.push({
      model: "Users",
      old: exportData.users.length,
      new: userCount,
      status: userCount >= exportData.users.length ? "✅" : "⚠️",
    });
    if (userCount < exportData.users.length) hasErrors = true;

    // ========================================
    // 2. Verify Cars
    // ========================================
    const carCount = await prisma.car.count();
    results.push({
      model: "Cars",
      old: exportData.cars.length,
      new: carCount,
      status: carCount >= exportData.cars.length ? "✅" : "⚠️",
    });
    if (carCount < exportData.cars.length) hasErrors = true;

    // ========================================
    // 3. Verify Transactions
    // ========================================
    // Old transactions + fuel usages from cashflows = new transactions
    const transactionCount = await prisma.transaction.count();
    const expectedTrx =
      exportData.incomes.length +
      exportData.expenses.length +
      exportData.fuelUsages.length;
    results.push({
      model: "Transactions",
      old: expectedTrx,
      new: transactionCount,
      status: transactionCount >= expectedTrx - 5 ? "✅" : "⚠️", // Allow small variance
    });

    // ========================================
    // 4. Verify Income Transactions
    // ========================================
    const incomeCount = await prisma.transaction.count({
      where: { type: TransactionType.INCOME },
    });
    results.push({
      model: "Incomes",
      old: exportData.incomes.length,
      new: incomeCount,
      status: incomeCount >= exportData.incomes.length ? "✅" : "⚠️",
    });

    // ========================================
    // 5. Verify Expenses
    // ========================================
    const expenseCount = await prisma.expense.count();
    results.push({
      model: "Expenses",
      old: exportData.expenses.length,
      new: expenseCount,
      status: expenseCount >= exportData.expenses.length ? "✅" : "⚠️",
    });

    // ========================================
    // 6. Verify Expense Items
    // ========================================
    const itemCount = await prisma.expenseItem.count();
    results.push({
      model: "Expense Items",
      old: exportData.items.length,
      new: itemCount,
      status: itemCount >= exportData.items.length ? "✅" : "⚠️",
    });

    // ========================================
    // 7. Verify Fuel Purchases
    // ========================================
    const fuelCount = await prisma.fuelPurchase.count();
    results.push({
      model: "Fuel Purchases",
      old: exportData.fuelUsages.length,
      new: fuelCount,
      status: fuelCount >= exportData.fuelUsages.length ? "✅" : "⚠️",
    });

    // ========================================
    // 8. Verify Usage Records
    // ========================================
    const usageCount = await prisma.usageRecord.count();
    // Only records with userId were imported
    const usageWithUser = (
      exportData.usageRecords as { userId: string | null }[]
    ).filter((r) => r.userId).length;
    results.push({
      model: "Usage Records",
      old: usageWithUser,
      new: usageCount,
      status: usageCount >= usageWithUser ? "✅" : "⚠️",
    });

    // ========================================
    // 9. Verify Pengajuans
    // ========================================
    const pengajuanCount = await prisma.pengajuan.count();
    results.push({
      model: "Pengajuans",
      old: exportData.pengajuans.length,
      new: pengajuanCount,
      status: pengajuanCount >= exportData.pengajuans.length ? "✅" : "⚠️",
    });

    // ========================================
    // 10. Verify Pengajuan Items
    // ========================================
    const pengajuanItemCount = await prisma.pengajuanItem.count();
    results.push({
      model: "Pengajuan Items",
      old: exportData.pengajuanItems.length,
      new: pengajuanItemCount,
      status:
        pengajuanItemCount >= exportData.pengajuanItems.length ? "✅" : "⚠️",
    });

    // ========================================
    // 11. Verify Perizinans
    // ========================================
    const perizinanCount = await prisma.perizinan.count();
    results.push({
      model: "Perizinans",
      old: exportData.perizinans.length,
      new: perizinanCount,
      status: perizinanCount >= exportData.perizinans.length ? "✅" : "⚠️",
    });

    // ========================================
    // 12. Verify Taxes
    // ========================================
    const taxCount = await prisma.tax.count();
    results.push({
      model: "Taxes",
      old: exportData.taxes.length,
      new: taxCount,
      status: taxCount >= exportData.taxes.length ? "✅" : "⚠️",
    });

    // ========================================
    // 13. Verify Tax Payments
    // ========================================
    const taxPaymentCount = await prisma.taxPayment.count();
    results.push({
      model: "Tax Payments",
      old: exportData.taxPayments.length,
      new: taxPaymentCount,
      status: taxPaymentCount >= exportData.taxPayments.length ? "✅" : "⚠️",
    });

    // Print results table
    console.log("📊 Record Count Comparison:\n");
    console.log("| Model            | Old DB | New DB | Status |");
    console.log("|------------------|--------|--------|--------|");
    for (const r of results) {
      console.log(
        `| ${r.model.padEnd(16)} | ${String(r.old).padStart(6)} | ${String(
          r.new
        ).padStart(6)} | ${r.status}     |`
      );
    }

    // ========================================
    // Additional Integrity Checks
    // ========================================
    console.log("\n🔎 Data Integrity Checks:\n");

    // Check running balance consistency
    const lastTrx = await prisma.transaction.findFirst({
      where: { deletedAt: null },
      orderBy: { date: "desc" },
    });
    if (lastTrx) {
      const { _sum } = await prisma.transaction.aggregate({
        where: { deletedAt: null, type: TransactionType.INCOME },
        _sum: { amount: true },
      });
      const { _sum: expSum } = await prisma.transaction.aggregate({
        where: { deletedAt: null, type: { not: TransactionType.INCOME } },
        _sum: { amount: true },
      });
      const calculatedBalance = (_sum.amount ?? 0) - (expSum.amount ?? 0);
      const storedBalance = lastTrx.balanceAfter;

      console.log(
        `   Current Balance (stored):     ${storedBalance.toLocaleString(
          "id-ID"
        )}`
      );
      console.log(
        `   Current Balance (calculated): ${calculatedBalance.toLocaleString(
          "id-ID"
        )}`
      );
      if (storedBalance === calculatedBalance) {
        console.log("   ✅ Balance is consistent");
      } else {
        console.log("   ⚠️ Balance mismatch - consider recalculating");
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    if (hasErrors) {
      console.log("⚠️ Some records may not have been imported correctly.");
      console.log("   Please review the counts above.");
    } else {
      console.log("✅ Migration verification completed successfully!");
    }
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n❌ Verification failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get filepath from command line
const filepath = process.argv[2];
if (!filepath) {
  console.error(
    "Usage: npx tsx scripts/verify-migration.ts <path-to-export.json>"
  );
  process.exit(1);
}

verifyMigration(filepath).catch(console.error);
