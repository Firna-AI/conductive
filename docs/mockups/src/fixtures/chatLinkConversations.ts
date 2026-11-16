/**
 * The chats of the page of links in chat text, in Checkout address
 * autocomplete. The made-up sites, such as the places API and a guide of
 * Acme, use the reserved top-level domain `.example`.
 */

import type { ChatItem } from './conversations'
import { bullets } from './listConversations'
import { addressQuery } from './previews'
import { pullRequest } from './pullRequests'

function done(
  id: string,
  tool: Extract<ChatItem, { kind: 'tool' }>['tool'],
  target: string,
  detail?: string,
): ChatItem {
  return { kind: 'tool', id, tool, target, detail, status: 'done' }
}

/** The end of a turn that changed no file. */
function end(id: string, duration: string): ChatItem {
  return { kind: 'turn-end', id, duration, files: [] }
}

/**
 * An answer with the links that a reviewer needs: the bare address of the
 * pull request, a Markdown link in bold that shows as its label, and an
 * address alone in code. The name of the key stays code.
 */
const reviewLinks: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-links',
    text: `Is #${pullRequest.number} ready for review? Send me the links that a reviewer needs.`,
  },
  done('checks', 'run', `gh pr checks ${pullRequest.number}`, '6 passed'),
  done('read-env', 'read', '.env.example'),
  {
    kind: 'agent',
    id: 'links-answer',
    blocks: [
      'Yes. All 6 checks passed. A reviewer needs these:',
      bullets(
        `The pull request: ${pullRequest.url}`,
        'The **[docs of the places API](https://docs.places.example/v1/autocomplete)**, which the suggestions call.',
        'A key for the places proxy, from `https://places.example/account/keys`. The proxy reads it from `PLACES_API_KEY`.',
      ),
    ],
  },
  end('links-end', '21s'),
]

/**
 * An answer with a label link, then two Markdown links whose labels read
 * as addresses: one holds `://`, and one starts with `www.`. Each label
 * names another address than its link, as the README of the repository
 * has them.
 */
const addressLabels: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-docs',
    text: 'Where are the docs of the places API that the proxy calls?',
  },
  done('read-route', 'read', 'src/app/api/places/route.ts'),
  done('read-readme', 'read', 'README.md'),
  {
    kind: 'agent',
    id: 'docs-answer',
    blocks: [
      'The proxy calls the [autocomplete endpoint](https://docs.places.example/v1/autocomplete) of the places API.',
      'The README links its guide as [https://places.example/docs](https://docs.places.example/v1/guide), and its status page as [www.places.example/status](https://status.places.example).',
    ],
  },
  end('docs-end', '9s'),
]

/**
 * An answer with the local address of the dev server, which runs in
 * Terminal 1. The tool call line keeps its address as text.
 */
const localServer: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-try',
    text: 'Can I try the suggestions now?',
  },
  done(
    'load-checkout',
    'run',
    'curl -sI http://localhost:3000/checkout',
    '200 OK',
  ),
  {
    kind: 'agent',
    id: 'try-answer',
    blocks: [
      `Yes. The dev server in Terminal 1 runs at http://localhost:3000. Open the checkout and type an address, such as ${addressQuery}, to see the suggestions.`,
    ],
  },
  end('try-end', '8s'),
]

/**
 * A message of Cal with a bare address and a Markdown link, while the
 * agent starts to work on it.
 */
const sentLinks: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-match',
    text: 'Match the suggestions to the list in https://github.com/acme/storefront/pull/468, and follow the [address form guide](https://design.acme.example/forms/address) for the labels.',
  },
  {
    kind: 'tool',
    id: 'view-468',
    tool: 'run',
    target: 'gh pr diff 468',
    status: 'running',
  },
  { kind: 'working', id: 'working', elapsed: '4s' },
]

/**
 * A finished turn whose work holds two messages with links. The first
 * starts with a label link, so its closed line shows the link. The second
 * holds a long bare address, which breaks to fit the open line.
 */
const workLinks: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-fix',
    text: `Fix the failed end-to-end check of #${pullRequest.number}.`,
  },
  done('checks', 'run', `gh pr checks ${pullRequest.number}`, '1 failed'),
  {
    kind: 'agent',
    id: 'cause',
    blocks: [
      `[#${pullRequest.number}](${pullRequest.url}/checks) failed its end-to-end check at the phone size: the list of suggestions covers Continue.`,
    ],
  },
  done(
    'phone',
    'run',
    'npx playwright test checkout.spec.ts --project=phone',
    '1 failed',
  ),
  {
    kind: 'agent',
    id: 'pattern',
    blocks: [
      "The combobox pattern at https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ closes the list when the focus leaves the field. I'll do the same, so Continue shows again.",
    ],
  },
  done('edit-form', 'edit', 'src/app/checkout/AddressForm.tsx', '+7 −1'),
  done('e2e', 'run', 'npx playwright test checkout.spec.ts', '3 passed'),
  done('push', 'run', 'git push'),
  {
    kind: 'agent',
    id: 'fix-answer',
    blocks: [
      `Done. The list of suggestions now closes when the focus leaves the address field, so Continue shows on a phone. All 3 end-to-end tests pass, and the checks of #${pullRequest.number} run again.`,
    ],
  },
  end('fix-end', '2m 04s'),
]

/**
 * The chats of the page of links in chat text. `history` is the finished
 * turn before each of the first four.
 */
export function chatLinkConversations(history: readonly ChatItem[]) {
  return {
    'chat-links': [...history, ...reviewLinks],
    'chat-link-labels': [...history, ...addressLabels],
    'chat-link-local': [...history, ...localServer],
    'chat-links-sent': [...history, ...sentLinks],
    'chat-links-in-work': workLinks,
  } as const satisfies Record<string, readonly ChatItem[]>
}
