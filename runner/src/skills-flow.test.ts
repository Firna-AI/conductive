import { chmod } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it, onTestFinished } from 'vitest'

import { runnerHarness } from '../test-support/harness'
import { refresh } from '../test-support/reports'
import {
  ObservedLists,
  codexServers,
  skillReports,
  skillText,
} from '../test-support/skills'
import { SkillLists } from './skills'
import { EventStore } from './state'

const plans = (description: string) => skillText({ name: 'plans', description })

it('sends a new report when the watcher sees a changed SKILL.md, and none for a scan without a change', async () => {
  const lists = new ObservedLists()
  const servers = codexServers({ data: [] })
  const h = await runnerHarness(
    (repository) =>
      repository.write('.claude/skills/plans/SKILL.md', plans('Old text.')),
    { skills: { lists, start: servers.start } },
    true,
  )
  const changed = lists.until(
    (current) => current.of('claude')[0]?.description === 'New text.',
  )
  await h.write('.claude/skills/plans/SKILL.md', plans('New text.'))
  await changed
  await h.runner.skills?.refresh()
  expect(skillReports(h.endpoint.runnerEvents)).toEqual([
    { claude: [{ name: 'plans', description: 'Old text.' }], codex: [] },
    { claude: [{ name: 'plans', description: 'New text.' }], codex: [] },
  ])
  expect(servers.processes).toHaveLength(1)
  await h.runner.close()
  await h.runner.files.refresh()
})

it('answers a skills refresh with a full report of a new scan once for each command ID', async () => {
  const servers = codexServers({ data: [] })
  const h = await runnerHarness(undefined, {
    skills: { lists: new SkillLists(), start: servers.start },
  })
  await h.write('.claude/skills/plans/SKILL.md', plans('Added later.'))
  h.endpoint.send(refresh('skills.updated', 'skills-repair'))
  h.endpoint.send(refresh('skills.updated', 'skills-repair'))
  await h.runner.idle()
  h.endpoint.send(refresh('skills.updated', 'skills-repair-2'))
  await h.runner.idle()
  const added = {
    claude: [{ name: 'plans', description: 'Added later.' }],
    codex: [],
  }
  expect(skillReports(h.endpoint.runnerEvents)).toEqual([
    { claude: [], codex: [] },
    added,
    added,
  ])
  expect(h.warnings).toEqual([])
})

it('keeps an unconfirmed skills report in the saved outbox after a restart', async () => {
  const h = await runnerHarness(
    (repository) =>
      repository.write(
        '.claude/skills/plans/SKILL.md',
        skillText({
          description: 'Write plans.',
          'disable-model-invocation': 'true',
        }),
      ),
    {
      skills: {
        lists: new SkillLists(),
        start: codexServers({ data: [] }).start,
      },
    },
  )
  h.endpoint.confirmEvents = false
  h.endpoint.send(refresh('skills.updated', 'skills-repair'))
  await h.runner.idle()
  await h.runner.close()
  const store = await EventStore.open(h.storage)
  expect(
    store.snapshot.outbox
      .filter(({ event }) => event.type === 'skills.updated')
      .map(({ event }) => event),
  ).toEqual([
    {
      type: 'skills.updated',
      claude: [
        { name: 'plans', description: 'Write plans.', manualOnly: true },
      ],
      codex: [],
    },
  ])
})

it.skipIf(process.getuid?.() === 0)(
  'keeps the last Claude list when the Claude folder cannot be read',
  async () => {
    const h = await runnerHarness(
      (repository) =>
        repository.write('.claude/skills/plans/SKILL.md', plans('Kept.')),
      {
        skills: {
          lists: new SkillLists(),
          start: codexServers({ data: [] }).start,
        },
      },
    )
    const folder = join(h.root, '.claude', 'skills')
    await chmod(folder, 0o000)
    onTestFinished(() => chmod(folder, 0o755))
    h.endpoint.send(refresh('skills.updated', 'skills-repair'))
    await h.runner.idle()
    const kept = {
      claude: [{ name: 'plans', description: 'Kept.' }],
      codex: [],
    }
    expect(skillReports(h.endpoint.runnerEvents)).toEqual([kept, kept])
    expect(h.warnings).toEqual([
      'The Claude skill folders could not be read. The list keeps its last skills.',
    ])
  },
)
