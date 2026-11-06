import { describe, expect, test } from 'vitest'
import { sectionPath } from '../shared/sections'
import { workspacePath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { OrgModel } from './org-model'
import {
  deleteSection,
  moveToSection,
  setSectionCollapsed,
} from './section-actions'
import { groupWorkspaces } from './sections'
import { valueOf } from './store'
import { testServices } from './test-kit'

const org = FAKE_IDS.org
const fixtures = workspaceFixtures()

async function loaded(server: FakeApiServer) {
  const model = new OrgModel(testServices(server), org)
  await model.reload('list')
  return model
}

function rows(model: OrgModel) {
  const groups = groupWorkspaces(
    valueOf(model.sections.get()) ?? [],
    valueOf(model.workspaces.get()) ?? [],
  )
  return Object.fromEntries(
    groups.sections.map((group) => [
      group.section.id,
      group.workspaces.map((workspace) => workspace.id),
    ]),
  )
}

describe('section actions', () => {
  test('a drop sends the section and the index, and the list shows the move', async () => {
    const server = new FakeApiServer()
    const moved = fixtures.workspaces.workspaces[0]
    server.json('PATCH', workspacePath(org, moved.id), {
      ...fixtures.detail,
      workspace: { ...moved, sectionId: 'checkout' },
    })
    const model = await loaded(server)
    const before = rows(model).checkout
    await moveToSection(model, moved.id, 'checkout', 1)
    expect(await server.requests.at(-1)?.json()).toEqual({
      sectionId: 'checkout',
      position: 1,
    })
    expect(rows(model).checkout).toEqual([
      before[0],
      moved.id,
      ...before.slice(1),
    ])
  })

  test('deleting a section moves its workspaces to General', async () => {
    const model = await loaded(new FakeApiServer())
    const general = rows(model).general
    const checkout = rows(model).checkout
    await deleteSection(model, 'checkout')
    expect(rows(model)).toEqual({
      general: [...general, ...checkout],
      infra: rows(model).infra,
    })
  })

  test('a collapse that the server refuses comes back', async () => {
    const server = new FakeApiServer()
    server.json(
      'PATCH',
      sectionPath(org, 'checkout'),
      { error: { code: 'server_error', message: 'The request failed.' } },
      500,
    )
    const model = await loaded(server)
    const error = await setSectionCollapsed(model, 'checkout', true).catch(
      (failure: unknown) => failure,
    )
    expect(error).toMatchObject({ code: 'server_error' })
    const checkout = valueOf(model.sections.get())?.find(
      (section) => section.id === 'checkout',
    )
    expect(checkout?.collapsed).toBe(
      coreFixtures().sectionList.sections[1].collapsed,
    )
  })
})
