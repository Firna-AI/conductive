/**
 * The chat of the explanation of `count` in each state. Its first message
 * is the written prompt, which the popover hides and the tab shows. The
 * agent reads the hook and the form, and answers in a few lines. A
 * follow-up of Cal asks for a count that needs the read-only replica of
 * the production database, so the agent asks to run with a secret.
 */

import { bullets, code, item, p } from './agentText'
import type { ChatItem, ToolCallItem } from './conversations'
import { writtenPrompt } from './explanations'
import { agent, call, run, working } from './secretChatParts'
import { replicaRequest } from './secretRequests'

/** The ID of the written prompt, which the popover leaves out. */
export const promptId = 'explain-prompt'

const prompt: ChatItem = { kind: 'user', id: promptId, text: writtenPrompt() }

/** The first message while the sandbox starts: it waits in the queue. */
export const queuedPrompt: ChatItem = { ...prompt, queued: true }

function read(
  id: string,
  target: string,
  status: ToolCallItem['status'] = 'done',
): ToolCallItem {
  return { kind: 'tool', id, tool: 'read', target, status }
}

const readHook = read(
  'explain-read-hook',
  'src/app/checkout/useAddressAutocomplete.ts',
)
const readForm = read('explain-read-form', 'src/app/checkout/AddressForm.tsx')

function end(id: string, duration: string): ChatItem {
  return { kind: 'turn-end', id, duration, files: [] }
}

const answerStart = [
  'When the places proxy finds no address, ',
  code('useAddressAutocomplete'),
  ' returns no suggestions. The street, city, and',
] as const

const answer = agent(
  'explain-answer',
  ...answerStart,
  ' postcode fields then stay empty and editable, so you type the address yourself, as before this change.',
)

const answered: readonly ChatItem[] = [
  prompt,
  readHook,
  readForm,
  answer,
  end('explain-end', '14s'),
]

const followUp: readonly ChatItem[] = [
  ...answered,
  {
    kind: 'user',
    id: 'explain-follow-up',
    text: 'How many saved addresses have no postcode?',
  },
  agent(
    'explain-plan',
    "I'll count them on the read-only replica of the production database.",
  ),
]

/** A long answer, which scrolls inside the popover. */
const longAnswer: ChatItem = {
  kind: 'agent',
  id: 'explain-long',
  blocks: [
    p(
      'Manual entry is the fallback for any address that the places proxy cannot find.',
    ),
    bullets(
      item(
        code('useAddressAutocomplete'),
        ' asks the proxy after each pause in typing. When nothing matches, the proxy returns an empty list.',
      ),
      item(
        'With an empty list, ',
        code('AddressForm'),
        ' shows no suggestions, and the street, city, and postcode fields stay editable.',
      ),
      item('The form sends what you typed, as it did before this change.'),
      item(
        'The old postcode lookup used to fill the city from the postcode. It is gone, so the city stays as you type it.',
      ),
    ),
    p(
      'The test "keeps manual entry when nothing matches" in ',
      code('tests/checkout/address.test.ts'),
      ' covers this path, with a stub proxy that returns no addresses.',
    ),
  ],
}

export const explanationChats = {
  working: [prompt, working('3s')],
  answering: [
    prompt,
    readHook,
    readForm,
    agent('explain-answer', ...answerStart),
    working('9s'),
  ],
  answered,
  'follow-up': [...followUp, working('6s')],
  waiting: [
    ...followUp,
    call(replicaRequest, 'running'),
    run(replicaRequest, 'waiting'),
    working('24s'),
  ],
  failed: [
    prompt,
    readHook,
    {
      kind: 'error',
      id: 'explain-error',
      text: 'Claude is overloaded right now.',
    },
  ],
  stopped: [
    prompt,
    readHook,
    { ...readForm, status: 'stopped' },
    { kind: 'stopped', id: 'explain-stopped', by: 'cal' },
  ],
  long: [
    prompt,
    readHook,
    readForm,
    read('explain-read-test', 'tests/checkout/address.test.ts'),
    longAnswer,
    end('explain-end', '31s'),
  ],
  closed: answered,
} as const satisfies Record<string, readonly ChatItem[]>

/** The keys of the chats of explanations, for the workspace state. */
export const explanationConversationKeys = [
  'explanation',
  'explanation-waiting',
] as const

/**
 * The chats of the explanation of `count` that show in its tab, with the
 * written prompt as their first message: after its answer, and while its
 * follow-up waits for a member, as the popover shows it too.
 */
export const explanationConversations = {
  explanation: answered,
  'explanation-waiting': explanationChats.waiting,
} as const satisfies Record<
  (typeof explanationConversationKeys)[number],
  readonly ChatItem[]
>
