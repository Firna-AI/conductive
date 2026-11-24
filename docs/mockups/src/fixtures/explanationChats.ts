/**
 * The chats of the explanations of the line of `count`, in each state: the
 * explanation that Cal started with Explain, and the one that he started
 * with Ask and his question. The first message of each is its written
 * prompt, which the popover hides and the tab shows. The agent reads the
 * hook and the form, and answers in a few lines. A follow-up of Cal asks
 * for a count that needs the read-only replica of the production database,
 * so the agent asks to run with a secret.
 */

import { bullets, code, item, p, type Inline } from './agentText'
import type { ChatItem, ToolCallItem } from './conversations'
import {
  askPrompt,
  explanations,
  writtenPrompt,
  type Explanation,
} from './explanations'
import { agent, call, run, working } from './secretChatParts'
import { replicaRequest } from './secretRequests'

/** The ID of the written prompt, which the popover leaves out. */
export const promptId = 'explain-prompt'

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

/**
 * The short answer of an explanation: its start, which shows while the
 * agent still writes, and the rest.
 */
type ShortAnswer = { start: readonly Inline[]; rest: readonly Inline[] }

/** The answer of Explain, about the manual entry with no match. */
const explainAnswer: ShortAnswer = {
  start: [
    'When the places proxy finds no address, ',
    code('useAddressAutocomplete'),
    ' returns no suggestions. The street, city, and',
  ],
  rest: [
    ' postcode fields then stay empty and editable, so you type the address yourself, as before this change.',
  ],
}

/** The answer of Ask, to the question of Cal about the city. */
const askAnswer: ShortAnswer = {
  start: [
    'No. The old postcode lookup filled the city from the postcode, and this change removed it. When the places proxy finds no match, ',
  ],
  rest: [
    code('AddressForm'),
    ' leaves the city field empty, so you type the city yourself.',
  ],
}

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

/**
 * The chat of an explanation in each state, from the text of its written
 * prompt and its short answer. `queued` is the written prompt while the
 * sandbox starts, which waits in the queue.
 */
function chatsOf(promptText: string, short: ShortAnswer) {
  const prompt: ChatItem = { kind: 'user', id: promptId, text: promptText }
  const queued: ChatItem = { ...prompt, queued: true }
  const answer = agent('explain-answer', ...short.start, ...short.rest)
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
  const stages = {
    working: [prompt, working('3s')],
    answering: [
      prompt,
      readHook,
      readForm,
      agent('explain-answer', ...short.start),
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
  return { queued, stages }
}

/** The chats of an explanation: its queued first message, and each state. */
export type ExplanationChats = ReturnType<typeof chatsOf>

/** The explanation of `count`, which Cal started with Explain. */
const explainChats = chatsOf(writtenPrompt(), explainAnswer)

/** The explanation of `question`, which Cal started with Ask. */
const askChats = chatsOf(askPrompt(), askAnswer)

/** The chats of an explanation of Cal about the line of `count`. */
export function explanationChatsOf(explanation: Explanation): ExplanationChats {
  return explanation === explanations.question ? askChats : explainChats
}

/** The keys of the chats of explanations, for the workspace state. */
export const explanationConversationKeys = [
  'explanation',
  'ask-explanation',
] as const

/**
 * The chats of the explanations of Cal after their answers, which show in
 * their tabs, with the written prompt as the first message: the one that
 * Explain started, and the one that Ask started.
 */
export const explanationConversations = {
  explanation: explainChats.stages.answered,
  'ask-explanation': askChats.stages.answered,
} as const satisfies Record<
  (typeof explanationConversationKeys)[number],
  readonly ChatItem[]
>
