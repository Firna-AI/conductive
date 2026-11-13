import { join } from 'node:path'

import { expect, it } from 'vitest'

import { runnerHarness } from '../test-support/harness'
import { codexServers, skillReports, skillText } from '../test-support/skills'
import { SkillLists } from './skills'

function skillOptions() {
  return {
    skills: {
      lists: new SkillLists(),
      start: codexServers({ data: [] }).start,
    },
  }
}

it('reports the Claude skills with the names and descriptions that Claude takes, without those hidden from its menu, before runner.ready', async () => {
  const h = await runnerHarness(async (repository) => {
    const write = (folder: string, text: string) =>
      repository.write(`.claude/skills/${folder}/SKILL.md`, text)
    await write(
      'plans',
      skillText({
        name: 'plans',
        description: 'Write and keep plans.',
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
    await write('spaced', skillText({ name: 'has space', description: 'No.' }))
    await write(
      'model-only',
      skillText({
        description: 'Hidden from the menu.',
        'user-invocable': 'false',
      }),
    )
    await write(
      'in-menu',
      skillText({ description: 'In the menu.', 'user-invocable': 'true' }),
    )
    await write('huge', 'x'.repeat(1_048_577))
    await repository.write(
      '.claude/skills/loose.md',
      skillText({ name: 'loose', description: 'Not in a folder.' }),
    )
  }, skillOptions())
  expect(
    h.endpoint.runnerEvents.map(({ event }) => event.type).slice(-2),
  ).toEqual(['skills.updated', 'runner.ready'])
  expect(skillReports(h.endpoint.runnerEvents)).toEqual([
    {
      claude: [
        { name: 'folded', description: 'First part second part.' },
        { name: 'folder-name', description: 'Quoted: with "escapes".' },
        { name: 'in-menu', description: 'In the menu.' },
        { name: 'no-front-matter', description: 'Review the code' },
        {
          name: 'plans',
          description: 'Write and keep plans.',
          manualOnly: true,
        },
      ],
      codex: [],
    },
  ])
  const file = (folder: string) =>
    join(h.root, '.claude', 'skills', folder, 'SKILL.md')
  expect(h.warnings).toEqual([
    `The skill file ${file('huge')} could not be read. The list leaves out its skill.`,
    `The Claude skill of ${file('spaced')} has a name with white space, control characters, or too many characters. The list leaves it out.`,
  ])
})

it('filters known credentials from descriptions and leaves out a skill whose name holds one', async () => {
  const h = await runnerHarness(async (repository) => {
    await repository.write(
      '.claude/skills/deploy/SKILL.md',
      skillText({ description: 'Deploys with workspace-secret as its token.' }),
    )
    await repository.write(
      '.claude/skills/workspace-secret/SKILL.md',
      skillText({ description: 'Named after a credential.' }),
    )
  }, skillOptions())
  expect(skillReports(h.endpoint.runnerEvents)).toEqual([
    {
      claude: [
        {
          name: 'deploy',
          description: 'Deploys with [redacted] as its token.',
        },
      ],
      codex: [],
    },
  ])
  expect(h.warnings).toEqual([
    `The Claude skill of ${join(h.root, '.claude', 'skills', 'workspace-secret', 'SKILL.md')} has a name that holds a credential. The list leaves it out.`,
  ])
})

it('sends each description whole up to 4096 characters, leaves out a longer one, and keeps the first 200 skills by name', async () => {
  const h = await runnerHarness(async (repository) => {
    const write = (folder: string, description: string) =>
      repository.write(
        `.claude/skills/${folder}/SKILL.md`,
        skillText({ description }),
      )
    await write('long-whole', 'a'.repeat(4096))
    await write('long-omitted', 'b'.repeat(4097))
    for (let index = 0; index < 205; index++)
      await write(`skill-${String(index).padStart(3, '0')}`, `Skill ${index}.`)
  }, skillOptions())
  const [report] = skillReports(h.endpoint.runnerEvents)
  expect(report.claude).toHaveLength(200)
  expect(report.claude.slice(0, 3)).toEqual([
    { name: 'long-omitted', description: '' },
    { name: 'long-whole', description: 'a'.repeat(4096) },
    { name: 'skill-000', description: 'Skill 0.' },
  ])
  expect(report.claude.at(-1)).toEqual({
    name: 'skill-197',
    description: 'Skill 197.',
  })
  expect(h.warnings).toEqual([
    'The Claude skill long-omitted has a description over 4096 characters. The report leaves it out.',
    'The Claude list holds 207 skills. The report keeps the first 200 by name.',
  ])
})
