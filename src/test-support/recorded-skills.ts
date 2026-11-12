import type { ChatEvent, ToolCall } from '../shared/chat-events'
import type { ChangedFile } from '../shared/files'
import type { UserMessage } from '../shared/messages'
import { FAKE_IDS, FAKE_TIME } from './fixtures/core'
import { workspaceFixtures } from './fixtures/workspaces'

const { message } = workspaceFixtures()

/** A tool call that the runner finished. */
function call(
  id: string,
  kind: ToolCall['kind'],
  target: string,
  detail: string | null = null,
): ToolCall {
  return { id, kind, target, detail, omittedDetailBytes: 0, state: 'done' }
}

/**
 * A call of the `Skill` tool of Claude, as the runner gives it: the call
 * keeps the kind `other`, its target holds the skill name, and its detail
 * holds the arguments.
 */
function claudeSkill(
  id: string,
  name: string,
  args: string | null = null,
): ToolCall {
  return { ...call(id, 'other', name, args), skills: [name] }
}

const running = (tool: ToolCall): ToolCall => ({ ...tool, state: 'running' })

/** The events of one turn of the open session, from its message to its end. */
function turnOf(turnId: string, ask: UserMessage, startedAt: number) {
  const at = { sessionId: FAKE_IDS.session, turnId }
  const update = (tool: ToolCall): ChatEvent => ({
    ...at,
    type: 'tool.updated',
    tool,
  })
  return {
    start: (): ChatEvent[] => [
      { type: 'message.accepted', message: ask },
      {
        ...at,
        type: 'turn.started',
        senderId: ask.sender.id,
        choice: ask.choice,
        startedAt,
        messageIds: [ask.id],
      },
      { ...at, type: 'turn.thinking' },
    ],
    said: (
      messageId: string,
      text: string,
      answers: readonly string[] = [],
    ): ChatEvent => ({
      ...at,
      type: 'assistant.completed',
      messageId,
      text,
      userMessageIds: answers,
    }),
    /** A finished call. A skill call shows as running first. */
    tool: (tool: ToolCall): ChatEvent[] =>
      tool.skills ? [update(running(tool)), update(tool)] : [update(tool)],
    running: (tool: ToolCall): ChatEvent => update(running(tool)),
    end: (files: readonly ChangedFile[], durationMs: number): ChatEvent => ({
      ...at,
      type: 'turn.completed',
      state: 'finished',
      durationMs,
      files,
      omittedFileCount: 0,
      userMessageIds: [ask.id],
    }),
  }
}

const form = 'src/app/checkout/AddressForm.tsx'
const formTest = 'tests/checkout/address.test.ts'
const first = turnOf(
  'turn-0',
  { ...message, createdAt: FAKE_TIME - 600_000 },
  FAKE_TIME - 600_000,
)
const second = turnOf(
  'turn-1',
  {
    ...message,
    id: 'ask-saved',
    text: 'Now add saved addresses to the account page.',
  },
  FAKE_TIME,
)

/**
 * A Claude session whose agent uses skills. The first turn finished: it used
 * `brainstorming` with the arguments `high`, and `testing` with none, so the
 * line of its work fold names both. The second turn runs: its first run used
 * `brainstorming` and folded, and its open run shows the running skill line
 * of `plans`, whose long arguments a narrow chat cuts.
 */
export const skillChat: readonly ChatEvent[] = [
  ...first.start(),
  first.said(
    'plan-0',
    "I'll start with the checkout form and the places proxy.",
  ),
  ...first.tool(claudeSkill('skill-brainstorming', 'brainstorming', 'high')),
  ...first.tool(call('read-form', 'read', form)),
  ...first.tool(call('search-places', 'search', 'usePlaces', '2 results')),
  first.said(
    'progress-0',
    'The proxy already returns predictions, so the work is in the form.',
  ),
  ...first.tool(call('edit-form', 'edit', form, '+38 −6')),
  ...first.tool(claudeSkill('skill-testing', 'testing')),
  ...first.tool(call('create-test', 'create', formTest, '+52')),
  ...first.tool(call('unit', 'run', 'npm test -- checkout', '14 passed')),
  first.said(
    'answer-0',
    'The form now suggests addresses as you type, and the manual fields stay as a fallback. All 14 tests pass.',
    [message.id],
  ),
  first.end(
    [
      { path: form, change: 'modified', added: 38, removed: 6 },
      { path: formTest, change: 'added', added: 52, removed: 0 },
    ],
    252_000,
  ),
  ...second.start(),
  second.said('plan-1', "I'll compare the options first."),
  ...second.tool(claudeSkill('skill-options', 'brainstorming', 'high')),
  ...second.tool(call('read-book', 'read', 'src/app/account/AddressBook.tsx')),
  ...second.tool(call('search-saved', 'search', 'savedAddresses', '3 results')),
  second.said(
    'progress-1',
    "A list on the account page fits best. I'll write the plan, then the code.",
  ),
  second.running(
    claudeSkill(
      'skill-plans',
      'plans',
      'saved addresses on the account page, newest first',
    ),
  ),
]
