import type { ChatItem } from './conversations'
import { iconFiles } from './iconFiles'

const suiteAsk: ChatItem = {
  kind: 'user',
  id: 'ask-suite',
  text: 'Run the whole test suite before we merge.',
}

const suiteRuns: readonly ChatItem[] = [
  {
    kind: 'tool',
    id: 'lint',
    tool: 'run',
    target: 'npm run lint',
    detail: 'passed',
    status: 'done',
  },
  {
    kind: 'tool',
    id: 'suite',
    tool: 'run',
    target: 'npm test',
    detail: '312 passed',
    omittedDetailBytes: 1_240_000,
    status: 'done',
  },
]

const e2eSuite = {
  kind: 'tool',
  id: 'e2e-suite',
  tool: 'run',
  target: 'npx playwright test',
} as const

/** A second turn runs the tests, whose output the runner shortened. */
function suiteTurn(history: readonly ChatItem[]): readonly ChatItem[] {
  return [
    ...history,
    suiteAsk,
    ...suiteRuns,
    { ...e2eSuite, detail: '18 passed', status: 'done' },
    {
      kind: 'agent',
      id: 'suite-done',
      paragraphs: ['All 312 unit tests and 18 end-to-end tests pass.'],
    },
    { kind: 'turn-end', id: 'suite-end', duration: '3m 06s', files: [] },
  ]
}

/** The same turn while its end-to-end tests still run. */
function suiteRunning(history: readonly ChatItem[]): readonly ChatItem[] {
  return [
    ...history,
    suiteAsk,
    ...suiteRuns,
    { ...e2eSuite, status: 'running' },
    { kind: 'working', id: 'working', elapsed: '1m 12s' },
  ]
}

const iconTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask',
    text: 'Move every icon import to `@acme/icons`, and remove the old icon folder.',
  },
  {
    kind: 'agent',
    id: 'plan',
    paragraphs: ["I'll run the icon codemod on the app, then build and test."],
  },
  {
    kind: 'tool',
    id: 'codemod',
    tool: 'run',
    target: 'npx @acme/icons-codemod src',
    detail: '247 files',
    status: 'done',
  },
  {
    kind: 'tool',
    id: 'build',
    tool: 'run',
    target: 'npm run build',
    detail: 'passed',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'done',
    paragraphs: [
      'Done. Every component imports its icons from `@acme/icons`, and the build passes.',
    ],
  },
  {
    kind: 'turn-end',
    id: 'turn-end',
    duration: '6m 03s',
    files: iconFiles,
    omittedFiles: 47,
  },
]

/** A turn that loses three runner events, one for each reason. */
const lostLines: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask',
    text: 'Profile the checkout page, then speed up the address lookups.',
  },
  {
    kind: 'agent',
    id: 'plan',
    paragraphs: ["I'll record a profile of the checkout page first."],
  },
  {
    kind: 'lost',
    id: 'lost-profile',
    what: 'tool-update',
    reason: 'too_large',
  },
  {
    kind: 'agent',
    id: 'debounce',
    paragraphs: [
      'The profile shows a lookup on each key press, so I debounced the lookups in `useAddressAutocomplete`.',
    ],
  },
  {
    kind: 'tool',
    id: 'edit-hook',
    tool: 'edit',
    target: 'src/app/checkout/useAddressAutocomplete.ts',
    detail: '+9 −2',
    status: 'done',
  },
  { kind: 'lost', id: 'lost-reply', what: 'reply-part', reason: 'invalid' },
  {
    kind: 'tool',
    id: 'unit',
    tool: 'run',
    target: 'npm test -- checkout',
    status: 'stopped',
  },
  { kind: 'stopped', id: 'stopped', by: 'cal', omittedFiles: 5 },
  {
    kind: 'lost',
    id: 'lost-late',
    what: 'tool-update',
    reason: 'turn_not_active',
  },
]

/**
 * The per-session chats of decision 76: tool output and turn files that the
 * runner left out, and the lines of refused runner events.
 */
export function lostConversations(history: readonly ChatItem[]) {
  return {
    'output-left-out': suiteTurn(history),
    'output-left-out-running': suiteRunning(history),
    'files-left-out': iconTurn,
    'lost-lines': lostLines,
    'lost-turn-end': [
      ...history.filter((item) => item.kind !== 'turn-end'),
      { kind: 'lost', id: 'lost-end', what: 'turn-end', reason: 'invalid' },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}

/** A lost report of Changes, an update that belongs to no session. */
export const lostChanges = {
  what: 'changes',
  reason: 'too_large',
  ago: '4m ago',
} as const

/** A lost workspace name from the agent, which belongs to no session. */
export const lostTitle = {
  what: 'title',
  reason: 'invalid',
  ago: '2m ago',
} as const
