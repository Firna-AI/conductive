import type { TextBlock } from '../../../../src/chat/markdown/agent-blocks'
import { code, codeBlock, image, p, strong } from './agentText'
import type { ChatItem } from './conversations'
import { repositoryFolder } from './fileMentions'

/**
 * What a screenshot of the checkout shows: the form alone, the list of
 * suggestions of the address field over the postcode field, or that list
 * under the postcode field after the fix.
 */
export type CheckoutView = 'form' | 'covered' | 'fixed'

/**
 * The screenshot that the agent took after the fix, in the context folder
 * of the repository. The answer names it, and a press on its picture or its
 * chip opens it in the file tab.
 */
export const answerShot = '.context/shots/after.png'

/** The screenshot that the agent took before the fix, in the same folder. */
const beforeShot = '.context/shots/before.png'

/**
 * What the drawing of each screenshot of the agent shows, by its path: the
 * list of suggestions over the postcode field, then under it.
 */
export const shotViews: Readonly<Record<string, CheckoutView>> = {
  [beforeShot]: 'covered',
  [answerShot]: 'fixed',
}

/** The message of Cal before the answer with file chips. */
const answerAsk =
  'The suggestions cover the postcode field on a phone. Can you fix it, and show me where the hook skips short queries?'

/**
 * The answer of the agent. A mention, an absolute path under the repository
 * folder, and a relative path with a line target show as file chips. The
 * Markdown image of the screenshot shows as a small picture, or as a normal
 * link while the chat reads no picture. A path in another repository and
 * the code block stay code.
 */
const fileAnswer: readonly TextBlock[] = [
  p(
    'I moved the list of suggestions under the postcode field in ',
    strong('@src/app/checkout/AddressForm.tsx'),
    ', so it no longer covers the field. The phone view after the fix is in ',
    code(`${repositoryFolder}/${answerShot}`),
    '.',
  ),
  p(
    'The hook skips a query under three characters in ',
    code('src/app/checkout/useAddressAutocomplete.ts:19-22'),
    '. The billing service checks postcodes in ',
    code('/home/user/code/billing-service/src/postcode.ts'),
    ', which I left as it is.',
  ),
  p(
    'The screenshot: ',
    image('Postcode field on a phone', `${repositoryFolder}/${answerShot}`),
    '. I took it with:',
  ),
  codeBlock(
    'npx playwright screenshot --device="iPhone 13" http://localhost:3000/checkout .context/shots/after.png',
  ),
]

/** A tool call of the agent that finished. */
function done(
  id: string,
  tool: 'edit' | 'run',
  target: string,
  detail?: string,
): ChatItem {
  return { kind: 'tool', id, tool, target, detail, status: 'done' }
}

/** The command that takes a screenshot of the checkout on a phone. */
const shotCommand = 'npx playwright screenshot --device="iPhone 13"'

/**
 * A finished turn whose work holds a message with each screenshot. The
 * line of the first message stays closed, so it shows its image as the
 * link. The line of the last message is open, so it shows its picture.
 */
const workShots: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'shots-ask',
    text: 'The suggestions cover the postcode field on a phone. Can you fix it?',
  },
  done('shots-before', 'run', shotCommand),
  {
    kind: 'agent',
    id: 'shots-cause',
    blocks: [
      p(
        'The list of suggestions opens over the postcode field: ',
        image(
          'Postcode field before the fix',
          `${repositoryFolder}/${beforeShot}`,
        ),
        ". I'll move it under the field.",
      ),
    ],
  },
  done('shots-edit', 'edit', 'src/app/checkout/AddressForm.tsx', '+4 −2'),
  done('shots-after', 'run', shotCommand),
  {
    kind: 'agent',
    id: 'shots-check',
    blocks: [
      p(
        'The list now opens under the postcode field: ',
        image('Postcode field on a phone', `${repositoryFolder}/${answerShot}`),
      ),
    ],
  },
  done('shots-test', 'run', 'npx playwright test checkout.spec.ts', '3 passed'),
  {
    kind: 'agent',
    id: 'shots-answer',
    blocks: [
      p(
        'Done. The list of suggestions opens under the postcode field, so the field stays in view. All 3 end-to-end tests pass.',
      ),
    ],
  },
  {
    kind: 'turn-end',
    id: 'shots-end',
    duration: '1m 48s',
    files: [
      {
        path: 'src/app/checkout/AddressForm.tsx',
        change: 'modified',
        added: 4,
        removed: 2,
      },
    ],
  },
]

/**
 * The chats of Checkout address autocomplete with an answer that names
 * files of the tree. `history` is the finished turn before the first.
 */
export function answerFileConversations(history: readonly ChatItem[]) {
  return {
    'file-answer': [
      ...history,
      { kind: 'user', id: 'file-answer-ask', text: answerAsk },
      {
        kind: 'tool',
        id: 'file-answer-read',
        tool: 'read',
        target: 'src/app/checkout/AddressForm.tsx',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'file-answer-edit',
        tool: 'edit',
        target: 'src/app/checkout/AddressForm.tsx',
        detail: '+4 −2',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'file-answer-shot',
        tool: 'run',
        target: shotCommand,
        status: 'done',
      },
      { kind: 'agent', id: 'file-answer', blocks: fileAnswer },
      {
        kind: 'turn-end',
        id: 'file-answer-turn-end',
        duration: '1m 12s',
        files: [
          {
            path: 'src/app/checkout/AddressForm.tsx',
            change: 'modified',
            added: 4,
            removed: 2,
          },
        ],
      },
    ],
    'file-answer-in-work': workShots,
  } as const satisfies Record<string, readonly ChatItem[]>
}
