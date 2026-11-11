import { execFile } from 'node:child_process'
import { constants } from 'node:fs'
import { open, rm, type FileHandle } from 'node:fs/promises'
import { join } from 'node:path'
import { setImmediate } from 'node:timers/promises'
import { promisify } from 'node:util'
import { Worker } from 'node:worker_threads'
import { expect, it } from 'vitest'
import { importFixture } from '../../tests/import-fixture.ts'
import { runImportJob, stopImportJobs } from './worker-client.ts'

function deferred<Value>() {
  let resolve: (value: Value) => void = () => {
    throw new Error('Event promise was not arranged.')
  }
  const promise = new Promise<Value>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function groupAlive(pid: number) {
  try {
    return process.kill(-pid, 0)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH')
      return false
    throw error
  }
}

it('cancels a real import worker during a Git read and waits for its process group to stop', async () => {
  const fixture = await importFixture()
  const config = join(fixture.workspace, '.git', 'config')
  const abort = new AbortController()
  const reason = new DOMException(
    'Synthetic device connection ended.',
    'AbortError',
  )
  const active = deferred<number>()
  const exit = deferred<void>()
  const processes = new Set<number>()
  let worker: Worker | undefined
  let writer: Promise<FileHandle> | undefined
  let exited = false
  try {
    await rm(config)
    await promisify(execFile)('mkfifo', ['-m', '600', config])
    writer = open(config, constants.O_WRONLY)
    let settled = false
    const result = runImportJob(
      fixture.locations,
      { action: 'scan' },
      abort.signal,
      (url, options) => {
        worker = new Worker(url, options)
        worker.once('exit', () => {
          exited = true
          exit.resolve()
        })
        worker.on('message', (message: unknown) => {
          if (
            typeof message === 'object' &&
            message !== null &&
            'kind' in message &&
            message.kind === 'process' &&
            'active' in message &&
            message.active === true &&
            'pid' in message &&
            typeof message.pid === 'number'
          ) {
            processes.add(message.pid)
            active.resolve(message.pid)
          }
        })
        return worker
      },
    )
    void result.then(
      () => {
        settled = true
      },
      () => {
        settled = true
      },
    )
    const [pid] = await Promise.race([
      Promise.all([active.promise, writer]),
      result.then(() => {
        throw new Error('The import ended before the Git read barrier.')
      }),
    ])

    expect(groupAlive(pid)).toBe(true)
    expect(await setImmediate('main event loop responded')).toBe(
      'main event loop responded',
    )
    expect(settled).toBe(false)
    abort.abort(reason)
    await expect(result).rejects.toBe(reason)
    await stopImportJobs()
    await exit.promise
    expect(exited).toBe(true)
    for (const processId of processes) expect(groupAlive(processId)).toBe(false)
    expect(stopImportJobs()).toBeUndefined()
  } finally {
    abort.abort(reason)
    const errors: unknown[] = []
    const clean = async (run: () => void | Promise<unknown>) => {
      try {
        await run()
      } catch (error) {
        errors.push(error)
      }
    }
    await clean(async () => {
      if (!writer) return
      const reader = await open(
        config,
        constants.O_RDONLY | constants.O_NONBLOCK,
      )
      try {
        await (await writer).close()
      } finally {
        await reader.close()
      }
    })
    for (const pid of processes) {
      await clean(() => {
        if (groupAlive(pid)) process.kill(-pid, 'SIGKILL')
      })
    }
    await clean(async () => worker?.terminate())
    await clean(async () => stopImportJobs())
    await clean(() => fixture.dispose())
    expect(errors).toEqual([])
  }
})
