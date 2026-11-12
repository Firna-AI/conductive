import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { WorkspaceMark } from '../../../docs/mockups/src/components/workspaces/WorkspaceMark'
import styles from '../../../docs/mockups/src/components/workspaces/WorkspaceMark.module.css'
import type { GitHubSummary } from '../../../docs/mockups/src/fixtures/pullRequests'
import type { ActivityStatus } from '../../../docs/mockups/src/fixtures/workspaces'

/** The classes of the nine cells of a mark, row by row from the top left. */
function cellClasses(
  github: GitHubSummary | null,
  status: ActivityStatus,
): string[][] {
  const html = renderToStaticMarkup(
    <WorkspaceMark github={github} status={status} />,
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
    const cells = cellClasses('checks-passed', 'working')
    expect(count(cells, styles.chase)).toBe(8)
    expect(cells[4]).not.toContain(styles.chase)
    expect(cells[4]).not.toContain(styles.litWhenStill)
  })

  test.each(['ready', 'unread', 'stopped'] as const)(
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

  test('keeps the mark still for other GitHub states and for an archive', () => {
    expect(count(cellClasses('checks-passed', 'ready'), styles.chase)).toBe(0)
    expect(count(cellClasses(null, 'ready'), styles.chase)).toBe(0)
    expect(count(cellClasses('checks-running', 'archived'), styles.chase)).toBe(
      0,
    )
  })
})
