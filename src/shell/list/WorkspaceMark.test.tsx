import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { WorkspaceMark } from '../../ui/components/workspaces/WorkspaceMark'
import styles from '../../ui/components/workspaces/WorkspaceMark.module.css'
import type { GitHubSummary } from '../../shared/generated/GitHubSummary'
import type { ActivityStatus } from '../../ui/components/workspaces/activityStatus'

/** The classes of the nine cells of a mark, row by row from the top left. */
function cellClasses(
  github: GitHubSummary | null,
  status: ActivityStatus,
  messageWaiting?: boolean,
): string[][] {
  const html = renderToStaticMarkup(
    <WorkspaceMark
      github={github}
      messageWaiting={messageWaiting}
      status={status}
    />,
  )
  // The grid puts `aria-hidden` before its class, so only the cells match.
  const cells = [...html.matchAll(/<span class="([^"]*)"/g)]
  expect(cells).toHaveLength(9)
  return cells.map((match) => match[1].split(' '))
}

/** How many cells of a mark carry a class. */
function count(cells: string[][], className: string): number {
  return cells.filter((cell) => cell.includes(className)).length
}

describe('WorkspaceMark', () => {
  test('runs a light around the ring while the agent works', () => {
    const cells = cellClasses('ready-to-merge', 'working')
    expect(count(cells, styles.chase)).toBe(8)
    expect(cells[4]).not.toContain(styles.chase)
    expect(cells[4]).not.toContain(styles.litWhenStill)
  })

  test.each([null, 'ready-to-merge'] as const)(
    'runs a light around the ring while a message waits for the start, with %s',
    (github) => {
      const cells = cellClasses(github, 'starting', true)
      expect(count(cells, styles.chase)).toBe(8)
      expect(cells[4]).not.toContain(styles.chase)
      // Without motion, the start shows the ring of a working agent: the ring
      // stays lit and the centre stays dim. So it does not match the full
      // grid of a ready pull request or of a draft.
      expect(count(cells, styles.lit)).toBe(8)
      expect(cells[4]).not.toContain(styles.litWhenStill)
    },
  )

  test.each([
    [null, 0],
    ['ready-to-merge', 9],
  ] as const)(
    'stays still while the cloud computer starts and no message waits, with %s',
    (github, lit) => {
      for (const messageWaiting of [false, undefined]) {
        const cells = cellClasses(github, 'starting', messageWaiting)
        expect(count(cells, styles.chase)).toBe(0)
        expect(count(cells, styles.lit)).toBe(lit)
      }
    },
  )

  test.each(['ready', 'unread', 'stopped', 'starting'] as const)(
    'runs a light around the ring while the checks run and the agent is %s',
    (status) => {
      const cells = cellClasses('checks-running', status)
      expect(count(cells, styles.chase)).toBe(8)
      expect(cells[4]).not.toContain(styles.chase)
      expect(cells[4]).toContain(styles.litWhenStill)
    },
  )

  test('pulses while the agent needs input, also while the checks run', () => {
    const cells = cellClasses('checks-running', 'input')
    expect(count(cells, styles.pulse)).toBe(9)
    expect(count(cells, styles.chase)).toBe(0)
  })

  test.each([null, 'checks-failed', 'ready-to-merge', 'merged'] as const)(
    'turns blue while the agent needs input, whatever the GitHub state %s',
    (github) => {
      const html = renderToStaticMarkup(
        <WorkspaceMark github={github} status="input" />,
      )
      expect(html).toContain(styles.input)
      for (const tone of [
        styles.none,
        styles.danger,
        styles.success,
        styles.merged,
      ]) {
        expect(html).not.toContain(tone)
      }
    },
  )

  test('keeps the mark still for other GitHub states and for an archive', () => {
    expect(count(cellClasses('ready-to-merge', 'ready'), styles.chase)).toBe(0)
    expect(count(cellClasses(null, 'ready'), styles.chase)).toBe(0)
    expect(count(cellClasses('checks-running', 'archived'), styles.chase)).toBe(
      0,
    )
  })

  test.each([
    ['checks-running', styles.neutral],
    ['checks-failed', styles.danger],
    ['ready-to-merge', styles.success],
    ['merged', styles.merged],
    ['conflict', styles.warning],
    ['changes-requested', styles.warning],
    ['draft', styles.neutral],
    ['blocked', styles.warning],
  ] as const)('gives %s the tone of the pull request bar', (github, tone) => {
    const html = renderToStaticMarkup(
      <WorkspaceMark github={github} status="ready" />,
    )
    expect(html).toContain(tone)
  })
})
