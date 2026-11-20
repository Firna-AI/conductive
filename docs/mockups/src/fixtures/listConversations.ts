import { bullets, code, item, numbered, p, under } from './agentText'
import type { ChatItem } from './conversations'

/**
 * A reply with two choices for the user. The agent indents the lettered
 * options of each choice under it, so they show as a list in its item.
 */
const choicesTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-provider',
    text: 'Check both address providers, then tell me what you need from me.',
  },
  {
    kind: 'tool',
    id: 'compare',
    tool: 'run',
    target: 'npm test -- checkout/providers',
    detail: '8 passed',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'choices',
    blocks: [
      p(
        'Both providers return the same suggestions for the test addresses. Two choices need your answer:',
      ),
      numbered(
        under(
          item(
            'Provider (medium effort). The form calls the places proxy at ',
            code('/api/places'),
            ' today.',
          ),
          bullets(
            item(
              'a. Keep the places proxy. It runs on the server, so the browser loads no key.',
            ),
            item(
              'b. Move to the hosted widget. It needs a key in the browser.',
            ),
            item('Recommended: a.'),
          ),
        ),
        under(
          item(
            'Manual fields (small effort). The street, city, and postcode fields show under the suggestions.',
          ),
          bullets(
            item('a. Keep them as a fallback.'),
            item('b. Hide them until the person chooses to type the address.'),
            item('Recommended: a.'),
          ),
        ),
      ),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '42s', files: [] },
]

/**
 * A finished turn whose work holds a plan with steps under each item. The
 * plan folds with the work, before the answer.
 */
const planInWork: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-debounce',
    text: 'Debounce the address lookups, so we stay under the rate limit.',
  },
  {
    kind: 'agent',
    id: 'plan',
    blocks: [
      p('The plan, in this order:'),
      numbered(
        under(
          item('Add the debounce to ', code('useAddressAutocomplete'), '.'),
          bullets(
            item('Wait 250 ms after the last key press.'),
            item('Cancel the lookup that a new key press replaces.'),
          ),
        ),
        under(
          item('Cover it with a test.'),
          bullets(item('Use a fake clock, so the test never sleeps.')),
        ),
      ),
    ],
  },
  {
    kind: 'tool',
    id: 'edit-hook',
    tool: 'edit',
    target: 'src/app/checkout/useAddressAutocomplete.ts',
    detail: '+18 −3',
    status: 'done',
  },
  {
    kind: 'tool',
    id: 'unit',
    tool: 'run',
    target: 'npm test -- checkout',
    detail: '15 passed',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'done',
    blocks: [p('Done. Each lookup now waits 250 ms after the last key press.')],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '1m 48s', files: [] },
]

/** The chats of the list pages: replies with lists under their items. */
export const listConversations = {
  'nested-lists': choicesTurn,
  'nested-lists-in-work': planInWork,
} as const satisfies Record<string, readonly ChatItem[]>
