/**
 * A count as the app writes it, with a comma in each thousand: 18,412. It
 * keeps one form in every language of the browser, so the app and the
 * mockups show the same text, also in the counts of their sentences.
 */
export function formatCount(count: number): string {
  return count.toLocaleString('en')
}
