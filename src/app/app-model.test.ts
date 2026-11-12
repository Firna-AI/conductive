import { describe, expect, test, vi } from 'vitest'
import { ACCOUNT_PATHS } from '../shared/account'
import { API_PATHS } from '../shared/api'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  fakeUsers,
} from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { AppModel } from './app-model'
import { ApiError } from './api/client'
import { HeldRequests, testServices } from './test-kit'

const defaults = {
  repositoryId: 'storefront',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' } as const,
}

describe('AppModel', () => {
  test('the account keeps the saved workspace view and changes it only after a valid save', async () => {
    const server = new FakeApiServer()
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      newWorkspaceView: 'dialog',
    })
    const held = new HeldRequests(server)
    const app = new AppModel(testServices(server, { fetch: held.fetch }))
    await app.start()
    const account = app.account.account.get()
    expect(account?.newWorkspaceView).toBe('dialog')

    held.holdAnswer('PUT', ACCOUNT_PATHS.newWorkspaceView)
    const save = app.account.setNewWorkspaceView('page')
    expect(app.account.account.get()?.newWorkspaceView).toBe('dialog')
    held.release('PUT', ACCOUNT_PATHS.newWorkspaceView)
    await save
    const request = server.requests.at(-1)
    expect(request?.method).toBe('PUT')
    expect(new URL(request?.url ?? '').pathname).toBe(
      ACCOUNT_PATHS.newWorkspaceView,
    )
    expect(await request?.json()).toEqual({ view: 'page' })
    expect(app.account.account.get()).toEqual({
      ...account,
      newWorkspaceView: 'page',
    })

    server.json('PUT', ACCOUNT_PATHS.newWorkspaceView, { view: 'page' })
    await app.account.setNewWorkspaceView('dialog')
    expect(app.account.account.get()?.newWorkspaceView).toBe('page')

    server.json('PUT', ACCOUNT_PATHS.newWorkspaceView, { view: 'drawer' })
    await expect(
      app.account.setNewWorkspaceView('dialog'),
    ).rejects.toBeInstanceOf(ApiError)
    expect(app.account.account.get()?.newWorkspaceView).toBe('page')

    server.json(
      'PUT',
      ACCOUNT_PATHS.newWorkspaceView,
      {
        error: { code: 'save_failed', message: 'Try again.' },
      },
      503,
    )
    await expect(
      app.account.setNewWorkspaceView('dialog'),
    ).rejects.toMatchObject({
      status: 503,
      code: 'save_failed',
    })
    expect(app.account.account.get()?.newWorkspaceView).toBe('page')
  })

  test('a failed org move takes back only that move, and keeps a later move and a new org', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = new AppModel(testServices(server, { fetch: held.fetch }))
    await app.start()
    const order = () => app.orgs.get().map((org) => org.id)
    held.hold('PUT', API_PATHS.orgOrder)
    held.hold('PUT', API_PATHS.orgOrder)
    // The rail starts as Acme, Futex, Firna.
    const first = app.moveOrg('firna', 0)
    const second = app.moveOrg('acme', 2)
    app.putOrg({ id: 'labs', name: 'Acme Labs', role: 'admin' })
    const shown = order()

    server.json(
      'PUT',
      API_PATHS.orgOrder,
      { error: { code: 'save_failed', message: 'Try again.' } },
      503,
    )
    held.release('PUT', API_PATHS.orgOrder)
    await expect(first).rejects.toMatchObject({
      status: 503,
      code: 'save_failed',
    })
    const afterFailure = order()
    server.empty('PUT', API_PATHS.orgOrder)
    held.release('PUT', API_PATHS.orgOrder)
    await second

    expect({ shown, afterFailure, saved: order() }).toEqual({
      shown: ['firna', 'futex', 'acme', 'labs'],
      afterFailure: ['futex', 'firna', 'acme', 'labs'],
      saved: ['futex', 'firna', 'acme', 'labs'],
    })
  })

  test('a session that the Worker refuses shows the sign-in, not an error', async () => {
    const server = new FakeApiServer()
    server.json(
      'GET',
      API_PATHS.session,
      { error: { code: 'unauthorized', message: 'Sign in to continue.' } },
      401,
    )
    const app = new AppModel(testServices(server))
    await app.start()
    expect(app.boot.get()).toEqual({ state: 'signed-out' })
  })

  test('a create that answers after another person signed in changes nothing, and that person gets the form free and empty', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = new AppModel(testServices(server, { fetch: held.fetch }))
    await app.start()
    const org = app.org(FAKE_IDS.org)
    await org.reload('list')
    const createPath = workspacesPath(FAKE_IDS.org)
    const form = org.newWorkspace(null)
    form.setText('Let shoppers save their cart.')
    await form.attach([new File(['Cart notes'], 'notes.txt')])
    const sent = form.draft.get()
    const opened = vi.fn()
    held.holdAnswer('POST', createPath)
    const answer = form.send(defaults, opened)

    server.signIn(fakeUsers[1])
    await app.start()
    // What the other person sees at once, before the late answer.
    const free = { create: form.create.get(), draft: form.draft.get() }
    form.setText('A newer draft')
    held.release('POST', createPath)
    const reply = await answer

    expect(org.workspace('saved-carts')).toBeUndefined()
    expect(opened).not.toHaveBeenCalled()
    expect(reply).toBeNull()
    expect(free.create).toEqual({ state: 'idle' })
    expect(free.draft).toMatchObject({ text: '', files: [] })
    expect(free.draft.messageId).not.toBe(sent.messageId)
    expect(form.create.get()).toEqual({ state: 'idle' })
    expect(form.draft.get().text).toBe('A newer draft')

    // The form works for that person, with a message of its own.
    const { created } = workspaceFixtures()
    const workspace = { ...created.workspace, id: 'gift-cards' }
    server.json('POST', createPath, { ...created, workspace }, 201)
    await form.send(defaults)
    const creates = server.requests.filter(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === createPath,
    )
    expect(await creates.at(-1)?.json()).toMatchObject({
      firstMessage: {
        id: free.draft.messageId,
        text: 'A newer draft',
        attachmentIds: [],
      },
    })
    expect(org.workspace('gift-cards')?.id).toBe('gift-cards')
  })

  test('another person who signs in gets no GitHub access of the person before', async () => {
    const server = new FakeApiServer()
    const app = new AppModel(testServices(server))
    await app.start()
    const access = app.org(FAKE_IDS.org).githubAccessOf('storefront')
    access.set({ canWrite: true, mergeMethod: 'squash' })
    const kept = access.get()

    server.signIn(fakeUsers[1])
    await app.start()

    expect(kept).toEqual({ canWrite: true, mergeMethod: 'squash' })
    expect(access.get()).toBeUndefined()
  })
})
