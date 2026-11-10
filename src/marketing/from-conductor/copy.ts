import { productName } from '../../../docs/mockups/src/brand'
import { waitlistText } from '../access-copy'
import { conductorAnnouncementHref, conductorCloudDays } from './dates'
import { parityCheckedAt } from './features'

/**
 * A part of a sentence of the page: plain words, a link to a page of
 * another site, or a day as `YYYY-MM-DD`, which each host draws as a
 * `time` element with the words of `dayWords`.
 */
type CopyPart =
  | string
  | { readonly text: string; readonly href: string }
  | { readonly day: string }

/** A sentence of the page, in parts that hold no markup. */
export type CopyText = readonly CopyPart[]

/**
 * The days of the cloud workspaces of Conductor, in words that stay true
 * after each day, with the announcement of Conductor beside them.
 */
const cloudDays: CopyText = [
  { text: "Conductor's announcement", href: conductorAnnouncementHref },
  ' gives the days of its cloud workspaces: read-only from ',
  { day: conductorCloudDays.readOnly },
  ', and shut down from ',
  { day: conductorCloudDays.shutDown },
  '.',
]

/**
 * The words of the page for people who move from Conductor. The site and the
 * mockup draw the same words, each in its own markup.
 */
export const parityPageCopy = {
  documentTitle: `From Conductor – ${productName}`,
  description: `Which Conductor features work in ${productName} today, which are on the way, and which work differently.`,
  label: 'From Conductor',
  title: 'Coming from Conductor?',
  lead: `See which Conductor features work in ${productName} today, which are on the way, and which work differently.`,
  cloudDays,
  /**
   * The line of the last full check of every row: its label, then the time
   * in UTC as `YYYY-MM-DDTHH:MMZ`, which each host draws as a `time`
   * element with the words of `timeWords`.
   */
  lastCheck: { label: 'Last checked', time: parityCheckedAt },
  legendTitle: 'How to read the list',
  columns: {
    area: 'Area',
    feature: 'Conductor feature',
    status: `In ${productName}`,
    note: 'Notes',
  },
  due: 'Due',
  noDate: 'No date yet',
  affiliation: `${productName} is not affiliated with Conductor.`,
  closing: {
    title: 'Plan your move from Conductor.',
    text: waitlistText,
  },
} as const

/**
 * The name of the link to the row of a feature, such as "Link to File tree",
 * so that the name says where the link leads.
 */
export function rowLinkLabel(featureName: string): string {
  return `Link to ${featureName}`
}

/** The words of the links of the site that lead to the page. */
export const parityLinkCopy = {
  home: 'From Conductor? Compare the features',
  footer: 'From Conductor',
} as const
