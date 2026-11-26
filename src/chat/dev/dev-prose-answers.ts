/**
 * The answer about the two review comments of Priya, as the mockups draw it
 * at `app/chat/formatting`: each comment in a quote, a rule between them,
 * emphasis and strikethrough, an address on two lines, and a bold label.
 * Each part is one line or one blank line, so the bold label at its end
 * shows its first `**` until its pair arrives.
 */
export const proseAnswer = [
  'Priya left two comments. The first is on the lookups:\n\n',
  '> Each key press sends a lookup. Can we wait until the person *stops* typing?\n\n',
  'A wait of 250 ms after the last key press sends one lookup in place of about 8. I can add it to `useAddressAutocomplete`.\n\n',
  '---\n\n',
  'The second is on the phone layout:\n\n',
  '> On a phone, the list covers the city and postcode fields.\n\n',
  '~~Hide the fields while the list is open.~~ Priya wants each field in view, so the fields can move down under the list. She tested with this address:<br>221B Baker Street<br>London NW1 6XE\n\n',
  '**Next:',
  "** say yes, and I'll make both changes and push them.",
]

/**
 * The plan of a turn with the prose answer: a quote with emphasis, a rule,
 * strikethrough, and a line break, so its message line in the folded work
 * shows each of them closed and open.
 */
export const prosePlan = [
  '> Each key press sends a lookup. Can we wait until the person *stops* typing?\n\n',
  "I'll add the wait to `useAddressAutocomplete` first.\n\n",
  '---\n\n',
  '~~Hide the fields while the list is open.~~ Next, the fields move down:<br>under the list.',
]

/** One section of the long answer, about 240 characters of Markdown. */
const section = (index: number) =>
  [
    `## Step ${index + 1}\n\n`,
    'The **build** passed. See [the pull request](https://github.com/acme/app/pull/2) and `npm run check`.\n\n',
    '- one\n  - two with https://example.com/x\n1. three\n\n',
    '| a | b |\n| --- | :-: |\n| x<br>y | `z` |\n\n',
    '> A quote with *emphasis*.\n\n',
  ].join('')

/** The sections of the long answer: at least 100 KiB of Markdown. */
function longText(): string {
  const sections: string[] = []
  let length = 0
  while (length < 100 * 1024) {
    const next = section(sections.length)
    sections.push(next)
    length += next.length
  }
  return sections.join('')
}

/**
 * A long answer: about 100 KiB in its first part, then ten short parts. So
 * each of the short parts is a live update of an answer of 100 KiB, whose
 * time the development page lets a reader measure.
 */
export const longAnswer = [
  longText(),
  ...Array.from({ length: 10 }, (_, index) => `Update ${index + 1}. `),
]
