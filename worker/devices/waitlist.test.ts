import { expect, it } from 'vitest'

import { grantAppAccess } from '../waitlist/grant'
import { deviceFixture } from './runtime.test-support'

it('refuses a waiting Mac socket and registers it with the same session after access arrives', async () => {
  const fixture = await deviceFixture()
  try {
    await fixture.db
      .prepare(
        "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('waiting', 104, 'waiting', 1, 1)",
      )
      .run()
    const token = await fixture.tokenFor('waiting')
    const waiting = await fixture.connect(token, 'waiting-mac')
    expect(waiting.response.status).toBe(403)
    expect(await waiting.response.json()).toMatchObject({
      error: { code: 'access_required' },
    })
    expect(waiting.socket).toBeNull()
    await grantAppAccess(fixture.db, 'waiting', { source: 'operator' }, 2)
    const admitted = await fixture.connect(token, 'waiting-mac')
    expect(admitted.response.status).toBe(101)
    expect(admitted.device).toMatchObject({ deviceId: 'waiting-mac' })
  } finally {
    await fixture.dispose()
  }
})
