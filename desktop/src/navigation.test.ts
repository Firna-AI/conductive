import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'
import { installNavigation } from './navigation.js'

it('admits native app actions only from the trusted main initiator', () => {
  const main = { url: `${DESKTOP_ORIGIN}/` }
  const child = { url: `${DESKTOP_ORIGIN}/` }
  let popup: (details: { url: string; referrer?: { url: string } }) => {
    action: 'deny'
  } = () => {
    throw new Error('Popup handler is not installed')
  }
  const contents = Object.assign(new EventEmitter(), {
    mainFrame: main,
    setWindowOpenHandler: (handler: typeof popup) => {
      popup = handler
    },
  })
  const dependencies = {
    load: vi.fn(async () => {}),
    external: vi.fn(async () => {}),
    signIn: vi.fn(async () => {}),
    warn: vi.fn(),
  }
  installNavigation(contents, 'https://app.conducting.test', dependencies)
  for (const eventName of ['will-navigate', 'will-redirect']) {
    for (const initiator of [child, null, undefined]) {
      const event = {
        url: 'https://app.conducting.test/frame-takeover',
        frame: main,
        initiator,
        isMainFrame: true,
        preventDefault: vi.fn(),
      }
      contents.emit(eventName, event)
      expect(event.preventDefault, eventName).toHaveBeenCalledTimes(1)
      expect(dependencies.load, eventName).not.toHaveBeenCalled()
      event.url = `${DESKTOP_ORIGIN}/api/auth/github`
      contents.emit(eventName, event)
      expect(dependencies.signIn, eventName).not.toHaveBeenCalled()
    }
  }
  for (const url of [
    `${DESKTOP_ORIGIN}/frame-takeover`,
    'https://app.conducting.test/frame-takeover',
    `${DESKTOP_ORIGIN}/api/auth/github`,
  ]) {
    expect(popup({ url, referrer: { url: `${DESKTOP_ORIGIN}/` } })).toEqual({
      action: 'deny',
    })
    expect(dependencies.load).not.toHaveBeenCalled()
    expect(dependencies.signIn).not.toHaveBeenCalled()
  }
  main.url = 'https://untrusted.test/'
  contents.emit('will-navigate', {
    url: `${DESKTOP_ORIGIN}/foreign-main`,
    frame: main,
    initiator: main,
    preventDefault: vi.fn(),
  })
  expect(dependencies.load).not.toHaveBeenCalled()
  main.url = `${DESKTOP_ORIGIN}/`
  const trusted = {
    url: 'https://app.conducting.test/trusted',
    frame: main,
    initiator: main,
    preventDefault: vi.fn(),
  }
  contents.emit('will-navigate', trusted)
  expect(dependencies.load).toHaveBeenCalledExactlyOnceWith(
    `${DESKTOP_ORIGIN}/trusted`,
  )
  trusted.url = `${DESKTOP_ORIGIN}/api/auth/github`
  contents.emit('will-navigate', trusted)
  expect(dependencies.signIn).toHaveBeenCalledTimes(1)
  popup({ url: 'https://example.com/review' })
  expect(dependencies.external).toHaveBeenCalledExactlyOnceWith(
    'https://example.com/review',
  )
})
