import {
  access,
  cp,
  readFile,
  readdir,
  realpath,
  symlink,
} from 'node:fs/promises'
import { basename, join } from 'node:path'

import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { mockComputerServer } from '../../test-support/computer-mcp'
import { skillProviders } from '../../test-support/skill-providers'
import { object } from '../parse'

beforeEach(mockComputerServer)
afterEach(() => vi.restoreAllMocks())

it.each(['claude', 'codex'] as const)(
  'gives %s selected skills without workspace clashes and resumes with the next immutable copy',
  async (agent) => {
    const h = await skillProviders(agent)
    await h.skill('skills/unique', 'unique', 'Original org skill')
    await h.skill('skills/unique/nested', 'nested', 'Support file')
    await h.skill('skills/.hidden', 'hidden')
    await h.skill('skills/.curated/duplicate', 'duplicate', 'First duplicate')
    await h.skill('skills/.system/duplicate', 'duplicate', 'Second duplicate')
    await h.skill('skills/.git/unwanted', 'unwanted')
    await h.skill('outside', 'outside')
    await h.skill('skills/same', 'same', 'Org clash')
    await h.skill('skills/alias', 'shared-name', 'Org frontmatter clash')
    await h.write('hooks/hooks.json', '{"hooks":{"SessionStart":[]}}')
    await h.write('agents/unwanted.md', 'Unwanted agent')
    await h.write('commands/unwanted.md', 'Unwanted command')
    await h.write('.mcp.json', '{"mcpServers":{"unwanted":{}}}')
    await h.write('.claude/settings.json', '{"env":{"UNWANTED":"1"}}')
    await h.write('CLAUDE.md', 'Unwanted rules')
    await h.write('AGENTS.md', 'Unwanted rules')
    const native = agent === 'claude' ? '.claude' : '.agents'
    await h.skill(
      `${native}/skills/same`,
      'same',
      'Workspace skill',
      h.options.cwd,
    )
    await h.skill(
      `${native}/skills/local-alias`,
      "'shared-name' # name",
      'Workspace frontmatter skill',
      h.options.cwd,
    )
    const provider = await h.open()
    onTestFinished(() => provider.close())
    const paths = await h.paths()
    expect(paths.map((path) => basename(path))).toEqual([
      '.hidden',
      'duplicate',
      'unique',
    ])
    expect(h.sdk()?.parameters?.options?.plugins).toBeUndefined()
    expect(
      h.sdk()?.parameters?.options?.additionalDirectories?.length ?? 0,
    ).toBe(agent === 'claude' ? 1 : 0)
    expect(h.sdk()?.parameters?.options?.settingSources ?? null).toEqual(
      agent === 'claude' ? ['project'] : null,
    )
    expect(await readFile(join(paths[1], 'SKILL.md'), 'utf8')).toContain(
      'First duplicate',
    )
    const first = paths[2]
    const original = await realpath(first)
    expect(original).not.toBe(join(h.copy, 'skills', 'unique'))
    expect(await readFile(join(first, 'SKILL.md'), 'utf8')).toContain(
      'Original org skill',
    )
    expect(await readFile(join(first, 'nested', 'SKILL.md'), 'utf8')).toContain(
      'Support file',
    )
    expect(h.skillConfigs()).toEqual(
      agent === 'codex'
        ? [
            `skills.config=[{path=${JSON.stringify(join(original, 'nested', 'SKILL.md'))},enabled=false}]`,
          ]
        : [],
    )
    expect(h.rootMethods()).toEqual(
      agent === 'codex' ? ['skills/extraRoots/set', 'thread/resume'] : [],
    )
    expect(
      agent === 'claude'
        ? h.sdk()?.parameters?.options?.resume
        : object(
            h.servers.latest.writes.find(
              (write) => write.method === 'thread/resume',
            )?.params,
          ).threadId,
    ).toBe('saved-conversation')
    expect(h.warnings).toEqual([
      'The org skill duplicate uses skills/.curated/duplicate. The duplicate skills/.system/duplicate will not load.',
      'The workspace skill alias takes precedence. The org skill will not load.',
      'The workspace skill same takes precedence. The org skill will not load.',
    ])
    const nextCopy = join(h.home, 'copies', 'next', 'org-skills')
    await cp(h.copy, nextCopy, { recursive: true })
    await h.skill('skills/unique', 'unique', 'Updated org skill', nextCopy)
    h.options.orgSkills = { repository: 'Owner/Skills', directory: nextCopy }
    expect(await readFile(join(first, 'SKILL.md'), 'utf8')).toContain(
      'Original org skill',
    )
    const next = await h.open()
    onTestFinished(() => next.close())
    const second = (await h.paths())[2]
    expect(await realpath(second)).not.toBe(join(nextCopy, 'skills', 'unique'))
    expect(await realpath(second)).not.toBe(original)
    expect(await readFile(join(second, 'SKILL.md'), 'utf8')).toContain(
      'Updated org skill',
    )
    await provider.close()
    expect(
      await access(first).then(
        () => true,
        () => false,
      ),
    ).toBe(false)
    expect(await readdir(second)).toEqual(['SKILL.md', 'nested'])
    await next.close()
  },
)

it('gives a root skill its repository name and removes the temporary Claude links on close', async () => {
  const h = await skillProviders('claude')
  await h.skill('.', 'org-skills')
  const provider = await h.open()
  onTestFinished(() => provider.close())
  const paths = await h.paths()
  expect(paths.map((path) => basename(path))).toEqual(['org-skills'])
  expect(await realpath(paths[0])).not.toBe(h.copy)
  await provider.close()
  expect(
    await access(paths[0]).then(
      () => true,
      () => false,
    ),
  ).toBe(false)
})

it.each(['claude', 'codex'] as const)(
  'warns and starts %s when the copy is unreadable or malformed',
  async (agent) => {
    const h = await skillProviders(agent)
    await h.write('not-a-directory', 'Malformed copy')
    const malformed = join(h.copy, 'not-a-directory')
    await symlink(join(h.copy, 'missing'), join(h.copy, 'SKILL.md'))
    for (const directory of [malformed, h.copy]) {
      h.options.orgSkills = { repository: 'Owner/Skills', directory }
      const provider = await h.open()
      onTestFinished(() => provider.close())
      expect(await h.paths()).toEqual([])
      await provider.send(h.command)
      await provider.close()
    }
    expect(h.warnings).toEqual([
      'The org skills could not be prepared. The turn will continue.',
      'The org skills could not be prepared. The turn will continue.',
    ])
  },
)

it('warns and resumes Codex when its app server refuses the extra roots', async () => {
  const h = await skillProviders('codex', true)
  await h.skill('skills/alpha', 'alpha')
  const provider = await h.open()
  onTestFinished(() => provider.close())
  expect(h.rootMethods()).toEqual(['skills/extraRoots/set', 'thread/resume'])
  expect(h.warnings).toEqual([
    'The org skills could not be loaded. The turn will continue.',
  ])
  await provider.send(h.command)
  expect(h.servers.latest.writes.at(-1)?.method).toBe('turn/start')
})
