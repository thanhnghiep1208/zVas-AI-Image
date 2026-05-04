const STANDARD_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '4:1', value: 4 },
  { label: '1:4', value: 1 / 4 },
  { label: '8:1', value: 8 },
  { label: '1:8', value: 1 / 8 },
] as const;

export function getClosestAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  return STANDARD_RATIOS.reduce((prev, curr) =>
    Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev
  ).label;
}
