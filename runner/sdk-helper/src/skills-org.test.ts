import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { scannerFixture, skillText } from '../test-support/skills'
import type { OrgSkills } from './generated/OrgSkills'
import { withOrgSkillPaths } from './providers/skill-input'

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
