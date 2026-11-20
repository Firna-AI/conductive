import { describe, expect, test } from 'vitest'
import { WorkspaceStream } from '../../app/events'
import { ManualDelay, RecordingEvents } from '../../app/test-kit'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { WorkspaceSkills } from './workspace-skills'

const workspaceId = FAKE_IDS.workspace

/** A raw envelope of the socket, as the Worker sends it. */
function raw(eventNumber: number, event: object) {
  return { workspaceId, eventNumber, occurredAt: FAKE_TIME, event }
}

/** The skill lists of the workspace, which follow its real stream. */
function followed() {
  const source = new RecordingEvents()
  const target = { orgId: FAKE_IDS.org, workspaceId }
  const stream = new WorkspaceStream(source, target, new ManualDelay().delay)
  const skills = new WorkspaceSkills()
  skills.follow(stream)
  stream.start()
  let changes = 0
  skills.subscribe(() => (changes += 1))
  return { source, skills, changes: () => changes }
}

const plans = { name: 'plans', description: 'Write a plan.' }
const review = { name: 'review', description: 'Review.', manualOnly: true }
const report = (claude: object[], codex: object[]) => ({
  type: 'skills.updated',
  skills: { claude, codex },
})

describe('the skill lists of a workspace', () => {
  test('load until the first report, then take the latest report of the stored history and each live report', () => {
    const { source, skills } = followed()
    const before = skills.getSnapshot()
    source.send({
      type: 'history',
      history: {
        events: [raw(1, report([plans], [])), raw(2, report([], [review]))],
        throughEventNumber: 2,
      },
    })
    const stored = skills.getSnapshot()
    source.send({
      type: 'event',
      envelope: raw(3, { type: 'skills.updated', skills: null }),
    })
    expect({ before, stored, live: skills.getSnapshot() }).toEqual({
      before: { state: 'loading' },
      stored: { state: 'ready', lists: { claude: [], codex: [review] } },
      live: { state: 'unavailable' },
    })
  })

  test('a report that the app cannot read keeps the last lists and tells no reader', () => {
    const { source, skills, changes } = followed()
    source.send({
      type: 'history',
      history: { events: [raw(1, report([plans], []))], throughEventNumber: 1 },
    })
    const seen = changes()
    source.send({
      type: 'event',
      envelope: raw(2, report([{ name: 7 }], [])),
    })
    expect({
      snapshot: skills.getSnapshot(),
      changes: changes() - seen,
    }).toEqual({
      snapshot: { state: 'ready', lists: { claude: [plans], codex: [] } },
      changes: 0,
    })
  })
})
