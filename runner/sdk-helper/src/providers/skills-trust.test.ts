import { mkdir, readFile, readdir, realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest'
import { parse } from 'yaml'

import { mockComputerServer } from '../../test-support/computer-mcp'
import { skillProviders } from '../../test-support/skill-providers'

beforeEach(mockComputerServer)
afterEach(() => vi.restoreAllMocks())

it('keeps untrusted Claude skill restrictions without an available or selected copy through choice changes', async () => {
  const h = await skillProviders('claude')
  await mkdir(h.copy, { recursive: true })
  const emptyCopy = join(h.home, 'empty-copy')
  await mkdir(emptyCopy)
  await h.skill('skills/clash', 'clash')
  await h.skill('.claude/skills/clash', 'clash', 'Workspace', h.options.cwd)
  await h.write(
    '.claude/settings.json',
    '{"disableSkillShellExecution":false}',
    h.options.cwd,
  )
  for (const [directory, trustedRepository] of [
    [undefined, undefined],
    [null, null],
    [join(h.copy, 'missing'), 'other/skills'],
    [emptyCopy, undefined],
    [h.copy, 'owner/../skills'],
    [h.copy, 'other/skills'],
  ]) {
    h.options.orgSkills = {
      repository: 'Owner/Skills',
      trustedRepository,
      directory,
    }
    h.options.choice = {
      agent: 'claude',
      model: 'opus',
      effort: 'ultra',
      fast: true,
    }
    const provider = await h.open()
    onTestFinished(() => provider.close())
    expect(h.sdk()?.parameters?.options?.settings).toEqual({
      ultracode: true,
      fastMode: true,
      disableSkillShellExecution: true,
    })
    expect(await h.paths()).toEqual([])
    expect(h.sdk()?.parameters?.options?.disallowedTools).toBeUndefined()
    expect(h.sdk()?.parameters?.options?.tools).toBeUndefined()
    await provider.model({
      agent: 'claude',
      model: 'sonnet',
      effort: 'none',
      fast: false,
    })
    expect(h.sdk()?.models).toEqual(['sonnet'])
    expect(h.sdk()?.efforts).toEqual([
      {
        effortLevel: null,
        ultracode: false,
        fastMode: false,
        disableSkillShellExecution: true,
      },
    ])
    await provider.close()
  }
})

it('keeps trusted Claude skill bodies and isolates repository controls from discovery', async () => {
  const h = await skillProviders('claude')
  h.options.orgSkills = {
    repository: 'Owner/Skills',
    trustedRepository: 'owner/skills',
    directory: h.copy,
  }
  const body =
    'Inline: !`echo inline`\nArguments: !$ARGUMENTS\nDoubled: !!`echo double`\n```!bash\necho fence\n```\n'
  await h.write(
    'skills/shared/SKILL.md',
    `---\nname: shared\ndescription: Shared skill\nallowed-tools: Bash\nhooks: {Stop: []}\n---\n${body}`,
  )
  await h.write('.claude/commands/unwanted.md', 'Unwanted command')
  await h.write('.claude/settings.json', '{"env":{"UNWANTED":"1"}}')
  await h.write('.claude/settings.local.json', '{"hooks":{"Stop":[]}}')
  await h.write('.claude/agents/unwanted.md', 'Unwanted agent')
  await h.write('.mcp.json', '{"mcpServers":{"unwanted":{}}}')
  await h.write('CLAUDE.md', 'Unwanted rules')
  await h.write(
    'skills/shared/agents/openai.yaml',
    'interface:\n  display_name: Shared skill\ndependencies:\n  tools:\n    - type: mcp\n      value: unwanted\n      command: echo unwanted\n',
  )
  const provider = await h.open()
  onTestFinished(() => provider.close())
  const [path] = await h.paths()
  const content = await readFile(join(path, 'SKILL.md'), 'utf8')
  expect(parse(content.split('---')[1])).toEqual({
    name: 'shared',
    description: 'Shared skill',
  })
  expect(content.slice(content.indexOf('\n---\n') + 5)).toBe(body)
  expect(
    parse(await readFile(join(path, 'agents', 'openai.yaml'), 'utf8')),
  ).toEqual({ interface: { display_name: 'Shared skill' } })
  const discovery = dirname(dirname(dirname(path)))
  expect(h.sdk()?.parameters?.options?.additionalDirectories).toEqual([
    discovery,
  ])
  expect(await readdir(discovery)).toEqual(['.claude'])
  expect(await readdir(join(discovery, '.claude'))).toEqual(['skills'])
  expect(await readdir(join(discovery, '.claude', 'skills'))).toEqual([
    'shared',
  ])
  expect(await realpath(path)).not.toBe(join(h.copy, 'skills', 'shared'))
  expect(h.sdk()?.parameters?.options?.settings).toEqual({ fastMode: false })
  await provider.model({
    agent: 'claude',
    model: 'opus',
    effort: 'ultra',
    fast: true,
  })
  expect(h.sdk()?.efforts).toEqual([
    { effortLevel: 'max', ultracode: true, fastMode: true },
  ])
  expect(h.warnings).toEqual([])
  await provider.close()
})

it('keeps native Claude settings for released helper requests without an org source', async () => {
  const h = await skillProviders('claude')
  for (const source of [
    undefined,
    null,
    { repository: 'owner/../skills', directory: h.copy },
  ]) {
    h.options.orgSkills = source
    const provider = await h.open()
    onTestFinished(() => provider.close())
    expect(h.sdk()?.parameters?.options?.settings).toEqual({ fastMode: false })
    expect(await h.paths()).toEqual([])
    expect(h.warnings).toEqual([])
    await provider.model({
      agent: 'claude',
      model: 'sonnet',
      effort: 'high',
      fast: true,
    })
    expect(h.sdk()?.efforts).toEqual([
      { effortLevel: 'high', ultracode: false, fastMode: true },
    ])
    await provider.close()
  }
})
