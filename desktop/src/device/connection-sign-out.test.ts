import { expect, it } from 'vitest'

import {
  connected,
  connectionFixture,
} from '../../tests/device-connection-support.js'

it('reports a sign-out when the cookie goes, expires, or the Worker rejects it', async () => {
  const test = connectionFixture()
  await test.connection.start()
  test.events[0].message(connected)
  expect(test.signedOut).not.toHaveBeenCalled()

  test.setCredential(undefined)
  await test.connection.cookieChanged()
  expect(test.signedOut).toHaveBeenCalledTimes(1)

  test.setCredential({ value: 'next.signature', expiresAt: test.clock.now() })
  await test.connection.cookieChanged()
  expect(test.signedOut).toHaveBeenCalledTimes(2)

  test.setCredential({
    value: 'next.signature',
    expiresAt: test.clock.now() + 20_000,
  })
  await test.connection.cookieChanged()
  test.events[1].message(connected)
  test.advance(20_000)
  expect(test.signedOut).toHaveBeenCalledTimes(3)

  test.setCredential({
    value: 'next.signature',
    expiresAt: test.clock.now() + 100_000,
  })
  test.authenticate.mockResolvedValueOnce(undefined)
  await test.connection.cookieChanged()
  expect(test.signedOut).toHaveBeenCalledTimes(4)
})

it('keeps the sign-in across a sleep, a wake, and a lost socket', async () => {
  const test = connectionFixture()
  await test.connection.start()
  test.events[0].message(connected)
  test.connection.sleep()
  await test.connection.wake()
  test.events[1].message(connected)
  test.events[1].closed(false)
  test.advance(60_000)
  expect(test.signedOut).not.toHaveBeenCalled()
})
