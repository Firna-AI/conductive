import { workspaceLabel } from '../components/workspaces/label'
import { postcodeLookup } from './archivedWorkspaces'
import type { ChatItem } from './conversations'
import { orgs } from './orgs'
import {
  checkoutAutocomplete,
  savedCarts,
  webhookRetries,
  workspaceLink,
} from './workspaces'

/**
 * The message that links Saved carts from Checkout address autocomplete.
 * The user pasted the link of Saved carts, and the message box shows it as
 * a chip at once. The message keeps the plain link.
 */
export const workspaceLinkDraft = `Check that the suggestions stay closed when ${savedCarts.link} restores a saved address, and link it in #482.`

/** A task in New workspace that names an earlier workspace by its link. */
export const followUpTask = `Debounce the address lookups of ${checkoutAutocomplete.link} to 250 ms, so we stay under the rate limit of the places proxy.`

/**
 * A workspace of Futex, another org of Cal. In a chat of Acme its link
 * stays plain text.
 */
const futexLink = workspaceLink(
  'YGgla7tCO_DSRXWe0F29xaLU5veBuBzeIWNkb3nSvPk',
  orgs.futex,
)

/** The agent looks for the branch of Saved carts, which has no commits yet. */
const findSavedCarts = `git ls-remote origin ${savedCarts.branch}`

/**
 * The answer of the agent, which links three workspaces of Acme. Retry
 * failed webhooks has output that Cal has not read, so its chip shows the
 * name in bold.
 */
const linkAnswer: readonly string[] = [
  `[${workspaceLabel(savedCarts.number)}](${savedCarts.link}) has no commits yet, so I checked the address form here. A restored address fills the fields with \`setAddress\`, which skips the lookup. So the suggestions stay closed.`,
  `I added a test for a restored address. It reuses the test of ${postcodeLookup.link}, which covered the same case for the old lookup.`,
  `The description of #482 now ends with \`Related: ${savedCarts.link}\`.`,
  `${webhookRetries.link} finished its turn while I worked, and its checks passed.`,
]

/**
 * The chats of Checkout address autocomplete after a message that links
 * another workspace. `history` is the finished turn before it. In the
 * answer, a Markdown link and a bare link to a workspace of Acme show as
 * chips, and a link in code stays code. A link to a workspace of another
 * org stays plain text.
 */
export function workspaceLinkConversations(history: readonly ChatItem[]) {
  const ask: ChatItem = {
    kind: 'user',
    id: 'link-ask',
    text: workspaceLinkDraft,
  }
  return {
    'link-sent': [
      ...history,
      ask,
      {
        kind: 'tool',
        id: 'find-carts',
        tool: 'run',
        target: findSavedCarts,
        status: 'running',
      },
      { kind: 'working', id: 'working', elapsed: '6s' },
    ],
    'link-answer': [
      ...history,
      ask,
      {
        kind: 'tool',
        id: 'find-carts',
        tool: 'run',
        target: findSavedCarts,
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'find-restore',
        tool: 'search',
        target: 'setAddress',
        detail: '2 results',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'edit-test',
        tool: 'edit',
        target: 'tests/checkout/address.test.ts',
        detail: '+18',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'run-test',
        tool: 'run',
        target: 'npm test -- checkout',
        detail: '15 passed',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'edit-pr',
        tool: 'run',
        target: 'gh pr edit 482 --body-file pr.md',
        status: 'done',
      },
      { kind: 'agent', id: 'link-answer', blocks: linkAnswer },
      {
        kind: 'turn-end',
        id: 'link-turn-end',
        duration: '1m 48s',
        files: [
          {
            path: 'tests/checkout/address.test.ts',
            change: 'modified',
            added: 18,
            removed: 0,
          },
        ],
      },
    ],
    'other-org-link': [
      ...history,
      {
        kind: 'user',
        id: 'other-org-ask',
        text: `Futex fixed the same bug in ${futexLink}. Do the same here.`,
      },
      {
        kind: 'agent',
        id: 'other-org-answer',
        blocks: [
          "That link is a workspace of another org, so I can't read its branch from here. Paste the fix, and I'll apply it.",
        ],
      },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
