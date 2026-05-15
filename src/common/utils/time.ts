export function minutesAgo(date?: Date | null): number | null {
  if (!date) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}
