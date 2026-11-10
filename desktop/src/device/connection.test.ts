import { expect, it } from 'vitest'

import {
  connected,
  connectionFixture,
} from '../../tests/device-connection-support.js'
import { command } from '../../tests/device-support.js'
import { deviceAccount } from './credentials.js'

it('connects from a saved cookie, pairs once, and sends heartbeats until the lease is missed', async () => {
  const test = connectionFixture()
  await test.connection.start()
  expect(test.connect.mock.calls[0][0]).toBe('first.signature')
  test.events[0].message(connected)
  expect(test.session.mock.calls[0].slice(0, 2)).toEqual([
    'user-one',
    { deviceId: 'local-device', connectionId: 'connection-one' },
  ])
  test.advance(10_000)
  expect(test.sockets[0].send).toHaveBeenCalledWith({ type: 'device.ping' })
  test.events[0].message({ type: 'device.pong' })
  test.advance(29_999)
  expect(test.dispose).not.toHaveBeenCalled()
  test.advance(1)
  expect(test.dispose).toHaveBeenCalledOnce()
  expect(test.sockets[0].close).toHaveBeenCalledOnce()
  test.setCredential(undefined)
  test.advance(1000)
  await Promise.resolve()
  expect(test.connect).toHaveBeenCalledTimes(1)
})

it('opens its device socket after app access arrives with the same cookie and no wake', async () => {
  const test = connectionFixture()
  let appAccess = false
  test.authenticate.mockImplementation((credential, signal) =>
    deviceAccount('https://app.conductive.test', credential, signal, async () =>
      Response.json({ user: { id: 'user-one' }, appAccess }),
    ),
  )
  await test.connection.start()
  expect(test.connect).not.toHaveBeenCalled()
  expect(test.session).not.toHaveBeenCalled()
  appAccess = true
  test.advance(999)
  expect(test.connect).not.toHaveBeenCalled()
  const opened = test.nextSocket()
  test.advance(1)
  expect(await opened).toBe(0)
  expect(test.connect).toHaveBeenCalledExactlyOnceWith(
    'first.signature',
    test.events[0],
  )
  test.events[0].message(connected)
  expect(test.session.mock.calls[0].slice(0, 2)).toEqual([
    'user-one',
    { deviceId: 'local-device', connectionId: 'connection-one' },
  ])
  test.connection.stop()
})

it('invalidates a live socket immediately on a cookie change and rejects stale callbacks', async () => {
  const test = connectionFixture()
  await test.connection.start()
  test.events[0].message(connected)
  test.setCredential({
    value: 'other.signature',
    expiresAt: test.clock.now() + 100_000,
  })
  const changing = test.connection.cookieChanged()
  expect(test.sockets[0].close).toHaveBeenCalledOnce()
  expect(test.dispose).toHaveBeenCalledOnce()
  test.events[0].message({ type: 'command.request', request: command() })
  expect(test.receive).not.toHaveBeenCalled()
  await changing
  expect(test.connect.mock.calls.map((call) => call[0])).toEqual([
    'first.signature',
    'other.signature',
  ])
  test.events[1].message(connected)
  test.setCredential(undefined)
  await test.connection.cookieChanged()
  test.advance(60_000)
  expect(test.connect).toHaveBeenCalledTimes(2)
  expect(test.dispose).toHaveBeenCalledTimes(2)
})

it('announces sleep and cancels on sleep, expiry, socket loss, and exit without reconnecting asleep', async () => {
  const test = connectionFixture()
  await test.connection.start()
  test.events[0].message(connected)
  test.connection.sleep()
  expect(test.sockets[0].send).toHaveBeenLastCalledWith({
    type: 'device.sleep',
  })
  test.advance(100_000)
  expect(test.connect).toHaveBeenCalledTimes(1)
  test.setCredential({
    value: 'first.signature',
    expiresAt: test.clock.now() + 20_000,
  })
  await test.connection.wake()
  test.events[1].message(connected)
  test.advance(20_000)
  expect(test.sockets[1].close).toHaveBeenCalledOnce()
  test.setCredential({
    value: 'first.signature',
    expiresAt: test.clock.now() + 100_000,
  })
  await test.connection.cookieChanged()
  test.events[2].message(connected)
  test.events[2].closed(false)
  expect(test.dispose).toHaveBeenCalledTimes(3)
  test.connection.stop()
  test.advance(60_000)
  await test.connection.wake()
  expect(test.connect).toHaveBeenCalledTimes(3)
})

it('does not retry a rejected handshake or dispatch a request before pairing', async () => {
  const test = connectionFixture()
  await test.connection.start()
  test.events[0].closed(true)
  test.advance(60_000)
  expect(test.connect).toHaveBeenCalledTimes(1)
  expect(test.readCredential).toHaveBeenCalledTimes(1)
  await test.connection.wake()
  test.events[1].message({ type: 'command.request', request: command() })
  expect(test.sockets[1].close).toHaveBeenCalledOnce()
  expect(test.receive).not.toHaveBeenCalled()
  test.advance(60_000)
  expect(test.connect).toHaveBeenCalledTimes(2)
  expect(test.readCredential).toHaveBeenCalledTimes(2)
})

it('retries temporary handshake loss with backoff and rereads the current credential', async () => {
  const test = connectionFixture()
  await test.connection.start()
  test.events[0].closed(false)
  test.advance(999)
  expect(test.connect).toHaveBeenCalledTimes(1)
  const second = test.nextSocket()
  test.advance(1)
  expect(await second).toBe(1)
  expect(test.readCredential).toHaveBeenCalledTimes(2)
  test.events[1].closed(false)
  test.advance(1999)
  expect(test.connect).toHaveBeenCalledTimes(2)
  const third = test.nextSocket()
  test.advance(1)
  expect(await third).toBe(2)
  test.events[2].closed(true)
  test.advance(60_000)
  expect(test.connect).toHaveBeenCalledTimes(3)
  await test.connection.cookieChanged()
  expect(test.connect).toHaveBeenCalledTimes(4)
})

it('abandons an in-flight authentication when another cookie replaces it', async () => {
  const test = connectionFixture()
  let resolve: (value: { userId: string; appAccess: boolean }) => void = () => {
    throw new Error('No pending authentication')
  }
  test.authenticate.mockImplementationOnce(
    () =>
      new Promise<{ userId: string; appAccess: boolean }>((done) => {
        resolve = done
      }),
  )
  const first = test.connection.start()
  await Promise.resolve()
  expect(test.authenticate).toHaveBeenCalledTimes(1)
  test.setCredential({
    value: 'other.signature',
    expiresAt: test.clock.now() + 100_000,
  })
  const replacement = test.connection.cookieChanged()
  expect(test.authenticate.mock.calls[0][1].aborted).toBe(true)
  resolve({ userId: 'user-one', appAccess: true })
  await first
  await replacement
  expect(test.connect.mock.calls.map((call) => call[0])).toEqual([
    'other.signature',
  ])
})
