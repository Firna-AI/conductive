/**
 * The words of the Settings tab of the operator, with its Stop time box.
 * A login goes in without `@`, and a time as the page writes it. This
 * module imports no fixture, so the app uses it too.
 */
export const stopTimeWords = {
  tab: 'Settings',
  title: 'Stop time',
  line: 'A cloud computer stops after this time without activity, unless an agent is at work. A running computer takes a new time at its next activity, or when its current time ends.',
  label: 'Stop time of idle cloud computers',
  save: 'Save stop time',
  notSaved: "The stop time wasn't saved. Try again.",
  notLoaded: "The settings didn't load",
} as const

/** The label of one stop time in the control, such as "30 min" or "2 hours". */
export function stopTimeLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return hours === 1 ? '1 hour' : `${hours} hours`
}

/**
 * The line under the stop time: when, and by which operator, it last
 * changed. A stop time that no operator has changed has no line.
 */
export function stopTimeChangedLine(
  when: string | null,
  operator: string | null,
): string | null {
  if (when === null) return null
  return operator === null
    ? `Changed on ${when}`
    : `Changed on ${when} by @${operator}`
}
