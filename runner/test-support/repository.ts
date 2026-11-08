import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { onTestFinished } from 'vitest'

const execute = promisify(execFile)

export async function repositoryFixture() {
  const home = await mkdtemp(join(tmpdir(), 'conductive-runner-'))
  const root = join(home, 'repository')
  await mkdir(root)
  const git = async (...args: string[]) =>
    (
      await execute('git', args, {
        cwd: root,
        env: {
          ...process.env,
          TZ: 'UTC',
          LC_ALL: 'C',
          GIT_AUTHOR_DATE: '2026-11-06T00:00:00Z',
          GIT_COMMITTER_DATE: '2026-11-06T00:00:00Z',
        },
      })
    ).stdout
  const write = async (path: string, content: string | Buffer) => {
    const full = join(root, path)
    await mkdir(join(full, '..'), { recursive: true })
    await writeFile(full, content)
  }
  await git('init', '-b', 'main')
  await git('config', 'user.name', 'Runner Test')
  await git('config', 'user.email', 'runner@example.test')
  await write('README.md', 'first\nsame\n')
  await write('committed.txt', 'base\n')
  await write('rename me.txt', 'keep\nthese\nlines\n')
  await write('a[1].txt', 'bracket old\n')
  await write('a1.txt', 'plain old\n')
  await git('add', '.')
  await git('commit', '-m', 'base')
  await git('checkout', '-b', 'task')
  onTestFinished(() => rm(home, { recursive: true, force: true }))
  return { home, root, git, write }
}
