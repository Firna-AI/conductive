import { readFile, readlink, rename } from 'node:fs/promises'
import { join } from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

import { skillsFixture } from '../test-support/skills-repository'

afterEach(() => vi.restoreAllMocks())

it('copies only the skill folders selected by the shared rule and warns about duplicates', async () => {
  const h = await skillsFixture()
  await h.skill('skills/.curated/alpha', 'alpha', 'First in path order')
  await h.skill('skills/.system/alpha', 'alpha', 'Duplicate')
  await h.skill('skills/.system/.hidden', 'hidden')
  await h.skill('skills/outer', 'outer')
  await h.skill('skills/outer/nested', 'nested')
  await h.skill('outside', 'outside')
  await h.write('hooks/hooks.json', '{"hooks":{}}')
  await h.write('.mcp.json', '{"mcpServers":{}}')
  await h.publish()
  const copy = h.create()
  await copy.refresh()
  expect(copy.folders.map((skill) => skill.name)).toEqual([
    '.hidden',
    'alpha',
    'outer',
  ])
  expect(
    await readFile(join(copy.folders[1].path, 'SKILL.md'), 'utf8'),
  ).toContain('First in path order')
  expect(h.warnings).toEqual([
    'The org skill alpha uses skills/.curated/alpha. The duplicate skills/.system/alpha will not load.',
  ])
  expect(
    await readlink(join(h.home, '.conductive', 'skills', 'repository')),
  ).toContain('/org/skills/commits/')
})

it.each([
  { path: 'alpha', name: 'alpha', expected: 'alpha' },
  { path: '.', name: 'skills', expected: 'skills' },
])(
  'copies the fallback skill layout at $path',
  async ({ path, name, expected }) => {
    const h = await skillsFixture()
    await h.skill(path, name)
    await h.publish()
    const copy = h.create()
    await copy.refresh()
    expect(copy.folders.map((skill) => skill.name)).toEqual([expected])
    expect(
      await readFile(join(copy.folders[0].path, 'SKILL.md'), 'utf8'),
    ).toContain(`name: ${name}`)
    expect(h.warnings).toEqual([])
  },
)

it('updates on the interval and retains complete copies after a failed fetch and a resume', async () => {
  const h = await skillsFixture()
  await h.skill('skills/alpha', 'alpha', 'Old complete skill')
  await h.publish()
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const copy = h.create()
  copy.start()
  try {
    await copy.refresh()
    const old = copy.folders[0].path
    await h.skill('skills/alpha', 'alpha', 'New complete skill')
    await h.skill('skills/beta', 'beta')
    await h.update()
    vi.advanceTimersByTime(1000)
    await copy.refresh()
    expect(copy.folders.map((skill) => skill.name)).toEqual(['alpha', 'beta'])
    expect(copy.folders[0].path).not.toBe(old)
    expect(await readFile(join(old, 'SKILL.md'), 'utf8')).toContain(
      'Old complete skill',
    )
    expect(
      await readFile(join(copy.folders[0].path, 'SKILL.md'), 'utf8'),
    ).toContain('New complete skill')
    const good = copy.folders
    await rename(h.remote(), `${h.remote()}.offline`)
    await copy.refresh()
    expect(copy.folders).toEqual(good)
    expect(h.warnings).toHaveLength(1)
    expect(h.warnings[0]).toContain('The skills repository could not update.')
    await copy.close()
    const resumed = h.create()
    await resumed.refresh()
    expect(resumed.folders).toEqual(good)
    expect(
      await readFile(join(resumed.folders[0].path, 'SKILL.md'), 'utf8'),
    ).toContain('New complete skill')
    expect(h.warnings).toHaveLength(2)
  } finally {
    await copy.close()
    vi.useRealTimers()
  }
})

it('follows a changed default branch and permits repository names that start with a dash', async () => {
  const h = await skillsFixture()
  await h.skill('skills/alpha', 'alpha')
  await h.publish('org/-skills')
  const copy = h.create('org/-skills')
  await copy.refresh()
  expect(copy.folders.map((skill) => skill.name)).toEqual(['alpha'])
  await h.git('checkout', '-b', 'new-default')
  await h.skill('skills/beta', 'beta')
  await h.git('add', '.')
  await h.git('commit', '-m', 'new default')
  await h.git(
    'push',
    '--',
    h.remote('org/-skills'),
    'HEAD:refs/heads/new-default',
  )
  await h.git(
    '--git-dir',
    h.remote('org/-skills'),
    'symbolic-ref',
    'HEAD',
    'refs/heads/new-default',
  )
  await copy.refresh()
  expect(copy.folders.map((skill) => skill.name)).toEqual(['alpha', 'beta'])
  await h.git(
    '--git-dir',
    h.remote('org/-skills'),
    'symbolic-ref',
    'HEAD',
    'refs/heads/task',
  )
  await copy.refresh()
  expect(copy.folders.map((skill) => skill.name)).toEqual(['alpha'])
  expect(h.warnings).toEqual([])
})
