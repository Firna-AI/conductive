import * as fs from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { expect, it, onTestFinished, vi } from 'vitest'

import { runnerHarness } from '../test-support/harness'
import { Git } from './git'
import { Runner } from './runner'

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof fs>()
  return { ...original, appendFile: vi.fn(original.appendFile) }
})

it('excludes context files before the first reports and keeps tracked and nested files visible', async () => {
  let exclude = ''
  const h = await runnerHarness(async (repository) => {
    exclude = resolve(
      repository.root,
      (await repository.git('rev-parse', '--git-path', 'info/exclude')).trim(),
    )
    await fs.writeFile(exclude, '# Keep this rule\nignored.tmp')
    await repository.write('.context/tracked.md', 'tracked\n')
    await repository.git('add', '.context/tracked.md')
    await repository.git('commit', '-m', 'keep tracked context')
    await repository.write('.context/note.md', 'private\n')
    await repository.write('nested/.context/visible.md', 'visible\n')
    await repository.write('ignored.tmp', 'ignored\n')
  })
  expect(await fs.readFile(exclude, 'utf8')).toBe(
    '# Keep this rule\nignored.tmp\n/.context/\n',
  )
  expect(await fs.readdir(join(h.root, '.context'))).toContain('attachments')
  const files = h.endpoint.runnerEvents.flatMap(({ event }) =>
    event.type === 'files.snapshot'
      ? event.tree.entries.map((entry) => entry.path)
      : [],
  )
  expect(files).toContain('.context/tracked.md')
  expect(files).toContain('nested/.context/visible.md')
  expect(files).not.toContain('.context/note.md')
  expect(files).not.toContain('ignored.tmp')
  expect(
    h.endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'changes.updated'
        ? event.changes.files.map((file) => file.path)
        : [],
    ),
  ).toEqual(['.context/tracked.md', 'nested/.context/visible.md'])
  expect(await h.git('status', '--short')).toBe('?? nested/\n')
  expect(h.warnings).toEqual([])
})

it('makes a removed context folder again without repeating its exclude rule', async () => {
  const h = await runnerHarness()
  const exclude = resolve(
    h.root,
    (await h.git('rev-parse', '--git-path', 'info/exclude')).trim(),
  )
  await h.runner.close()
  await fs.rm(join(h.root, '.context'), { recursive: true, force: true })
  const restarted = new Runner(h.options)
  onTestFinished(() => restarted.close())
  await restarted.start(false)
  expect(await fs.readdir(h.root)).toContain('.context')
  expect(await fs.readdir(join(h.root, '.context'))).toEqual(['attachments'])
  expect(
    (await fs.readFile(exclude, 'utf8'))
      .split(/\r?\n/u)
      .filter((line) => line === '/.context/'),
  ).toEqual(['/.context/'])
  expect(h.warnings).toEqual([])
})

it('prepares the context folder in a linked Git worktree', async () => {
  const h = await runnerHarness()
  await h.runner.close()
  const linked = join(h.home, 'linked')
  await h.git('worktree', 'add', '-b', 'linked-task', linked, 'main')
  const runner = new Runner({ ...h.options, cwd: linked })
  onTestFinished(() => runner.close())
  await runner.start(false)
  expect(await fs.readdir(linked)).toContain('.context')
  expect(await fs.readdir(join(linked, '.context'))).toEqual(['attachments'])
  expect((await fs.lstat(join(linked, '.git'))).isFile()).toBe(true)
  const exclude = resolve(
    linked,
    (await new Git(linked).run(['rev-parse', '--git-path', 'info/exclude']))
      .toString('utf8')
      .trim(),
  )
  expect(
    (await fs.readFile(exclude, 'utf8'))
      .split(/\r?\n/u)
      .filter((line) => line === '/.context/'),
  ).toEqual(['/.context/'])
  expect(h.warnings).toEqual([])
})

it.each(['file', 'link'] as const)(
  'leaves a %s named .context alone and continues startup',
  async (kind) => {
    const h = await runnerHarness(async ({ root, home }) => {
      if (kind === 'file') await fs.writeFile(join(root, '.context'), 'keep\n')
      else {
        await fs.mkdir(join(home, 'outside'))
        await fs.writeFile(join(home, 'outside/kept.md'), 'keep\n')
        await fs.symlink(join(home, 'outside'), join(root, '.context'))
      }
    })
    const context = await fs.lstat(join(h.root, '.context'))
    expect(kind === 'file' ? context.isFile() : context.isSymbolicLink()).toBe(
      true,
    )
    expect(
      await fs.readFile(
        kind === 'file'
          ? join(h.root, '.context')
          : join(h.home, 'outside/kept.md'),
        'utf8',
      ),
    ).toBe('keep\n')
    expect(await fs.readdir(h.home)).not.toContain('attachments')
    const outsideEntries =
      kind === 'link' ? await fs.readdir(join(h.home, 'outside')) : []
    expect(outsideEntries).toEqual(kind === 'link' ? ['kept.md'] : [])
    expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
      type: 'runner.ready',
    })
    expect(h.warnings).toEqual([
      'The context folder is a file or a link. The runner will continue.',
    ])
  },
)

it('warns after an exclude write failure and continues startup', async () => {
  const append = vi
    .mocked(fs.appendFile)
    .mockRejectedValueOnce(
      new Error('The local exclude file cannot be written.'),
    )
  onTestFinished(() => {
    append.mockReset()
  })
  const h = await runnerHarness()
  expect(h.warnings).toEqual([
    'The context folder could not be prepared. The runner will continue.',
  ])
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'runner.ready',
  })
})
