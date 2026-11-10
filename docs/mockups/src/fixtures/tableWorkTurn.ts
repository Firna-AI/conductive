import type { ChatItem } from './conversations'

/** A run of the end-to-end tests with a number of workers. */
function workersRun(workers: number): ChatItem {
  return {
    kind: 'tool',
    id: `workers-${workers}`,
    tool: 'run',
    target: `npx playwright test --workers=${workers}`,
    detail: '21 passed',
    status: 'done',
  }
}

/**
 * A finished turn whose work holds two messages with tables, before the
 * answer. Both messages fold with the work.
 */
export const tablesInWork: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-parallel',
    text: 'Can the end-to-end tests run in parallel here? They take 9 minutes.',
  },
  {
    kind: 'agent',
    id: 'plan-machine',
    blocks: ["I'll check the machine first."],
  },
  {
    kind: 'tool',
    id: 'machine',
    tool: 'run',
    target: 'nproc && free -h && df -h /home',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'free-resources',
    blocks: [
      'The machine has room for more workers:',
      {
        kind: 'table',
        align: [null, null],
        head: ['Resource', 'Free'],
        rows: [
          ['CPU', '4 vCPUs'],
          ['Memory', '6.0 GiB'],
          ['Disk (`/home`)', '54 GiB'],
        ],
      },
    ],
  },
  workersRun(2),
  workersRun(3),
  workersRun(4),
  {
    kind: 'agent',
    id: 'timings',
    blocks: [
      'All three runs pass, and 4 workers is the fastest:',
      {
        kind: 'table',
        align: ['right', 'right', 'right'],
        head: ['Workers', 'Time', 'Peak memory'],
        rows: [
          ['2', '5m 12s', '2.6 GiB'],
          ['3', '3m 58s', '3.8 GiB'],
          ['4', '3m 10s', '4.9 GiB'],
        ],
      },
    ],
  },
  {
    kind: 'tool',
    id: 'ci',
    tool: 'read',
    target: '.github/workflows/ci.yml',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'parallel-done',
    blocks: [
      'Yes. Run them with `--workers=4` here: they take 3m 10s in place of 9 minutes, and memory stays under 5 GiB. CI sets its own number of workers, so I left `.github/workflows/ci.yml` as it is.',
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '12m 47s', files: [] },
]
