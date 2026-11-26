import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { scannerFixture, skillText } from '../test-support/skills'
import * as skillFiles from './skill-files'

it('reads changed skill files and reuses the Codex app-server list until a forced reload', async () => {
  const h = await scannerFixture()
  const path = '.claude/skills/plans/SKILL.md'
  await h.write(path, skillText({ description: 'Old text.' }))
  await h.scanner.scan()
  await h.write(
    path,
    skillText({ description: 'New text, with a different size.' }),
  )
  const changed = await h.scanner.scan()
  expect(changed.claude).toEqual([
    {
      name: 'plans',
      description: 'New text, with a different size.',
      path: join(h.root, path),
    },
  ])
  await h.scanner.scan()
  expect(h.servers.processes).toHaveLength(1)
  await h.scanner.scan(true)
  expect(h.servers.processes).toHaveLength(2)
})

it('keeps the last Claude list when its folder cannot be read', async () => {
  const h = await scannerFixture()
  const path = '.claude/skills/plans/SKILL.md'
  await h.write(path, skillText({ description: 'Kept.' }))
  await h.scanner.scan()
  const read = vi
    .spyOn(skillFiles, 'claudeSkillFiles')
    .mockRejectedValueOnce(new Error('permission denied'))
  try {
    expect((await h.scanner.scan()).claude).toEqual([
      { name: 'plans', description: 'Kept.', path: join(h.root, path) },
    ])
    expect(h.warnings).toEqual([
      'The Claude skill folders could not be read. The list keeps its last skills.',
    ])
  } finally {
    read.mockRestore()
  }
})
