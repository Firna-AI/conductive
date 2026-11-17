import { access, readFile, readdir, realpath } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { mockComputerServer } from '../../test-support/computer-mcp'
import { skillProviders } from '../../test-support/skill-providers'
import { skillsFixture } from '../../test-support/skills-repository'

beforeEach(mockComputerServer)
afterEach(() => vi.restoreAllMocks())

it.each(['claude', 'codex'] as const)(
  'gives %s only the selected org skills and omits workspace name clashes on every turn',
  async (agent) => {
    const h = await skillsFixture()
    await h.skill('skills/unique', 'unique', 'Original org skill')
    await h.skill(
      'skills/unique/nested',
      'nested',
      'Support file, not another skill',
    )
    await h.skill('skills/.hidden', 'hidden')
    await h.skill('skills/same', 'same', 'Org clash')
    await h.skill('skills/alias', 'shared-name', 'Org frontmatter clash')
    await h.write(
      'hooks/hooks.json',
      '{"hooks":{"SessionStart":[{"command":"unwanted"}]}}',
    )
    await h.write('agents/unwanted.md', 'Unwanted agent')
    await h.write('commands/unwanted.md', 'Unwanted command')
    await h.write('.mcp.json', '{"mcpServers":{"unwanted":{}}}')
    await h.write('.claude/settings.json', '{"env":{"UNWANTED":"1"}}')
    await h.write('CLAUDE.md', 'Unwanted rules')
    await h.write('AGENTS.md', 'Unwanted rules')
    await h.publish()
    const native = agent === 'claude' ? '.claude' : '.agents'
    await h.skill(`${native}/skills/same`, 'same', 'Workspace skill')
    await h.skill(
      `${native}/skills/local-alias`,
      "'shared-name' # name",
      'Workspace frontmatter skill',
    )
    const copy = h.create()
    await copy.refresh()
    const p = skillProviders(h, agent)
    const provider = await copy.provider(p.factory)(p.options)
    onTestFinished(() => provider.close())
    const paths = await p.paths()
    expect(paths.map((path) => basename(path))).toEqual(['.hidden', 'unique'])
    expect(
      paths.every((path) => path.startsWith(join(h.home, '.conductive'))),
    ).toBe(true)
    expect(p.sdk()?.parameters?.options?.plugins).toBeUndefined()
    expect(p.sdk()?.parameters?.options?.settingSources ?? null).toEqual(
      agent === 'claude' ? ['project'] : null,
    )
    const first = paths[1]
    const original = await realpath(first)
    expect(original).toBe(
      copy.folders.find((skill) => skill.name === 'unique')?.path,
    )
    expect(await readFile(join(first, 'SKILL.md'), 'utf8')).toContain(
      'Original org skill',
    )
    expect(await readFile(join(first, 'nested', 'SKILL.md'), 'utf8')).toContain(
      'Support file',
    )
    expect(p.skillConfigs()).toEqual(
      agent === 'codex'
        ? [
            `skills.config=[{path=${JSON.stringify(join(original, 'nested', 'SKILL.md'))},enabled=false}]`,
          ]
        : [],
    )
    expect(p.rootMethods()).toEqual(
      agent === 'codex' ? ['skills/extraRoots/set', 'thread/resume'] : [],
    )
    expect(h.warnings).toEqual([
      'The workspace skill alias takes precedence. The org skill will not load.',
      'The workspace skill same takes precedence. The org skill will not load.',
    ])
    await h.skill('skills/unique', 'unique', 'Updated org skill')
    await h.update()
    await copy.refresh()
    expect(await readFile(join(first, 'SKILL.md'), 'utf8')).toContain(
      'Original org skill',
    )
    const next = await copy.provider(p.factory)(p.options)
    onTestFinished(() => next.close())
    const second = (await p.paths())[1]
    expect(await realpath(second)).not.toBe(original)
    expect(await readFile(join(second, 'SKILL.md'), 'utf8')).toContain(
      'Updated org skill',
    )
    await provider.close()
    const retained = await access(first).then(
      () => true,
      () => false,
    )
    expect(retained).toBe(agent === 'codex')
    expect(await readdir(second)).toEqual(['SKILL.md', 'nested'])
    await next.close()
  },
)

it.each(['claude', 'codex'] as const)(
  'warns and starts %s when the skills cannot be read',
  async (agent) => {
    const h = await skillsFixture()
    const p = skillProviders(h, agent)
    const provider = await p.factory({
      ...p.options,
      skillFolders: [{ name: 'missing', path: join(h.home, 'missing') }],
    })
    onTestFinished(() => provider.close())
    expect(h.warnings).toEqual([
      'The org skills could not be prepared. The turn will continue.',
    ])
    expect(await p.paths()).toEqual([])
  },
)

it('warns and starts a Codex turn when the app server refuses the extra skill roots', async () => {
  const h = await skillsFixture()
  await h.skill('skills/alpha', 'alpha')
  await h.publish()
  const copy = h.create()
  await copy.refresh()
  const p = skillProviders(h, 'codex', true)
  const provider = await copy.provider(p.factory)(p.options)
  onTestFinished(() => provider.close())
  expect(p.rootMethods()).toEqual(['skills/extraRoots/set', 'thread/resume'])
  expect(h.warnings).toEqual([
    'The org skills could not be loaded. The turn will continue.',
  ])
})
