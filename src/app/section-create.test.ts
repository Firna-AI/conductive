import { describe, expect, test } from 'vitest'
import { sectionsPath, type Section } from '../shared/sections'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { OrgModel } from './org-model'
import { createSection } from './section-actions'
import { groupWorkspaces } from './sections'
import { valueOf } from './store'
import { testServices } from './test-kit'

const org = FAKE_IDS.org

/** The reply of a create of Review at `position`. */
function review(position: number): { section: Section } {
  return {
    section: {
      id: 'review',
      orgId: org,
      name: 'Review',
      position,
      isDefault: false,
      collapsed: false,
    },
  }
}

/** Creates Review below `afterSectionId`, and gives the order of the list. */
async function created(afterSectionId?: string, position = 3) {
  const server = new FakeApiServer()
  server.json('POST', sectionsPath(org), review(position), 201)
  const model = new OrgModel(testServices(server), org)
  await model.reload('list')
  await createSection(model, 'Review', afterSectionId)
  return {
    sent: await server.requests.at(-1)?.json(),
    order: groupWorkspaces(
      valueOf(model.sections.get()) ?? [],
      valueOf(model.workspaces.get()) ?? [],
      FAKE_TIME,
    ).sections.map((group) => group.section.id),
  }
}

describe('the create of a section', () => {
  test('a create below a section sends it and shows the new section directly below it, and a create without one, or below a section that is gone, shows it at the end', async () => {
    expect({
      below: await created('general', 1),
      atEnd: await created(),
      gone: await created('deleted'),
    }).toEqual({
      below: {
        sent: { name: 'Review', afterSectionId: 'general' },
        order: ['general', 'review', 'checkout', 'infra'],
      },
      atEnd: {
        sent: { name: 'Review' },
        order: ['general', 'checkout', 'infra', 'review'],
      },
      gone: {
        sent: { name: 'Review', afterSectionId: 'deleted' },
        order: ['general', 'checkout', 'infra', 'review'],
      },
    })
  })
})
