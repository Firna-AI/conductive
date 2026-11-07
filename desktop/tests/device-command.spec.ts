import { spawnSync } from 'node:child_process'
import { watch } from 'node:fs'
import { mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { hostname, userInfo } from 'node:os'
import { dirname, resolve } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication } from '@playwright/test'

import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../worker/security/desktop-contract.js'
import { readConfiguration } from '../src/config.js'
import {
  deviceSessionEndpoint,
  installDeviceNetwork,
} from './device-network.js'
import { deviceRelay } from './device-relay.js'
import { command } from './device-support.js'
import { signInThroughMain } from './sign-in-journey.js'

function processReady(path: string) {
  const watcher = watch(dirname(path))
  const ready = new Promise<number>((resolve, reject) => {
    const read = async () => {
      try {
        const value = await readFile(path, 'utf8')
        if (/^[1-9][0-9]*$/.test(value)) resolve(Number(value))
      } catch (error) {
        if (!(
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        ))
          reject(error)
      }
    }
    watcher.on('change', () => void read())
    watcher.on('error', reject)
    void read()
  })
  return { ready, close: () => watcher.close() }
}

function processRunning(pid: number): boolean {
  const result = spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], {
    encoding: 'utf8',
  })
  if (result.error) throw result.error
  if (result.status === 1) return false
  if (result.status !== 0)
    throw new Error('Could not read command process state')
  return !result.stdout.trim().startsWith('Z')
}

test('main authenticates its device, executes an approved command, and cancels process groups on sleep and sign-out', async () => {
  const desktop = resolve(import.meta.dirname, '..')
  const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')
  await mkdir(evidence, { recursive: true })
  const profile = await mkdtemp(resolve(evidence, 'device-profile-'))
  const relay = await deviceRelay()
  const packaged = process.env.CONDUCTING_PACKAGED_APP
  let electron: ElectronApplication | undefined
  const readiness: ReturnType<typeof processReady>[] = []
  try {
    electron = await _electron.launch({
      ...(packaged ? { executablePath: packaged } : {}),
      args: [...(packaged ? [] : ['.']), `--user-data-dir=${profile}`],
      cwd: desktop,
    })
    const page = await electron.firstWindow()
    const configuration: unknown = JSON.parse(
      await readFile(resolve(desktop, 'dist/bundle/build-config.json'), 'utf8'),
    )
    const { appOrigin } = readConfiguration(configuration)
    const shellSession = await deviceSessionEndpoint(page, appOrigin)
    await shellSession(false)
    await installDeviceNetwork(electron, appOrigin, relay.port)
    await signInThroughMain(electron, appOrigin)
    await expect(
      page.getByRole('link', { name: 'Account', exact: true }),
    ).toBeVisible()
    await shellSession(true)
    const first = await relay.connection(0)
    expect(first.headers.origin).toBe(DESKTOP_ORIGIN)
    expect(first.headers.cookie).toBe(
      `${DESKTOP_SESSION_COOKIE}=session.signature`,
    )
    expect(first.headers.authorization).toBe('Bearer session.signature')
    expect(
      new URL(first.address, appOrigin).searchParams.get('deviceName'),
    ).toBe(hostname())
    first.send({
      type: 'settings.operation',
      operationId: 'real-device-name',
      operation: { action: 'read' },
    })
    expect(await first.take('settings.result')).toEqual({
      type: 'settings.result',
      operationId: 'real-device-name',
      settings: {
        deviceName: hostname(),
        alwaysAllowedCommands: [],
        workspaceWindows: [],
      },
    })
    const request = command({
      device: first.device,
      deviceName: hostname(),
      folder: profile,
    })
    first.send({ type: 'command.request', request })
    first.send({
      type: 'command.approval',
      workspaceId: request.workspaceId,
      requestId: request.requestId,
      operationId: 'allow-real-command',
      action: 'allow',
    })
    expect(await first.take('command.approved', request)).toEqual({
      type: 'command.approved',
      workspaceId: request.workspaceId,
      requestId: request.requestId,
    })
    expect(await first.take('command.result', request)).toEqual({
      type: 'command.result',
      workspaceId: request.workspaceId,
      requestId: request.requestId,
      result: {
        stdout: 'hello',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        truncated: false,
      },
    })

    const homeRequest = command({
      requestId: 'home-folder-command',
      device: first.device,
      deviceName: hostname(),
      command: 'pwd -P',
      folder: '~',
      reason: 'Check the home folder.',
    })
    first.send({ type: 'command.request', request: homeRequest })
    first.send({
      type: 'command.approval',
      workspaceId: homeRequest.workspaceId,
      requestId: homeRequest.requestId,
      operationId: 'allow-home-folder',
      action: 'allow',
    })
    expect(
      await Promise.race([
        first.take('command.result', homeRequest),
        first.take('command.failed', homeRequest),
      ]),
    ).toEqual({
      type: 'command.result',
      workspaceId: homeRequest.workspaceId,
      requestId: homeRequest.requestId,
      result: {
        stdout: `${await realpath(userInfo().homedir)}\n`,
        stderr: '',
        exitCode: 0,
        timedOut: false,
        truncated: false,
      },
    })

    const startChild = async (connection: typeof first, name: string) => {
      const path = resolve(profile, name)
      const observer = processReady(path)
      readiness.push(observer)
      const quoted = `'${path.replaceAll("'", "'\\''")}'`
      const request = command({
        requestId: name,
        device: connection.device,
        folder: profile,
        command: `tail -f /dev/null & child=$!; printf '%s' "$child" > ${quoted}; wait "$child"`,
      })
      connection.send({ type: 'command.request', request })
      connection.send({
        type: 'command.approval',
        workspaceId: request.workspaceId,
        requestId: name,
        operationId: name,
        action: 'allow',
      })
      await connection.take('command.approved', request)
      return observer.ready
    }
    const asleepChild = await startChild(first, 'sleep-command')
    expect(processRunning(asleepChild)).toBe(true)
    await electron.evaluate(({ powerMonitor }) => {
      powerMonitor.emit('suspend')
    })
    expect(await first.take('device.sleep')).toEqual({ type: 'device.sleep' })
    await first.closed
    await expect.poll(() => processRunning(asleepChild)).toBe(false)
    await electron.evaluate(({ powerMonitor }) => {
      powerMonitor.emit('resume')
    })
    const second = await relay.connection(1)
    expect(second.device.deviceId).toBe(first.device.deviceId)
    const signedOutChild = await startChild(second, 'signout-command')
    await electron.evaluate(
      async ({ BrowserWindow }, input) => {
        await BrowserWindow.getAllWindows()[0].webContents.session.cookies.remove(
          input.appOrigin,
          input.name,
        )
      },
      { appOrigin, name: DESKTOP_SESSION_COOKIE },
    )
    await second.closed
    await expect.poll(() => processRunning(signedOutChild)).toBe(false)
    await shellSession(false)
  } finally {
    readiness.forEach((entry) => entry.close())
    await electron?.close()
    await relay.close()
    await rm(profile, { recursive: true, force: true })
  }
})
