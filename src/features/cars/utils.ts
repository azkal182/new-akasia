export function formatUsageEstimate(record: {
  estimatedDurationMinutes?: number | null;
  estimatedDays?: number | null;
}) {
  const totalMinutes =
    record.estimatedDurationMinutes ??
    (record.estimatedDays ? record.estimatedDays * 1440 : null);

  if (!totalMinutes) {
    return null;
  }

  if (totalMinutes % 1440 === 0) {
    const days = totalMinutes / 1440;
    return `${days} hari`;
  }

  if (totalMinutes % 60 === 0) {
    const hours = totalMinutes / 60;
    return `${hours} jam`;
  }

  return `${totalMinutes} menit`;
}
