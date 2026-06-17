import { TransactionLedger } from '@/generated/prisma/enums';

export function financeTransactionWhere() {
  return {
    deletedAt: null,
    ledger: TransactionLedger.FINANCE,
  };
}

export function fuelTransactionWhere() {
  return {
    deletedAt: null,
    ledger: TransactionLedger.FUEL,
  };
}
