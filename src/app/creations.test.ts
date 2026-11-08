import { describe, expect, test } from 'vitest'
import type { WorkspaceState } from '../shared/workspaces'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { readEnvelope } from './api/read-events'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import { HeldRequests, testServices } from './test-kit'

const org = FAKE_IDS.org
const createPath = workspacesPath(org)
const { created, workspaces } = workspaceFixtures()
const choice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
} as const
const defaults = {
  repositoryId: 'storefront',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' } as const,
}

async function loaded(server: FakeApiServer, held?: HeldRequests) {
  const model = new OrgModel(testServices(server, { fetch: held?.fetch }), org)
  await model.reload('list')
  return model
}

/** The next create answers with this workspace ID. */
function nextCreate(server: FakeApiServer, workspaceId: string) {
  const workspace = { ...created.workspace, id: workspaceId }
  server.json('POST', createPath, { ...created, workspace }, 201)
}

/** A `workspace.updated` event of a workspace, as the stream reads it. */
function update(workspaceId: string, state: WorkspaceState) {
  return readEnvelope({
    workspaceId,
    eventNumber: 1,
    occurredAt: FAKE_TIME,
    event: {
      type: 'workspace.updated',
      workspace: { ...created.workspace, id: workspaceId, state },
    },
  })
}

const listed = (model: OrgModel) =>
  (valueOf(model.workspaces.get()) ?? []).map((item) => item.id)

describe('Creations', () => {
  test('gives each failed start its sent message back in a form of its own, and keeps the newer draft and the other create', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const model = await loaded(server, held)
    const form = model.newWorkspace('checkout')
    form.setText('Let shoppers save their cart.')
    form.setChoice(choice)
    await form.attach([new File(['Cart notes'], 'notes.txt')])
    await form.send(defaults)
    nextCreate(server, 'gift-cards')
    form.setText('Add gift cards.')
    await form.send(defaults)
    form.setText('A newer draft')
    // A list read that started before the failure still lists both creates.
    server.json('GET', createPath, {
      workspaces: [
        created.workspace,
        { ...created.workspace, id: 'gift-cards' },
        ...workspaces.workspaces,
      ],
    })
    held.holdAnswer('GET', createPath)
    const older = model.reload('list')

    model.creations.observe('saved-carts', update('saved-carts', 'error'))
    held.release('GET', createPath)
    await older

    const failed = model.creations.of('saved-carts').get()
    expect(failed).toMatchObject({
      state: 'failed',
      submission: { workspaceId: 'saved-carts', sectionId: 'checkout' },
    })
    if (failed?.state !== 'failed') throw new Error('The create did not fail.')
    expect(failed.form.draft.get()).toMatchObject({
      text: 'Let shoppers save their cart.',
      files: [{ state: 'ready', attachment: { id: 'draft-attachment-1' } }],
      messageId: 'client-1',
      repositoryId: 'storefront',
      choice,
    })
    expect(failed.form.create.get()).toEqual({ state: 'not-started' })
    expect(model.creations.of('gift-cards').get()?.state).toBe('starting')
    expect(form.draft.get().text).toBe('A newer draft')
    expect(listed(model)).not.toContain('saved-carts')
    expect(listed(model)).toContain('gift-cards')
  })

  test('keeps a create until its start succeeds, and a 404 of a starting create fails it', async () => {
    const server = new FakeApiServer()
    const model = await loaded(server)
    const form = model.newWorkspace(null)
    form.setText('Fix the flaky cart test.')
    await form.send(defaults)
    nextCreate(server, 'gift-cards')
    form.setText('Add gift cards.')
    await form.send(defaults)
    const state = () => model.creations.of('saved-carts').get()?.state ?? null

    for (const kept of ['starting', 'stopped', 'archived'] as const) {
      model.creations.observe('saved-carts', update('saved-carts', kept))
      expect(state(), kept).toBe('starting')
    }
    model.creations.observe('saved-carts', update('saved-carts', 'ready'))
    expect(state()).toBeNull()
    model.creations.observe('saved-carts', update('saved-carts', 'error'))
    expect(state()).toBeNull()

    model.creations.removed('gift-cards')
    expect(model.creations.of('gift-cards').get()?.state).toBe('failed')
    model.creations.removed('unknown')
    expect(model.creations.of('unknown').get()).toBeNull()
  })
})
