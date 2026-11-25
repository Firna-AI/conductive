import { execFileSync } from 'node:child_process'
import { constants } from 'node:fs'
import { mkdir, open, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it, onTestFinished } from 'vitest'

import { scannerFixture, skillText } from '../test-support/skills'
import type { OrgSkills } from './generated/OrgSkills'
import { withOrgSkillPaths } from './providers/skill-input'
import { readOrgSkill } from './skill-org'

async function orgCopy(home: string) {
  const directory = join(
    home,
    '.conductive/skills/repositories/acme/skills/commits/abc123/skills',
  )
  const write = async (path: string, text: string) => {
    const target = join(directory, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, text)
  }
  const skills: OrgSkills = { repository: 'acme/skills', directory }
  return { directory, write, skills }
}

async function linkSkill(path: string, target: string) {
  await mkdir(dirname(path), { recursive: true })
  await symlink(target, path)
}

function readClaudeOrgSkill(
  repository: string,
  orgSkills: OrgSkills,
  name: string,
) {
  return readOrgSkill(
    { type: 'org', repository, orgSkills, agent: 'claude', name },
    1_048_576,
  )
}

it('lists the org skills after the workspace skills, as an agent start loads them', async () => {
  const h = await scannerFixture()
  const org = await orgCopy(h.home)
  await h.write(
    '.claude/skills/plans/SKILL.md',
    skillText({ name: 'plans', description: 'Workspace plans.' }),
  )
  await org.write(
    'skills/plans/SKILL.md',
    skillText({ name: 'plans', description: 'Org plans.' }),
  )
  await org.write(
    'skills/finish-work/SKILL.md',
    skillText(
      {
        name: 'finish-work',
        description: 'Commit and push.',
        'disable-model-invocation': 'true',
        'allowed-tools': 'Bash',
      },
      'Run `!git status`.',
    ),
  )
  await org.write('skills/no-description/SKILL.md', '# Only a heading\n')
  const path = (folder: string) => join(org.directory, 'skills', folder)
  expect(await h.scanner.scan(false, org.skills)).toEqual({
    claude: [
      {
        name: 'plans',
        description: 'Workspace plans.',
        path: join(h.root, '.claude/skills/plans/SKILL.md'),
      },
      {
        name: 'finish-work',
        description: 'Commit and push.',
        manualOnly: true,
        path: join(path('finish-work'), 'SKILL.md'),
        org: true,
      },
      {
        name: 'no-description',
        description: 'Only a heading',
        path: join(path('no-description'), 'SKILL.md'),
        org: true,
      },
    ],
    codex: [
      {
        name: 'finish-work',
        description: 'Commit and push.',
        path: join(path('finish-work'), 'SKILL.md'),
        org: true,
      },
      {
        name: 'plans',
        description: 'Org plans.',
        path: join(path('plans'), 'SKILL.md'),
        org: true,
      },
    ],
  })
  expect(h.warnings).toContain(
    'The workspace skill plans takes precedence. The org skill will not load.',
  )
})

it('lists no org skills without a copy or after a failed read', async () => {
  const h = await scannerFixture()
  const org = await orgCopy(h.home)
  await org.write(
    'skills/review/SKILL.md',
    skillText({ name: 'review', description: 'Review the code.' }),
  )
  const empty = { claude: [], codex: [] }
  expect(await h.scanner.scan(false, null)).toEqual(empty)
  expect(
    await h.scanner.scan(false, { repository: 'acme/skills', directory: null }),
  ).toEqual(empty)
  const listed = await h.scanner.scan(false, org.skills)
  expect(listed.claude.map((skill) => skill.name)).toEqual(['review'])
  const missing = { ...org.skills, directory: join(h.home, 'gone') }
  expect(await h.scanner.scan(false, missing)).toEqual(empty)
  expect(h.warnings).toContain(
    'The org skills could not be listed. The list holds no org skills.',
  )
})

