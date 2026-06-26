export function formatViews(num) {
  if (num >= 1000000) {
    const val = Math.floor(num / 100000) / 10;
    return `${val}M`;
  }
  if (num >= 1000) {
    const val = Math.floor(num / 100) / 10;
    return `${val}k`;
  }
  return String(num);
}
