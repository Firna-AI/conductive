import { ChildProcess } from 'node:child_process'
import { PassThrough } from 'node:stream'
import { expect, it, vi } from 'vitest'

import { localCommandLauncher } from './process.js'

it('starts the user shell in a process group and kills that whole group', () => {
  const child = new ChildProcess()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  Object.defineProperty(child, 'pid', { value: 412 })
  const create = vi.fn(() => child)
  const kill = vi.fn((): true => true)
  const events = {
    stdout: vi.fn(),
    stderr: vi.fn(),
    error: vi.fn(),
    close: vi.fn(),
  }
  const launch = localCommandLauncher('/bin/zsh', create, kill)
  const process = launch(' echo exact\n', '/Users/cal/with spaces', events)
  expect(create).toHaveBeenCalledWith(
    '/bin/zsh',
    ['-l', '-c', ' echo exact\n'],
    {
      cwd: '/Users/cal/with spaces',
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  child.stdout.emit('data', Buffer.from('out'))
  child.stderr.emit('data', Buffer.from('err'))
  child.emit('error', new Error('private failure'))
  child.emit('close', 5)
  expect(events.stdout).toHaveBeenCalledWith(Buffer.from('out'))
  expect(events.stderr).toHaveBeenCalledWith(Buffer.from('err'))
  expect(events.error).toHaveBeenCalledOnce()
  expect(events.close).toHaveBeenCalledWith(5)
  process.kill()
  expect(kill).toHaveBeenCalledWith(-412, 'SIGKILL')
  process.dispose()
  expect(child.stdout.destroyed).toBe(true)
  expect(child.stderr.destroyed).toBe(true)

  const home = vi.fn(() => '/Users/cal')
  const withHome = localCommandLauncher('/bin/zsh', create, kill, home)
  for (const [folder, cwd] of [
    ['~', '/Users/cal'],
    ['~/code/storefront', '/Users/cal/code/storefront'],
    ['~/linked/../storefront', '/Users/cal/linked/../storefront'],
    ['~another/code', '~another/code'],
    ['$HOME/code', '$HOME/code'],
    ['/Users/cal/with spaces', '/Users/cal/with spaces'],
  ]) {
    const process = withHome(' echo exact\n', folder, events)
    expect(create).toHaveBeenLastCalledWith(
      '/bin/zsh',
      ['-l', '-c', ' echo exact\n'],
      {
        cwd,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    process.dispose()
  }
  expect(home).toHaveBeenCalledTimes(3)
})
