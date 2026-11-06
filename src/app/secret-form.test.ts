import { describe, expect, test } from 'vitest'
import { boatKeyPath } from '../shared/api'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { OrgModel } from './org-model'
import { SecretForm } from './secret-form'
import { saveBoatKey } from './settings-actions'
import { testServices } from './test-kit'

const path = boatKeyPath(FAKE_IDS.org)

describe('SecretForm', () => {
  test('a saved secret leaves the field empty, and a refused one stays for a fix', async () => {
    const server = new FakeApiServer()
    const org = new OrgModel(testServices(server), FAKE_IDS.org)
    const form = new SecretForm()
    expect(await form.submit((key) => saveBoatKey(org, key))).toBe(false)
    expect(form.state.get().missing).toBe(true)
    expect(server.requests).toHaveLength(0)
    server.json(
      'PUT',
      path,
      {
        error: {
          code: 'boat_account_mismatch',
          message: 'This key uses another Boat account.',
        },
      },
      409,
    )
    form.set('boat_sk_other_account')
    expect(await form.submit((key) => saveBoatKey(org, key))).toBe(false)
    expect(form.value.get()).toBe('boat_sk_other_account')
    expect(form.state.get().error?.code).toBe('boat_account_mismatch')
    server.json('PUT', path, {
      configured: true,
      updatedAt: 1,
      lastFour: 'Qx2a',
    })
    form.set('boat_sk_same_account_Qx2a')
    expect(await form.submit((key) => saveBoatKey(org, key))).toBe(true)
    expect(await server.requests.at(-1)?.json()).toEqual({
      key: 'boat_sk_same_account_Qx2a',
    })
    expect(form.value.get()).toBe('')
    expect(org.boatKey.get()).toEqual({
      state: 'ready',
      value: { configured: true, updatedAt: 1, lastFour: 'Qx2a' },
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
