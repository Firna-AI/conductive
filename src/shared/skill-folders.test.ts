import { expect, it } from 'vitest'

import { findSkillFolders, isSkillsRepository } from './skill-folders'

it.each([
  {
    layout: 'skills folders',
    paths: [
      'skills/zebra/SKILL.md',
      'skills/apple/SKILL.md',
      'other/SKILL.md',
      'SKILL.md',
    ],
    skills: [
      { name: 'apple', path: 'skills/apple' },
      { name: 'zebra', path: 'skills/zebra' },
    ],
  },
  {
    layout: 'curated, system, and dot folders at any depth',
    paths: [
      'skills/.system/creator/SKILL.md',
      'skills/.curated/browser/SKILL.md',
      'skills/group/.hidden/SKILL.md',
    ],
    skills: [
      { name: '.hidden', path: 'skills/group/.hidden' },
      { name: 'browser', path: 'skills/.curated/browser' },
      { name: 'creator', path: 'skills/.system/creator' },
    ],
  },
  {
    layout: 'top-level folders without a root skill',
    paths: ['zebra/SKILL.md', 'apple/SKILL.md', 'deep/nested/SKILL.md'],
    skills: [
      { name: 'apple', path: 'apple' },
      { name: 'zebra', path: 'zebra' },
    ],
  },
  {
    layout: 'the repository root',
    paths: ['SKILL.md', 'scripts/run.sh'],
    skills: [{ name: 'repository-name', path: '.' }],
  },
  {
    layout: 'a root skill with example skills inside it',
    paths: ['SKILL.md', 'examples/SKILL.md', 'examples/nested/SKILL.md'],
    skills: [{ name: 'repository-name', path: '.' }],
  },
  {
    layout: 'nested skills and git metadata',
    paths: [
      'skills/parent/child/SKILL.md',
      'skills/parent/SKILL.md',
      'skills/.git/ignored/SKILL.md',
      '.git/SKILL.md',
    ],
    skills: [{ name: 'parent', path: 'skills/parent' }],
  },
  {
    layout: 'an existing skills folder without skills',
    paths: ['skills/README.md', 'top/SKILL.md', 'SKILL.md'],
    skills: [],
  },
  {
    layout: 'git metadata without a skills folder',
    paths: ['.git/SKILL.md', 'nested/child/SKILL.md'],
    skills: [],
  },
])('finds skills in $layout', ({ paths, skills }) => {
  expect(findSkillFolders(paths, 'repository-name')).toEqual({
    skills,
    clashes: [],
  })
})

it('keeps the first path for a name and skips children of the losing folder too', () => {
  const paths = [
    'skills/z/shared/SKILL.md',
    'skills/z/shared/child/SKILL.md',
    'skills/a/shared/SKILL.md',
    'skills/a/shared/SKILL.md',
    'skills/first/SKILL.md',
  ]
  expect(findSkillFolders(paths, 'repository-name')).toEqual({
    skills: [
      { name: 'first', path: 'skills/first' },
      { name: 'shared', path: 'skills/a/shared' },
    ],
    clashes: [
      {
        name: 'shared',
        keptPath: 'skills/a/shared',
        skippedPath: 'skills/z/shared',
      },
    ],
  })
})

it('accepts GitHub names and rejects ambiguous URL, path, and command text', () => {
  for (const value of [
    'anthropics/skills',
    'openai/skills',
    'futex-ai/skills',
    'Owner-123/repo_name.v2-1',
    'owner/.github',
    `${'a'.repeat(39)}/${'b'.repeat(100)}`,
  ])
    expect(isSkillsRepository(value), value).toBe(true)
  for (const value of [
    '',
    'owner',
    'owner/name/extra',
    'owner/..',
    'owner/a..b',
    'owner/.',
    'owner name/repo',
    'owner/name ',
    ' owner/name',
    'owner/name\n',
    'owner_name/repo',
    '-owner/name',
    'owner-/name',
    'ow--ner/name',
    `${'a'.repeat(40)}/name`,
    `owner/${'b'.repeat(101)}`,
    'https://github.com/owner/name',
    'owner/name?x=1',
    'owner/name#main',
    'owner/name%2fother',
    'owner/name\\other',
    'owner/$(id)',
    'owner/`id`',
    'owner/name;echo',
    'owner/name:main',
    'owner/é',
  ])
    expect(isSkillsRepository(value), value).toBe(false)
})
