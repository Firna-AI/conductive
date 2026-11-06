import { describe, expect, test } from 'vitest'
import { sectionPath } from '../shared/sections'
import { workspacePath, workspacesPath } from '../shared/workspaces'
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
import { HeldRequests, testServices } from './test-kit'

const org = FAKE_IDS.org
const fixtures = workspaceFixtures()
const refused = {
  error: { code: 'server_error', message: 'The request failed.' },
}

async function loaded(server: FakeApiServer, held?: HeldRequests) {
  const model = new OrgModel(testServices(server, { fetch: held?.fetch }), org)
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

function sectionOf(model: OrgModel, sectionId: string) {
  return valueOf(model.sections.get())?.find(
    (section) => section.id === sectionId,
  )
}

function fixture(workspaceId: string) {
  const workspace = fixtures.workspaces.workspaces.find(
    (item) => item.id === workspaceId,
  )
  if (!workspace) throw new Error(`The fixture has no ${workspaceId}.`)
  return workspace
}

/** Keeps the error of a write that the test lets fail. */
const caught = (error: unknown) => error

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
    server.json('PATCH', sectionPath(org, 'checkout'), refused, 500)
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

  test('a failed collapse takes back only the collapse, and keeps a move and an update from its wait', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const collapse = sectionPath(org, 'checkout')
    server.json('PATCH', collapse, refused, 500)
    server.json('PATCH', workspacePath(org, 'email-dark-mode'), {
      ...fixtures.detail,
      workspace: { ...fixture('email-dark-mode'), sectionId: 'checkout' },
    })
    const model = await loaded(server, held)
    held.hold('PATCH', collapse)
    const collapsing = setSectionCollapsed(model, 'checkout', true).catch(
      caught,
    )
    await moveToSection(model, 'email-dark-mode', 'checkout', 0)
    model.putWorkspace({ ...fixture(FAKE_IDS.workspace), state: 'working' })
    held.release('PATCH', collapse)
    expect(await collapsing).toMatchObject({ code: 'server_error' })
    expect({
      checkout: rows(model).checkout,
      collapsed: sectionOf(model, 'checkout')?.collapsed,
      state: model.workspace(FAKE_IDS.workspace)?.state,
    }).toEqual({
      checkout: [
        'email-dark-mode',
        'fix-cart-flake',
        'webhook-retries',
        'apple-pay',
        'checkout-autocomplete',
      ],
      collapsed: false,
      state: 'working',
    })
  })

  test('two moves of one workspace that both fail put it back in its place', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const path = workspacePath(org, 'email-dark-mode')
    server.json('PATCH', path, refused, 500)
    const model = await loaded(server, held)
    held.hold('PATCH', path)
    held.hold('PATCH', path)
    const first = moveToSection(model, 'email-dark-mode', 'checkout', 0)
    const second = moveToSection(model, 'email-dark-mode', 'infra', 0)
    held.release('PATCH', path)
    await first.catch(caught)
    expect(rows(model).infra).toEqual([
      'email-dark-mode',
      'next-16',
      'retry-queue',
    ])
    held.release('PATCH', path)
    await second.catch(caught)
    expect(rows(model)).toEqual({
      general: ['email-dark-mode', 'invoice-fonts', 'pricing-copy'],
      checkout: [
        'fix-cart-flake',
        'webhook-retries',
        'apple-pay',
        'checkout-autocomplete',
      ],
      infra: ['next-16', 'retry-queue'],
    })
  })

  test('a read of the list while a collapse waits keeps the collapse in view, and keeps the read when the collapse fails', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const collapse = sectionPath(org, 'checkout')
    server.json('PATCH', collapse, refused, 500)
    const model = await loaded(server, held)
    held.hold('PATCH', collapse)
    const collapsing = setSectionCollapsed(model, 'checkout', true).catch(
      caught,
    )
    // On the server, the turn of fix-cart-flake ends while the collapse waits.
    server.json('GET', workspacesPath(org), {
      workspaces: fixtures.workspaces.workspaces.map((workspace) =>
        workspace.id === 'fix-cart-flake'
          ? { ...workspace, state: 'unread' }
          : workspace,
      ),
    })
    await model.reload('list')
    const seen = () => ({
      collapsed: sectionOf(model, 'checkout')?.collapsed,
      state: model.workspace('fix-cart-flake')?.state,
    })
    expect(seen()).toEqual({ collapsed: true, state: 'unread' })
    held.release('PATCH', collapse)
    await collapsing
    expect(seen()).toEqual({ collapsed: false, state: 'unread' })
  })

  test('a move answer keeps a newer state from an event, and an older record keeps the new place', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const path = workspacePath(org, FAKE_IDS.workspace)
    const moved = { ...fixtures.detail.workspace, sectionId: 'general' }
    server.json('PATCH', path, { ...fixtures.detail, workspace: moved })
    const model = await loaded(server, held)
    held.hold('PATCH', path)
    const moving = moveToSection(model, FAKE_IDS.workspace, 'general', 0)
    // The agent starts to work while the move waits, so its answer is older.
    model.putWorkspace({ ...fixtures.detail.workspace, state: 'working' })
    held.release('PATCH', path)
    await moving
    const seen = () => ({
      general: rows(model).general,
      state: model.workspace(FAKE_IDS.workspace)?.state,
    })
    const expected = {
      general: [
        'checkout-autocomplete',
        'email-dark-mode',
        'invoice-fonts',
        'pricing-copy',
      ],
      state: 'working',
    }
    expect(seen()).toEqual(expected)
    // A later read has the move. Then the open workspace puts its record
    // from before the move, as it does after each event.
    server.json('GET', workspacesPath(org), {
      workspaces: [
        { ...moved, state: 'working' },
        ...fixtures.workspaces.workspaces.filter(
          (workspace) => workspace.id !== FAKE_IDS.workspace,
        ),
      ],
    })
    await model.reload('list')
    model.putWorkspace({ ...fixtures.detail.workspace, state: 'working' })
    expect(seen()).toEqual(expected)
  })
})
