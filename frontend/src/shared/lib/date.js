export function addDays(dateLike, amount) {
  const date = new Date(dateLike);
  date.setDate(date.getDate() + amount);
  return date.toISOString();
}
