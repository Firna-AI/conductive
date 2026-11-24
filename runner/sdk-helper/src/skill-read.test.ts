import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { providerFixture } from '../test-support/fixture'
import { skillText } from '../test-support/skills'
import type { HelperOutput } from './generated/HelperOutput'
import type { HelperSkillSource } from './generated/HelperSkillSource'
import type { SkillReadOutcome } from './generated/SkillReadOutcome'
import { readOutput } from './read-output'
import { readRequest } from './read-request'
import { HelperSession } from './session'

async function read(source: HelperSkillSource, maxBytes = 1_048_576) {
  const unexpected = async () => {
    throw new Error('A skill read must not start an agent.')
  }
  const output = await new Promise<HelperOutput>((resolve) => {
    const session = new HelperSession(
      { claude: unexpected, codex: unexpected },
      resolve,
      unexpected,
      () => {},
    )
    session.accept(
      readRequest({ type: 'skill.read', requestId: 'read', source, maxBytes }),
    )
  })
  return readOutput(JSON.parse(JSON.stringify(output)))
}

function reply(result: SkillReadOutcome) {
  return { type: 'skill.read.result', requestId: 'read', result }
}

async function writeSkill(directory: string, text: string) {
  const path = join(directory, 'review', 'SKILL.md')
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
  return path
}

it.each(['.claude', '.agents'])(
  'reads the complete text from a scanned %s skill file',
  async (agentFolder) => {
    const { root } = await providerFixture()
    const text = skillText(
      { name: 'review', description: 'Review a change.' },
      'Body.\n',
    )
    const path = await writeSkill(join(root, agentFolder, 'skills'), text)
    expect(await read({ type: 'file', path })).toEqual(
      reply({ ok: true, text }),
    )
  },
)

it('reads the safe view of the selected org skill with the agent trust policy', async () => {
  const { root, home } = await providerFixture()
  const directory = join(home, 'org-copy')
  await writeSkill(
    join(directory, 'skills'),
    skillText(
      {
        name: 'review',
        description: 'Review a change.',
        'allowed-tools': 'Bash',
      },
      'Run !`git status`.\n',
    ),
  )
  const safe = '---\nname: review\ndescription: Review a change.\n---\n'
  for (const [agent, trustedRepository, body] of [
    ['claude', null, 'Run ! `git status`.\n'],
    ['claude', 'acme/skills', 'Run !`git status`.\n'],
    ['codex', 'acme/skills', 'Run ! `git status`.\n'],
  ] as const) {
    expect(
      await read({
        type: 'org',
        repository: root,
        orgSkills: { repository: 'acme/skills', directory, trustedRepository },
        agent,
        name: 'review',
      }),
    ).toEqual(reply({ ok: true, text: safe + body }))
  }
})

it('leaves out an org skill when a workspace skill takes precedence', async () => {
  const { root, home } = await providerFixture()
  const directory = join(home, 'org-copy')
  const text = skillText({ name: 'review', description: 'Review a change.' })
  await writeSkill(join(directory, 'skills'), text)
  await writeSkill(join(root, '.claude', 'skills'), text)
  expect(
    await read({
      type: 'org',
      repository: root,
      orgSkills: { repository: 'acme/skills', directory },
      agent: 'claude',
      name: 'review',
    }),
  ).toEqual(
    reply({
      ok: false,
      error: { code: 'skill_not_found', message: 'The skill was not found.' },
    }),
  )
})

it('reports a deleted skill file as missing and a directory as unavailable', async () => {
  const { root } = await providerFixture()
  const path = await writeSkill(root, '# Review\n')
  await unlink(path)
  expect(await read({ type: 'file', path })).toEqual(
    reply({
      ok: false,
      error: { code: 'skill_not_found', message: 'The skill was not found.' },
    }),
  )
  await mkdir(path)
  expect(await read({ type: 'file', path })).toEqual(
    reply({
      ok: false,
      error: {
        code: 'skill_unavailable',
        message: 'The skill could not be read.',
      },
    }),
  )
})

it.each([
  [3, 'éé', 4, 3],
  [2_000_000, 'x'.repeat(1_048_577), 1_048_577, 1_048_576],
] as const)(
  'reports the file size when it exceeds the limit for maxBytes %i',
  async (maxBytes, text, sizeBytes, limitBytes) => {
    const { root } = await providerFixture()
    const path = await writeSkill(root, text)
    expect(await read({ type: 'file', path }, maxBytes)).toEqual(
      reply({
        ok: false,
        error: {
          code: 'skill_too_large',
          message: 'The skill is too large.',
          sizeBytes,
          limitBytes,
        },
      }),
    )
  },
)
