export function formatBdt(value: number): string {
  return new Intl.NumberFormat('bn-BD', {
    currency: 'BDT',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'অনুরোধটি সম্পন্ন করা যায়নি।';
}
