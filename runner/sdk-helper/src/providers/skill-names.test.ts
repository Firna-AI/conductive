import { basename } from 'node:path'

import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { mockComputerServer } from '../../test-support/computer-mcp'
import { skillProviders } from '../../test-support/skill-providers'

beforeEach(mockComputerServer)
afterEach(() => vi.restoreAllMocks())

it.each(['claude', 'codex'] as const)(
  'uses %s shown names for workspace precedence and duplicate org skills',
  async (agent) => {
    const h = await skillProviders(agent)
    const native = agent === 'claude' ? '.claude' : '.agents'
    await h.skill(
      `${native}/skills/local-folded`,
      '>-\n  shared-folded',
      'Local',
      h.options.cwd,
    )
    await h.skill(
      `${native}/skills/local-repair`,
      'shared-repair',
      'Before: after',
      h.options.cwd,
    )
    await h.skill(
      `${native}/skills/taken-folder`,
      'local-name',
      'Local',
      h.options.cwd,
    )
    await h.skill('skills/folded', 'shared-folded')
    await h.skill('skills/repair', 'shared-repair')
    await h.skill('skills/taken-folder', 'org-name')
    await h.skill('skills/first', 'duplicate-name', 'First')
    await h.skill('skills/second', 'duplicate-name', 'Second')
    const provider = await h.open()
    onTestFinished(() => provider.close())
    expect((await h.paths()).map((path) => basename(path))).toEqual(
      agent === 'claude' ? ['first'] : ['first', 'taken-folder'],
    )
    expect(h.warnings).toEqual([
      'The workspace skill folded takes precedence. The org skill will not load.',
      'The workspace skill repair takes precedence. The org skill will not load.',
      'The org skill duplicate-name uses skills/first. The duplicate skills/second will not load.',
      ...(agent === 'claude'
        ? [
            'The workspace skill taken-folder takes precedence. The org skill will not load.',
          ]
        : []),
    ])
    await provider.close()
  },
)

it('warns and omits an org skill whose Codex name exceeds its native limit', async () => {
  const h = await skillProviders('codex')
  await h.skill('skills/too-long', 'x'.repeat(65))
  const provider = await h.open()
  onTestFinished(() => provider.close())
  expect(await h.paths()).toEqual([])
  expect(h.warnings).toEqual([
    'The org skill skills/too-long has no usable Codex name. It will not load.',
  ])
  await provider.close()
})
