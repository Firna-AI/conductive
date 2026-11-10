import { expect, it, vi } from 'vitest'

import type { RunnerTurn } from '../../src/shared/runner'
import { turn } from '../test-support/harness'
import { parseWorkspaceMessage } from './commands'

it('keeps the supplied commit author only on a turn command', () => {
  const command = turn()
  command.commitAuthor = {
    name: 'Alice Example',
    email: '1+alice@users.noreply.github.com',
  }
  const warn = vi.fn()
  expect(parseWorkspaceMessage(command, warn)).toMatchObject({
    type: 'turn',
    commitAuthor: {
      name: 'Alice Example',
      email: '1+alice@users.noreply.github.com',
    },
  })
  expect(
    parseWorkspaceMessage({ ...command, type: 'message' }, warn),
  ).not.toHaveProperty('commitAuthor')
})

it.each(['missing', 'null'])(
  'keeps a turn with a %s commit author and no warning',
  (kind) => {
    const command: Partial<RunnerTurn> = turn()
    if (kind === 'missing') delete command.commitAuthor
    const warn = vi.fn()
    expect(parseWorkspaceMessage(command, warn)).toMatchObject({
      type: 'turn',
      commitAuthor: null,
    })
    expect(warn).not.toHaveBeenCalled()
  },
)

it.each([
  { kind: 'text', value: 'not an author' },
  { kind: 'missing email', value: { name: 'Alice Example' } },
  {
    kind: 'non-string name',
    value: { name: 1, email: '1+alice@users.noreply.github.com' },
  },
  { kind: 'non-string email', value: { name: 'Alice Example', email: 1 } },
])('continues a turn and warns for a $kind commit author', ({ value }) => {
  const warn = vi.fn()
  expect(
    parseWorkspaceMessage({ ...turn(), commitAuthor: value }, warn),
  ).toMatchObject({ type: 'turn', commitAuthor: null })
  expect(warn.mock.calls).toEqual([
    ['The turn commit author is invalid. The sandbox author will be used.'],
  ])
})
