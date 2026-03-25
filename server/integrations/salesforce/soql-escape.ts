export function escapeSoqlString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

export function escapeSoqlLimit(value: number): number {
  const num = Math.floor(Number(value));
  if (!Number.isFinite(num) || num < 1) return 1;
  if (num > 2000) return 2000;
  return num;
}
