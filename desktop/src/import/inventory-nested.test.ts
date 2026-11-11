import { lstat, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { expect, it, vi } from 'vitest'
import * as gitCommands from './git.ts'
import { sourceHashes } from '../../tests/import-fixture.ts'
import { sourceInventory } from './inventory.ts'
import { readSource } from './source.ts'
import { packageFixture, signal } from './package-test-support.ts'

it('keeps nested working files and ignore rules for untracked and staged embedded repositories', async () => {
  const f = await packageFixture()
  const check = vi.spyOn(gitCommands, 'ignoredSourcePaths')
  const excludes = vi.spyOn(gitCommands, 'userExcludesFile')
  try {
    await f.write('.context/removed.txt', 'committed context\n')
    await f.commit('Tracked context fixture')
    await rm(join(f.workspace, '.context/removed.txt'))
    await f.write('ordinary.txt', 'ordinary\n')
    await sourceInventory(f.locations, readSource(f.locations)[0], signal())
    expect(check).toHaveBeenCalledTimes(0)
    expect(excludes).toHaveBeenCalledTimes(1)
    await f.write('.gitignore', 'nested/outer.env\n.context/\n')
    const local = resolve(
      f.workspace,
      await f.git('rev-parse', '--git-path', 'info/exclude'),
    )
    await mkdir(dirname(local), { recursive: true })
    await writeFile(local, '/nested/repo.env\n')
    const user = join(f.locations.xdgConfigHome, 'git/ignore')
    await mkdir(dirname(user), { recursive: true })
    await writeFile(user, 'nested/user.env\n')
    await f.write('nested/plain.txt', 'raw\r\n')
    await f.write('nested/run.sh', '#!/bin/sh\n', 0o755)
    await f.write('nested/.gitignore', 'inner.env\n')
    await f.write('nested/outer.env', 'outer hidden\n')
    await f.write('nested/repo.env', 'repository hidden\n')
    await f.write('nested/user.env', 'user hidden\n')
    await f.write('nested/inner.env', 'inner hidden\n')
    await f.write('nested/local.env', 'nested local hidden\n')
    await f.write('.context/always.env', 'explicit context\n')
    await f.write('.context/.git', 'not imported\n')
    await mkdir(join(f.workspace, 'nested/empty'), { mode: 0o750 })
    await mkdir(join(f.root, 'outside'))
    await writeFile(join(f.root, 'outside/never.txt'), 'outside\n')
    await symlink(join(f.root, 'outside'), join(f.workspace, 'nested/dir-link'))
    await symlink('plain.txt', join(f.workspace, 'nested/file-link'))
    await f.git('-C', 'nested', 'init', '--quiet', '--template=')
    await f.git('-C', 'nested', 'add', 'plain.txt')
    await f.git(
      '-C',
      'nested',
      'commit',
      '--quiet',
      '-m',
      'Synthetic nested base',
    )
    await mkdir(join(f.workspace, 'nested/.git/info'), { recursive: true })
    await writeFile(
      join(f.workspace, 'nested/.git/info/exclude'),
      '/local.env\n',
    )
    for (const form of ['untracked', 'staged'] as const) {
      if (form === 'staged') await f.git('add', '--', 'nested')
      const before = await sourceHashes(f.locations.home)
      const attempt = sourceInventory(
        f.locations,
        readSource(f.locations)[0],
        signal(),
      )
      await expect(attempt, form).resolves.toMatchObject({
        files: expect.any(Array),
      })
      const captured = await attempt
      expect(
        captured.files.map((file) => [file.kind, file.path, file.mode]),
        form,
      ).toEqual([
        ['directory', '.context', 0o755],
        ['file', '.context/always.env', 0o644],
        ['delete', '.context/removed.txt', 0],
        ['file', '.gitignore', 0o644],
        ['directory', 'nested', 0o755],
        ['file', 'nested/.gitignore', 0o644],
        ['symlink', 'nested/dir-link', 0o777],
        ['directory', 'nested/empty', 0o750],
        ['symlink', 'nested/file-link', 0o777],
        ['file', 'nested/plain.txt', 0o644],
        ['file', 'nested/run.sh', 0o755],
        ['file', 'ordinary.txt', 0o644],
      ])
      expect(
        captured.files
          .filter((file) => file.kind === 'symlink')
          .map((file) => file.target),
        form,
      ).toEqual([join(f.root, 'outside'), 'plain.txt'])
      expect(await sourceHashes(f.locations.home), form).toEqual(before)
    }
    expect(check.mock.calls.map(([cwd]) => cwd)).toEqual([
      f.workspace,
      join(f.workspace, 'nested'),
      f.workspace,
      join(f.workspace, 'nested'),
    ])
    expect(
      await Promise.all(
        check.mock.results.map(async (result) =>
          [...(await result.value)].sort(),
        ),
      ),
    ).toEqual([
      [
        'nested/inner.env',
        'nested/outer.env',
        'nested/repo.env',
        'nested/user.env',
      ],
      ['inner.env', 'local.env'],
      [
        'nested/inner.env',
        'nested/outer.env',
        'nested/repo.env',
        'nested/user.env',
      ],
      ['inner.env', 'local.env'],
    ])
    for (const [, , , index] of check.mock.calls)
      await expect(lstat(index)).rejects.toMatchObject({ code: 'ENOENT' })
  } finally {
    check.mockRestore()
    excludes.mockRestore()
    await f.dispose()
  }
})
