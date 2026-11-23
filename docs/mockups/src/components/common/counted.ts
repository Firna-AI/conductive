/**
 * A whole number with its word: the singular word for 1, and the plural
 * word for any other number, such as "1 hour", "20 hours", or "1,604
 * starts". The number takes the format of the page, with a comma between
 * thousands. The plural word is the singular word with an "s", unless the
 * caller gives another one. It imports no fixture, so the app can use it
 * too.
 */
export function counted(
  value: number,
  word: string,
  plural = `${word}s`,
): string {
  return `${value.toLocaleString('en')} ${value === 1 ? word : plural}`
}
