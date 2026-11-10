import { productName } from '../../../docs/mockups/src/brand'
import { waitlistText } from '../access-copy'
import { conductorAnnouncementHref, conductorCloudDays } from './dates'
import { parityCheckedOn } from './features'

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
 * The days of Conductor Cloud, in words that stay true after each day,
 * with the announcement of Conductor beside them.
 */
const cloudDays: CopyText = [
  { text: "Conductor's announcement", href: conductorAnnouncementHref },
  ' gives the days of Conductor Cloud: read-only from ',
  { day: conductorCloudDays.readOnly },
  ', and shut down from ',
  { day: conductorCloudDays.shutDown },
  '.',
]

/** The day of the last full check of the rows against the product. */
const checked: CopyText = ['List checked on ', { day: parityCheckedOn }, '.']

/**
 * The words of the page for people who move from Conductor Cloud. The site
 * and the mockup draw the same words, each in its own markup.
 */
export const parityPageCopy = {
  documentTitle: `From Conductor Cloud – ${productName}`,
  description: `Which Conductor Cloud features work in ${productName} today, which are on the way, and which work differently.`,
  label: 'From Conductor Cloud',
  title: 'Coming from Conductor Cloud?',
  lead: `See which Conductor Cloud features work in ${productName} today, which are on the way, and which work differently.`,
  scope: {
    title: 'Conductor Cloud features only.',
    text: 'The list leaves out the features of local Conductor workspaces on a Mac.',
  },
  cloudDays,
  checked,
  legendTitle: 'How to read the list',
  columns: {
    area: 'Area',
    feature: 'Conductor Cloud feature',
    status: `In ${productName}`,
    note: 'Notes',
  },
  due: 'Due',
  noDate: 'No date yet',
  affiliation: `${productName} is not affiliated with Conductor.`,
  closing: {
    title: 'Plan your move from Conductor Cloud.',
    text: waitlistText,
  },
} as const

/** The words of the links of the site that lead to the page. */
export const parityLinkCopy = {
  home: 'From Conductor Cloud? Compare the features',
  footer: 'From Conductor Cloud',
} as const
