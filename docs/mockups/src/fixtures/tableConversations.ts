import { code, inline, p, table, type Inline } from './agentText'
import type { ChatItem } from './conversations'
import { tableLineBreaks } from './tableBreakTurn'
import { tablesInWork } from './tableWorkTurn'

/**
 * Replies with Markdown tables: the resources of the cloud computer, also
 * while the agent writes them, a short row, a wide table, cells with line
 * breaks, and the tables among the work of a turn.
 */

const machineQuestion: ChatItem = {
  kind: 'user',
  id: 'ask-machine',
  text: 'What size machine are you running on?',
}

const machineCheck: ChatItem = {
  kind: 'tool',
  id: 'machine',
  tool: 'run',
  target: 'lscpu && free -h && df -h /home',
  status: 'done',
}

const machineIntro = p(
  'I run in a KVM virtual machine with 4 vCPUs, 7.8 GiB of RAM, and a 79 GiB disk.',
)

/** The resources of the cloud computer, as the agent reports them. */
const resources = table(
  [null, null],
  ['Resource', 'Value'],
  [
    ['Virtualization', 'KVM virtual machine'],
    ['CPU', '4 vCPUs, 1 thread per core, AMD Ryzen 7 9700X'],
    ['Memory', '7.8 GiB total, about 6.0 GiB available, plus 2.0 GiB swap'],
    [['Disk (', code('/home'), ')'], '79 GiB total, 54 GiB free'],
    ['OS', 'Linux 6.8.0-117-generic'],
  ],
)

/** The items of a turn that still runs, then its working line. */
function writing(items: ChatItem[], elapsed: string): ChatItem[] {
  return [...items, { kind: 'working', id: 'working', elapsed }]
}

const machineTurn: readonly ChatItem[] = [
  machineQuestion,
  machineCheck,
  {
    kind: 'agent',
    id: 'machine-answer',
    blocks: [
      machineIntro,
      resources,
      p(
        'The host has 8 cores, and this machine gets 4 of them. That is enough for ',
        code('npm run build'),
        ' and the unit tests. The end-to-end tests run slower on 4 cores.',
      ),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '11s', files: [] },
]

const bundleTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-bundles',
    text: 'How much does the autocomplete add to the bundles?',
  },
  {
    kind: 'tool',
    id: 'build-main',
    tool: 'run',
    target: 'git switch main && npm run build',
    status: 'done',
  },
  {
    kind: 'tool',
    id: 'build-branch',
    tool: 'run',
    target: 'git switch - && npm run build',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'bundles',
    blocks: [
      p(
        'The checkout page grows by 7 KB. The places proxy runs on the server, so the browser never loads it.',
      ),
      table(
        [null, 'right', 'right', 'right'],
        ['Bundle', 'Main', 'This branch', 'Change'],
        [
          [code('checkout'), '182 KB', '189 KB', '+7 KB'],
          [code('account'), '96 KB', '96 KB', '0 KB'],
          [code('api/places'), 'Server only'],
        ],
      ),
      p(
        'The 7 KB is the ',
        code('useAddressAutocomplete'),
        ' hook and the list of suggestions.',
      ),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '1m 52s', files: [] },
]

/** The browser projects of the end-to-end tests. */
const browsers = [
  'Chromium',
  'Firefox',
  'WebKit',
  'Edge',
  'Android',
  'iPhone',
  'iPad',
]

/** A test that passed in every browser project. */
function passedRow(test: string, retries: string, time: string): Inline[] {
  return [code(test), ...browsers.map(() => 'Passed'), retries, time]
}

const browserTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-browsers',
    text: 'Do the end-to-end tests pass in every browser?',
  },
  {
    kind: 'tool',
    id: 'e2e',
    tool: 'run',
    target: 'npx playwright test checkout.spec.ts',
    detail: '21 passed',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'browsers',
    blocks: [
      p(
        'Yes. All 21 runs pass. One WebKit run passed on its second try, because a suggestion came late.',
      ),
      table(
        [null, ...browsers.map(() => 'center' as const), 'right', 'right'],
        ['Test', ...browsers, 'Retries', 'Time'],
        [
          passedRow('checkout.spec.ts:14', '0', '41s'),
          passedRow('checkout.spec.ts:38', '1', '52s'),
          passedRow('checkout.spec.ts:61', '0', '23s'),
        ],
      ),
      p('The retry was in the test that fills the address from a suggestion.'),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '3m 26s', files: [] },
]

/**
 * The chats of the table pages. The resource table shows finished, before
 * its separator row arrives, and with its first rows while the agent still
 * writes.
 */
export const tableConversations = {
  'table-resources': machineTurn,
  'table-header': writing(
    [
      machineQuestion,
      machineCheck,
      {
        kind: 'agent',
        id: 'machine-answer',
        blocks: [machineIntro, p('| Resource | Value |')],
      },
    ],
    '6s',
  ),
  'table-rows': writing(
    [
      machineQuestion,
      machineCheck,
      {
        kind: 'agent',
        id: 'machine-answer',
        blocks: [
          machineIntro,
          {
            ...resources,
            rows: [
              ...resources.rows.slice(0, 2),
              [inline('Memory'), inline('7.8 GiB total, about 6.0 GiB')],
            ],
          },
        ],
      },
    ],
    '8s',
  ),
  'table-short-row': bundleTurn,
  'table-wide': browserTurn,
  'table-line-breaks': tableLineBreaks,
  'tables-in-work': tablesInWork,
} as const satisfies Record<string, readonly ChatItem[]>