it('lists and reads a regular org skill when another candidate links to a FIFO', async () => {
  const h = await scannerFixture()
  const org = await orgCopy(h.home)
  const text = skillText({ name: 'review', description: 'Review the code.' })
  await org.write('skills/review/SKILL.md', text)
  const fifo = join(org.directory, 'pipe')
  execFileSync('mkfifo', [fifo])
  const pipe = await open(fifo, constants.O_RDWR | constants.O_NONBLOCK)
  onTestFinished(() => pipe.close())
  await linkSkill(join(org.directory, 'skills/pipe/SKILL.md'), fifo)

  const { claude } = await h.scanner.scan(false, org.skills)
  expect(claude.map((skill) => skill.name)).toEqual(['review'])
  expect(await readClaudeOrgSkill(h.root, org.skills, 'review')).toEqual({
    ok: true,
    text,
  })
  expect(await readClaudeOrgSkill(h.root, org.skills, 'pipe')).toEqual({
    ok: false,
    error: {
      code: 'skill_unavailable',
      message: 'The skill could not be read.',
    },
  })
})

it('bounds metadata from oversized links and keeps workspace names found within the limit', async () => {
  const h = await scannerFixture()
  const org = await orgCopy(h.home)
  const body = 'x'.repeat(1_048_576)
  const oversized = skillText(
    { name: 'oversized', description: 'Too large.' },
    body,
  )
  const target = join(org.directory, 'skills/oversized/content.md')
  await org.write('skills/oversized/content.md', oversized)
  await linkSkill(join(org.directory, 'skills/oversized/SKILL.md'), target)

  const kept = skillText({ name: 'review', description: 'Review the code.' })
  await org.write('skills/review/SKILL.md', kept)
  await org.write(
    'skills/shadowed/SKILL.md',
    skillText({ name: 'shadowed', description: 'Org skill.' }),
  )
  await h.write(
    'early.md',
    skillText({ name: 'shadowed', description: 'Workspace skill.' }, body),
  )
  await h.write(
    'late.md',
    `---\n# ${body}\nname: review\ndescription: Workspace skill.\n---\n`,
  )
  await linkSkill(
    join(h.root, '.claude/skills/early/SKILL.md'),
    join(h.root, 'early.md'),
  )
  await linkSkill(
    join(h.root, '.claude/skills/late/SKILL.md'),
    join(h.root, 'late.md'),
  )

  const { claude } = await h.scanner.scan(false, org.skills)
  expect(claude.map((skill) => skill.name)).toEqual(['review'])
  expect(await readClaudeOrgSkill(h.root, org.skills, 'review')).toEqual({
    ok: true,
    text: kept,
  })
  expect(await readClaudeOrgSkill(h.root, org.skills, 'shadowed')).toEqual({
    ok: false,
    error: { code: 'skill_not_found', message: 'The skill was not found.' },
  })
  expect(await readClaudeOrgSkill(h.root, org.skills, 'oversized')).toEqual({
    ok: false,
    error: {
      code: 'skill_too_large',
      message: 'The skill is too large.',
      sizeBytes: 1_048_624,
      limitBytes: 1_048_576,
    },
  })
})

it('lists and reads a Claude org skill under its declared name with a Unicode line separator', async () => {
  const h = await scannerFixture()
  const org = await orgCopy(h.home)
  const text = skillText(
    { name: 'declared-name', description: 'Review\u2028the code.' },
    'Body.\n',
  )
  const path = 'skills/folder-name/SKILL.md'
  await org.write(path, text)

  const { claude } = await h.scanner.scan(false, org.skills)
  expect(claude.map((skill) => skill.name)).toEqual(['declared-name'])
  expect(await readClaudeOrgSkill(h.root, org.skills, claude[0].name)).toEqual({
    ok: true,
    text,
  })
})

it('gives an org skill of the list its path in the view of the agent start', () => {
  const home = '/home/user'
  const copy = `${home}/.conductive/skills/repositories/acme/skills/commits/abc/skills`
  const listed = [
    { name: 'plans', path: '/repo/.agents/skills/plans/SKILL.md' },
    { name: 'review', path: `${copy}/skills/review/SKILL.md` },
    { name: 'added-later', path: `${copy}/skills/added-later/SKILL.md` },
  ]
  const view = new Map([['review', '/view/skills/review/SKILL.md']])
  const source = withOrgSkillPaths({ of: () => listed }, home, view)
  expect(source.of('codex')).toEqual([
    { name: 'plans', path: '/repo/.agents/skills/plans/SKILL.md' },
    { name: 'review', path: '/view/skills/review/SKILL.md' },
  ])
})
