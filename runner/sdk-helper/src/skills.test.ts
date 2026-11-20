import { join } from 'node:path'

import { expect, it } from 'vitest'

import { scannerFixture, skillText } from '../test-support/skills'

it('reads Claude metadata and fallback names and omits skills hidden from its menu', async () => {
  const h = await scannerFixture()
  const write = (folder: string, text: string) =>
    h.write(`.claude/skills/${folder}/SKILL.md`, text)
  await write(
    'plans',
    skillText({
      name: 'plans',
      description: 'Write plans.',
      'disable-model-invocation': 'true',
    }),
  )
  await write(
    'folder-name',
    skillText({ description: '"Quoted: with \\"escapes\\"."' }),
  )
  await write('no-front-matter', '\n# Review the code\nThen report.\n')
  await write(
    'folded',
    '---\nname: folded\ndescription: >\n  First part\n  second part.\n---\n',
  )
  await write(
    'model-only',
    skillText({ description: 'Hidden.', 'user-invocable': 'false' }),
  )
  await write(
    'in-menu',
    skillText({ description: 'In the menu.', 'user-invocable': 'true' }),
  )
  await write('huge', 'x'.repeat(1_048_577))
  await h.write(
    '.claude/skills/loose.md',
    skillText({ name: 'loose', description: 'Not in a folder.' }),
  )
  expect(await h.scanner.scan()).toEqual({
    claude: [
      {
        name: 'folded',
        description: 'First part second part.',
        path: join(h.root, '.claude/skills/folded/SKILL.md'),
      },
      {
        name: 'folder-name',
        description: 'Quoted: with "escapes".',
        path: join(h.root, '.claude/skills/folder-name/SKILL.md'),
      },
      {
        name: 'in-menu',
        description: 'In the menu.',
        path: join(h.root, '.claude/skills/in-menu/SKILL.md'),
      },
      {
        name: 'no-front-matter',
        description: 'Review the code',
        path: join(h.root, '.claude/skills/no-front-matter/SKILL.md'),
      },
      {
        name: 'plans',
        description: 'Write plans.',
        manualOnly: true,
        path: join(h.root, '.claude/skills/plans/SKILL.md'),
      },
    ],
    codex: [],
  })
  expect(h.warnings).toEqual([
    `The skill file ${join(h.root, '.claude/skills/huge/SKILL.md')} could not be read. The list leaves out its skill.`,
  ])
})
