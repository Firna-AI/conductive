import { describe, expect, test } from 'vitest'
import { agentLoginPath } from '../shared/account'
import { FakeApiServer } from '../test-support/fake-api'
import { AppModel } from './app-model'
import { SecretForm } from './secret-form'
import { testServices } from './test-kit'

const path = agentLoginPath('codex')

describe('SecretForm', () => {
  test('a saved secret leaves the field empty, and a refused one stays for a fix', async () => {
    const server = new FakeApiServer()
    const app = new AppModel(testServices(server))
    await app.start()
    const sent = server.requests.length
    const form = new SecretForm()
    const save = (secret: string) =>
      app.account.saveLogin({ agent: 'codex', kind: 'api-key', secret })
    expect(await form.submit(save)).toBe(false)
    expect(form.state.get().missing).toBe(true)
    expect(server.requests).toHaveLength(sent)
    server.json(
      'PUT',
      path,
      {
        error: {
          code: 'login_refused',
          message: 'OpenAI refused this key.',
        },
      },
      400,
    )
    form.set('sk-refused')
    expect(await form.submit(save)).toBe(false)
    expect(form.value.get()).toBe('sk-refused')
    expect(form.state.get().error?.code).toBe('login_refused')
    server.json('PUT', path, {
      agent: 'codex',
      connected: true,
      kind: 'api-key',
      updatedAt: 1,
    })
    form.set('sk-accepted')
    expect(await form.submit(save)).toBe(true)
    expect(await server.requests.at(-1)?.json()).toEqual({
      agent: 'codex',
      kind: 'api-key',
      secret: 'sk-accepted',
    })
    expect(form.value.get()).toBe('')
    expect(app.account.login('codex')).toEqual({
      agent: 'codex',
      connected: true,
      kind: 'api-key',
      updatedAt: 1,
    })
  })

  test('an env var value goes out as typed, also an empty one', async () => {
    const form = new SecretForm({ raw: true })
    const sent: string[] = []
    const save = async (value: string) => {
      sent.push(value)
    }
    expect(await form.submit(save)).toBe(true)
    form.set('  two spaces  ')
    expect(await form.submit(save)).toBe(true)
    expect(sent).toEqual(['', '  two spaces  '])
  })
})
