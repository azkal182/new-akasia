// Tanggal mulai operasional baru untuk seluruh perhitungan BBM.
export const FUEL_START_DATE = new Date('2026-09-11T00:00:00.000Z');
export const FUEL_START_DATE_LABEL = '11 September 2026';

export function clampFuelStartDate(date: Date) {
  return date < FUEL_START_DATE ? FUEL_START_DATE : date;
}

export function isFuelDateBeforeStart(date: Date) {
  return date < FUEL_START_DATE;
}

export function getFuelDateValidationMessage() {
  return `Tanggal BBM tidak boleh sebelum ${FUEL_START_DATE_LABEL}`;
}
