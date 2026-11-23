export function formatBdt(value: number): string {
  return new Intl.NumberFormat('bn-BD', {
    currency: 'BDT',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export function toBnDigits(val: number | string): string {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bn[Number(d)] ?? d);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'অনুরোধটি সম্পন্ন করা যায়নি।';
}
