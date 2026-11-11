/**
 * The turn that most chat states build on. The member asks for address
 * autocomplete in the checkout form. The agent builds it, tests it, and
 * opens pull request #482.
 */

import type { ChatItem, ToolKind } from './conversations'
import { changedFiles } from './files'
import { bullets } from './listConversations'

function tool(
  id: string,
  kind: ToolKind,
  target: string,
  detail?: string,
): ChatItem {
  return { kind: 'tool', id, tool: kind, target, detail, status: 'done' }
}

export const autocompleteStart: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask',
    text: 'Add address autocomplete to the checkout form. Use the places proxy at `/api/places`, and keep the manual fields as a fallback.',
  },
  {
    kind: 'agent',
    id: 'plan',
    blocks: ["I'll start with the checkout form and the places proxy."],
  },
  tool('read-form', 'read', 'src/app/checkout/AddressForm.tsx'),
  tool('read-proxy', 'read', 'src/app/api/places/route.ts'),
  tool('search-places', 'search', 'usePlaces', '2 results'),
  {
    kind: 'agent',
    id: 'approach',
    blocks: [
      "The proxy already returns predictions, so the work is in the form. I'll add a `useAddressAutocomplete` hook, show suggestions under the first address line, and fill the other fields when one is chosen.",
    ],
  },
  tool(
    'create-hook',
    'create',
    'src/app/checkout/useAddressAutocomplete.ts',
    '+64',
  ),
  tool('edit-form', 'edit', 'src/app/checkout/AddressForm.tsx', '+38 −6'),
  tool('remove-lookup', 'run', 'git rm src/app/checkout/postcodeLookup.ts'),
]

export const autocompleteTests: readonly ChatItem[] = [
  tool('create-test', 'create', 'tests/checkout/address.test.ts', '+52'),
  tool('unit', 'run', 'npm test -- checkout', '14 passed'),
]

const e2eTarget = 'npx playwright test checkout.spec.ts'

export const autocompleteEnd: readonly ChatItem[] = [
  tool('e2e', 'run', e2eTarget, '3 passed'),
  tool('readme', 'edit', 'README.md', '+4 −1'),
  tool('pr', 'run', 'gh pr create --fill', '#482'),
  {
    kind: 'agent',
    id: 'done',
    blocks: [
      'Done. Checkout now suggests addresses as you type.',
      bullets(
        'Choosing a suggestion fills the street, city, and postcode.',
        'Manual entry still works when there is no match.',
        'Removed the old postcode lookup, which the suggestions replace.',
        'Unit tests cover `useAddressAutocomplete`, and the checkout end-to-end tests pass.',
        'Opened pull request #482.',
      ),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '4m 12s', files: changedFiles },
]

export const e2eRunning: ChatItem = {
  kind: 'tool',
  id: 'e2e',
  tool: 'run',
  target: e2eTarget,
  status: 'running',
}

export const history: readonly ChatItem[] = [
  ...autocompleteStart,
  ...autocompleteTests,
  ...autocompleteEnd,
]

/** The turn up to its end-to-end run, which a stop cut off. */
export const cutOffTurn: readonly ChatItem[] = [
  ...autocompleteStart,
  ...autocompleteTests,
  { ...e2eRunning, status: 'stopped' },
]
