import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'

import { startDesktop } from './lifecycle.js'

it('keeps one app instance and delivers startup and second-instance links to its window', async () => {
  let ready: () => void = () => {
    throw new Error('Readiness is not arranged')
  }
  const readiness = new Promise<void>((resolve) => {
    ready = resolve
  })
  const app = Object.assign(new EventEmitter(), {
    requestSingleInstanceLock: vi.fn(() => true),
    quit: vi.fn(),
    whenReady: () => readiness,
  })
  const active = {
    isDestroyed: () => false,
    isMinimized: () => false,
    loadURL: vi.fn(async () => {}),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
  }
  let notified: () => void = () => {
    throw new Error('Delivery is not arranged')
  }
  const delivery = new Promise<void>((resolve) => {
    notified = resolve
  })
  const received: string[] = []
  const createWindow = vi.fn(() => active)
  const dependencies = {
    app,
    arguments: [],
    prepare: vi.fn(),
    createWindow,
    receive: async (address: string) => {
      received.push(address)
      notified()
      return true
    },
    warn: (error: unknown) => {
      throw error
    },
  }
  startDesktop(dependencies)
  const event = { preventDefault: vi.fn() }
  app.emit(
    'open-url',
    event,
    'conductive://auth/github/callback#token=first.signature',
  )
  expect(received).toEqual([])
  ready()
  await delivery
  expect(event.preventDefault).toHaveBeenCalledTimes(1)
  expect(received).toEqual([
    'conductive://auth/github/callback#token=first.signature',
  ])
  app.emit('second-instance', {}, [
    'conductive://auth/github/callback#token=second.signature',
  ])
  expect(received).toEqual([
    'conductive://auth/github/callback#token=first.signature',
    'conductive://auth/github/callback#token=second.signature',
  ])
  expect(createWindow).toHaveBeenCalledTimes(1)
  expect(active.loadURL).toHaveBeenCalledWith('conductive-app://desktop/')
  expect(active.focus).toHaveBeenCalledTimes(2)
  app.requestSingleInstanceLock.mockReturnValue(false)
  startDesktop(dependencies)
  expect(app.quit).toHaveBeenCalledTimes(1)
  expect(createWindow).toHaveBeenCalledTimes(1)
})
