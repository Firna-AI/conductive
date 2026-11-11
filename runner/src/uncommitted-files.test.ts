import { expect, it } from 'vitest'

import { runnerHarness } from '../test-support/harness'

it('reports dirty files restored to the base and publishes a count-only clean update', async () => {
  const h = await runnerHarness()
  const reports = () =>
    h.endpoint.events.flatMap(({ event }) =>
      event.type === 'changes.updated' ? [event.changes] : [],
    )
  expect(reports().at(-1)).toMatchObject({ uncommittedFileCount: 0 })
  await h.write('README.md', 'pushed branch content\n')
  await h.git('add', 'README.md')
  await h.git('commit', '-m', 'Pushed branch change')
  await h.git('update-ref', 'refs/remotes/origin/task', 'HEAD')
  await h.write('README.md', 'first\nsame\n')
  await h.runner.files.refresh()
  expect(reports().at(-1)).toEqual({
    baseBranch: 'main',
    unpushedCommits: 0,
    uncommittedFileCount: 1,
    files: [],
    summary: { files: 0, added: 0, removed: 0 },
  })
  const count = reports().length
  await h.git('add', 'README.md')
  await h.git('commit', '-m', 'Pushed restoration')
  await h.git('update-ref', 'refs/remotes/origin/task', 'HEAD')
  await h.runner.files.refresh()
  expect(reports()).toHaveLength(count + 1)
  expect(reports().at(-1)).toEqual({
    baseBranch: 'main',
    unpushedCommits: 0,
    uncommittedFileCount: 0,
    files: [],
    summary: { files: 0, added: 0, removed: 0 },
  })
})
