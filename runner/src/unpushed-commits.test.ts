import { expect, it } from 'vitest'

import { runnerHarness } from '../test-support/harness'

it('reports current-branch commits missing from every remote branch, including count-only changes', async () => {
  const h = await runnerHarness()
  const reports = () =>
    h.endpoint.events.flatMap(({ event }) =>
      event.type === 'changes.updated' ? [event.changes] : [],
    )
  expect(reports().at(-1)).toMatchObject({ unpushedCommits: 0 })

  await h.git('commit', '--allow-empty', '-m', 'first local commit')
  await h.git('update-ref', 'refs/remotes/backup/other', 'HEAD')
  await h.git('commit', '--allow-empty', '-m', 'second local commit')
  await h.git('checkout', '-b', 'other-local-branch')
  await h.git('commit', '--allow-empty', '-m', 'other branch work')
  await h.git('checkout', 'task')
  await h.runner.files.refresh()
  expect(reports().at(-1)).toMatchObject({
    unpushedCommits: 1,
    files: [],
    summary: { files: 0, added: 0, removed: 0 },
  })

  const beforePush = reports().length
  await h.git('update-ref', 'refs/remotes/origin/task', 'HEAD')
  await h.runner.files.refresh()
  expect(reports()).toHaveLength(beforePush + 1)
  expect(reports().at(-1)).toMatchObject({ unpushedCommits: 0 })

  await h.git('update-ref', '-d', 'refs/remotes/origin/main')
  await h.git('update-ref', '-d', 'refs/remotes/origin/task')
  await h.git('update-ref', '-d', 'refs/remotes/backup/other')
  await h.runner.files.refresh()
  expect(reports().at(-1)).toMatchObject({ unpushedCommits: 3 })
})
