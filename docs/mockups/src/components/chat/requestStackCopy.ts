/**
 * The words of the stack of requests above the composer: the place of the
 * card on top, and the buttons that move through the stack. The app and
 * the mockups take them from here.
 */
export const requestStackWords = {
  /** The spoken name of the button that shows the card before. */
  previous: 'Previous request',
  /** The spoken name of the button that shows the card after. */
  next: 'Next request',
} as const

/** The place of the card on top of the stack, such as "1 of 3". */
export function stackPlace(place: number, count: number): string {
  return `${place} of ${count}`
}
