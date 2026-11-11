import { oldSessions } from '../../../docs/mockups/src/fixtures/conductorImport'
import type {
  ConductorImportOrigin,
  ConductorOldDocument,
} from '../../shared/conductor-import'
import { FAKE_TIME, fakeUser } from './core'

/** The days of the old sessions of the mockups, before the fake time. */
const daysBefore: Readonly<Record<string, number>> = {
  'edge-cases': 6,
  'before-tax': 7,
  'basket-totals': 13,
}

/**
 * The old documents of the imported fake workspace: the sessions of the
 * mockups, the newest first, with the public metadata that M4 serves.
 */
export const fakeOldDocuments: readonly ConductorOldDocument[] =
  oldSessions.map((session) => ({
    id: session.key,
    title: session.title,
    agent: session.agent,
    messageCount: session.messages,
    occurredAt: FAKE_TIME - (daysBefore[session.key] ?? 1) * 86_400_000,
  }))

/** The Markdown of an old document, as the Mac app writes it. */
export function fakeOldMarkdown(document: ConductorOldDocument): string {
  const agent = document.agent === 'claude' ? 'Claude' : 'Codex'
  return [
    `# ${document.title ?? 'Untitled'}`,
    '',
    `${agent} · ${document.messageCount} messages`,
    '',
    '## You',
    '',
    'The basket total is wrong when a coupon and VAT both apply.',
    '',
    `## ${agent}`,
    '',
    '- Read `src/basket/totals.ts`',
    '- Ran `npm test -- totals`',
    '',
    'The coupon now comes off before tax, with a test for it.',
    '',
  ].join('\n')
}

/**
 * The import origin of the fake workspace: before a successful
 * activation, or after one at the fake time.
 */
export function fakeImportOrigin(activated: boolean): ConductorImportOrigin {
  return {
    localWorkspaceId: 'conductor-coupon-totals',
    importerUserId: fakeUser.id,
    activatedAt: activated ? FAKE_TIME : null,
  }
}
