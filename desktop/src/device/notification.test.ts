import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'

import { command } from '../../tests/device-support.js'
import { notifyCommand, workspaceDeviceAddress } from './notification.js'

it('names an untitled workspace in a background notification', () => {
  const create = vi.fn(() => ({ on: vi.fn(), show: vi.fn(), close: vi.fn() }))
  notifyCommand(command({ workspaceName: null }), {
    foreground: () => false,
    create,
    open: vi.fn(),
    warn: vi.fn(),
  })
  expect(create).toHaveBeenCalledWith({
    title: 'Run a command on this Mac?',
    body: 'An agent in Untitled asks to run printf hello.',
  })
})

it('shows a background native notice that only opens the matching workspace and dismisses stale notices', () => {
  const notice = Object.assign(new EventEmitter(), {
    show: vi.fn(),
    close: vi.fn(),
  })
  const create = vi.fn(() => notice)
  const open = vi.fn()
  const request = command({
    orgId: 'org /one',
    workspaceId: 'workspace /one',
    requestId: 'request /one',
  })
  const dependencies = { foreground: () => false, create, open, warn: vi.fn() }
  const dismiss = notifyCommand(request, dependencies)
  expect(create).toHaveBeenCalledWith({
    title: 'Run a command on this Mac?',
    body: 'An agent in Checkout address asks to run printf hello.',
  })
  expect(notice.show).toHaveBeenCalledOnce()
  expect(open).not.toHaveBeenCalled()
  notice.emit('click')
  expect(open).toHaveBeenCalledWith(request)
  expect(workspaceDeviceAddress(request)).toBe(
    'conductive-app://desktop/orgs/org%20%2Fone/workspaces/workspace%20%2Fone?sessionId=session-one&deviceRequestId=' +
      request.requestKey,
  )
  dismiss()
  notice.emit('click')
  expect(open).toHaveBeenCalledOnce()
  expect(notice.close).toHaveBeenCalledOnce()
  notifyCommand(request, { ...dependencies, foreground: () => true })
  expect(create).toHaveBeenCalledOnce()
})
