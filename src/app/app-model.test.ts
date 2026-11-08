import { describe, expect, test, vi } from 'vitest'
import { API_PATHS } from '../shared/api'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, fakeUsers } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { AppModel } from './app-model'
import { HeldRequests, testServices } from './test-kit'

const defaults = {
  repositoryId: 'storefront',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' } as const,
}

describe('AppModel', () => {
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

  test('a sign-out or another person forgets the admitted creates of the tab', async () => {
    const server = new FakeApiServer()
    const app = new AppModel(testServices(server))
    await app.start()
    const org = app.org(FAKE_IDS.org)
    const admit = async () => {
      const form = org.newWorkspace(null)
      form.setText('Let shoppers save their cart.')
      await form.send(defaults)
      return org.creations.of('saved-carts').get()?.state ?? null
    }
    expect(await admit()).toBe('starting')
    await app.account.signOut()
    expect(org.creations.of('saved-carts').get()).toBeNull()

    await app.start()
    expect(await admit()).toBe('starting')
    server.json('GET', API_PATHS.session, { user: fakeUsers[1] })
    await app.start()
    expect(org.creations.of('saved-carts').get()).toBeNull()
  })

  test('a create that answers after another person signed in changes nothing, and that person gets the form free and empty', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = new AppModel(testServices(server, { fetch: held.fetch }))
    await app.start()
    const org = app.org(FAKE_IDS.org)
    const createPath = workspacesPath(FAKE_IDS.org)
    const form = org.newWorkspace(null)
    form.setText('Let shoppers save their cart.')
    await form.attach([new File(['Cart notes'], 'notes.txt')])
    const sent = form.draft.get()
    const opened = vi.fn()
    held.holdAnswer('POST', createPath)
    const answer = form.send(defaults, opened)

    server.json('GET', API_PATHS.session, { user: fakeUsers[1] })
    await app.start()
    // What the other person sees at once, before the late answer.
    const free = { create: form.create.get(), draft: form.draft.get() }
    form.setText('A newer draft')
    held.release('POST', createPath)
    const reply = await answer

    expect(org.creations.of('saved-carts').get()).toBeNull()
    expect(opened).not.toHaveBeenCalled()
    expect(reply).toBeNull()
    expect(free.create).toEqual({ state: 'idle' })
    expect(free.draft).toMatchObject({ text: '', attachments: [] })
    expect(free.draft.messageId).not.toBe(sent.messageId)
    expect(form.create.get()).toEqual({ state: 'idle' })
    expect(form.draft.get().text).toBe('A newer draft')

    // The form works for that person, with a message of its own.
    const { created } = workspaceFixtures()
    const workspace = { ...created.workspace, id: 'gift-cards' }
    server.json('POST', createPath, { ...created, workspace }, 201)
    await form.send(defaults)
    const admitted = org.creations.of('gift-cards').get()
    expect(admitted?.submission.draft).toMatchObject({
      text: 'A newer draft',
      attachments: [],
      messageId: free.draft.messageId,
    })
  })
})
