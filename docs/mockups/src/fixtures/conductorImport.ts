/**
 * What the Mac app reads from Conductor on Cal's Mac, after Cal allows it:
 * the local Conductor workspaces that are not archived, also the ones that
 * Cal moved there from Conductor Cloud. It also holds the old sessions of
 * the workspace that the import makes, and the Markdown of one of them.
 */

import type { AgentKey } from './agents'
import type { MarkdownBlock } from './fileContents'
import { couponTotals, webhookSignatures } from './importedWorkspaces'
import type { Workspace } from './workspaces'

/** One local workspace of Conductor, as a row of the import list. */
export type ConductorRow = {
  /** The local ID in Conductor. Folder names repeat, so only it names a row. */
  id: string
  /**
   * The cloud name, then the title of the pull request, then the branch,
   * then the folder name: the first one that the workspace has.
   */
  name: string
  repository: string
  branch: string
  sessions: number
  /** The bytes that the import uploads for it. */
  upload: number
  /** The repository is one of the repositories that Acme chose. */
  chosen: boolean
  /** The workspace that an earlier import made from it. */
  imported?: Workspace
}

const megabyte = 1024 * 1024

/** The rows of the list, in the order that Conductor gives them. */
export const conductorRows: readonly ConductorRow[] = [
  {
    id: '4f1c2a7e',
    name: couponTotals.name,
    repository: 'acme/storefront',
    branch: couponTotals.branch,
    sessions: 3,
    upload: Math.round(18.4 * megabyte),
    chosen: true,
  },
  {
    id: '9b3e5d10',
    name: webhookSignatures.name,
    repository: 'acme/billing-service',
    branch: webhookSignatures.branch,
    sessions: 2,
    upload: Math.round(6.2 * megabyte),
    chosen: true,
  },
  {
    // It has no cloud name and no pull request, so the branch names it.
    id: '27ad8c03',
    name: 'calummoore/lima-v2',
    repository: 'acme/marketing-site',
    branch: 'calummoore/lima-v2',
    sessions: 1,
    upload: 940 * 1024,
    chosen: true,
  },
  {
    id: 'e8f04b6c',
    name: 'Offline order queue',
    repository: 'acme/mobile-app',
    branch: 'calummoore/quito-v3',
    sessions: 4,
    upload: Math.round(31 * megabyte),
    chosen: false,
  },
]

/** The rows that the first import selects: the first two. */
export const firstSelection: readonly string[] = ['4f1c2a7e', '9b3e5d10']

/** The rows after the first import: its two rows link to their workspaces. */
export const rowsAfterImport: readonly ConductorRow[] = conductorRows.map(
  (row) => {
    if (row.id === '4f1c2a7e') return { ...row, imported: couponTotals }
    if (row.id === '9b3e5d10') return { ...row, imported: webhookSignatures }
    return row
  },
)

/** The upload of the import while it runs: one done, one in progress. */
export const uploadProgress = {
  /** The bytes of the second workspace that went up so far. */
  sent: Math.round(2.1 * megabyte),
} as const

/** A session of a workspace in Conductor, which the import keeps. */
export type OldSession = {
  key: string
  title: string
  agent: AgentKey
  /** The messages that Conductor shows for it. */
  messages: number
  /** The day of its last message. */
  day: string
}

/** The old sessions of Coupon totals at checkout, the newest first. */
export const oldSessions: readonly OldSession[] = [
  {
    key: 'edge-cases',
    title: 'Coupon edge cases in tests',
    agent: 'codex',
    messages: 14,
    day: '4 Nov',
  },
  {
    key: 'before-tax',
    title: 'Apply coupons before tax',
    agent: 'claude',
    messages: 33,
    day: '3 Nov',
  },
  {
    key: 'basket-totals',
    title: 'Explain the basket totals',
    agent: 'claude',
    messages: 6,
    day: '28 Oct',
  },
]

/** The old session that the Markdown view opens. */
export const openOldSession = oldSessions[1]

/**
 * The Markdown file of Apply coupons before tax, as the Mac app writes it:
 * each message, each answer of the agent, and one short line for each of
 * its tool steps. Backticks mark inline code.
 */
export const oldSessionMarkdown: readonly MarkdownBlock[] = [
  { kind: 'h1', text: openOldSession.title },
  { kind: 'p', text: 'Claude · 33 messages · 3 November 2026' },
  { kind: 'h2', text: 'You' },
  {
    kind: 'p',
    text: 'The basket total is wrong when a coupon and VAT both apply. The coupon should come off before tax.',
  },
  { kind: 'h2', text: 'Claude' },
  {
    kind: 'ul',
    items: [
      'Read `src/basket/totals.ts`',
      'Read `src/basket/totals.test.ts`',
      'Ran `npm test -- totals`',
    ],
  },
  {
    kind: 'p',
    text: 'The total took the coupon off after VAT, so a 10% coupon also took 10% of the tax. I moved the coupon step before the tax step in `computeTotals`, and added a test for a coupon with VAT.',
  },
  { kind: 'h2', text: 'You' },
  { kind: 'p', text: 'Also round each line before the sum, as invoices do.' },
  { kind: 'h2', text: 'Claude' },
  {
    kind: 'ul',
    items: ['Edited `src/basket/totals.ts`', 'Ran `npm test -- totals`'],
  },
  {
    kind: 'p',
    text: 'Each line now rounds to the penny before the sum. The 14 basket tests pass.',
  },
]
