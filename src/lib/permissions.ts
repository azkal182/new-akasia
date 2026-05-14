/**
 * Role-based permission helpers for Akasia
 * Hierarchy: ADMIN > USER > DRIVER
 */

export type UserRole = 'ADMIN' | 'USER' | 'DRIVER';

export const can = {
  /** Melihat stats ringkasan keuangan (saldo, pemasukan, pengeluaran) */
  viewFinanceSummary: (role: UserRole) => role === 'ADMIN',

  /** Melihat stats ringkasan BBM */
  viewFuelSummary: (role: UserRole) => role === 'ADMIN',

  /** Melihat tombol & halaman laporan */
  viewReports: (role: UserRole) => role === 'ADMIN',

  /** Melihat menu Admin (pengguna, dll) */
  viewAdminMenu: (role: UserRole) => role === 'ADMIN',

  /** Input pemasukan atau pengeluaran keuangan */
  inputFinance: (role: UserRole) => role === 'ADMIN' || role === 'USER',

  /** Input pemasukan BBM atau isi BBM */
  inputFuel: (role: UserRole) => role === 'ADMIN' || role === 'USER',

  /** Melihat menu navigasi utama (Keuangan, Armada, BBM, dll) */
  viewMainMenu: (role: UserRole) => role === 'ADMIN' || role === 'USER',

  /** Melihat group Program Kerja (semua role) */
  viewProgramKerja: (_role: UserRole) => true,
};
