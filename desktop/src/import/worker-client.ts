import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Worker } from 'node:worker_threads'
import type { WorkerOptions } from 'node:worker_threads'
import type {
  ImportJob,
  ImportJobResults,
  ImportLocationsInput,
} from './types.ts'
import { LocalImportError } from './types.ts'

interface WorkerReply<Value> {
  kind: string
  pid?: number
  active?: boolean
  code?: string
  value?: Value
}
interface ImportWorker<Value> {
  on(event: 'message', listener: (message: WorkerReply<Value>) => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
  on(event: 'exit', listener: () => void): unknown
  once(event: 'exit', listener: () => void): unknown
  postMessage(message: unknown): void
  terminate(): Promise<number>
}
const activeWorkers = new Map<
  object,
  { cancel(): void; stopped: Promise<void> }
>()

/** Quit waits for late Git registrations and the worker's exit acknowledgement. */
export function stopImportJobs(): Promise<void> | undefined {
  if (!activeWorkers.size) return
  const tasks = [...activeWorkers.values()]
  for (const task of tasks) task.cancel()
  return Promise.all(tasks.map((task) => task.stopped)).then(() => undefined)
}

/** A task owns its worker and Git process groups. A connection owns its signal. */
export async function runImportJob<A extends ImportJob['action']>(
  locations: ImportLocationsInput,
  job: Extract<ImportJob, { action: A }>,
  signal: AbortSignal,
  createWorker: (
    url: URL,
    options: WorkerOptions,
  ) => ImportWorker<ImportJobResults[A]> = (url, options) =>
    new Worker(url, options),
): Promise<ImportJobResults[A]> {
  signal.throwIfAborted()
  const compiled = pathToFileURL(
    fileURLToPath(new URL('./worker.js', import.meta.url)).replace(
      /app\.asar([/\\])/,
      'app.asar.unpacked$1',
    ),
  )
  const worker = createWorker(
    existsSync(compiled) ? compiled : new URL('./worker.ts', import.meta.url),
    {
      workerData: { locations, job },
      execArgv: [],
    },
  )
  const processes = new Set<number>()
  return new Promise<ImportJobResults[A]>((resolve, reject) => {
    let ended = false
    let cancelling = false
    const killProcess = (pid: number) => {
      try {
        process.kill(-pid, 'SIGKILL')
      } catch {
        /* A Git group can finish before cancellation. */
      }
    }
    const kill = () => {
      for (const pid of processes) killProcess(pid)
      processes.clear()
    }
    const finish = (error?: unknown, value?: ImportJobResults[A]) => {
      if (ended) {
        if (cancelling) {
          kill()
          void worker.terminate()
        }
        return
      }
      ended = true
      signal.removeEventListener('abort', cancelled)
      kill()
      void worker.terminate()
      if (error !== undefined) reject(error)
      else if (value !== undefined) resolve(value)
      else reject(new LocalImportError('read_failed'))
    }
    const cancelled = () => {
      if (ended) return
      ended = true
      cancelling = true
      signal.removeEventListener('abort', cancelled)
      kill()
      // Keep the worker alive until it acknowledges abort, including late PIDs.
      worker.postMessage('abort')
      reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
    }
    const stopped = new Promise<void>((resolve) =>
      worker.once('exit', () => resolve()),
    )
    activeWorkers.set(worker, { cancel: cancelled, stopped })
    void stopped.then(() => activeWorkers.delete(worker))
    signal.addEventListener('abort', cancelled, { once: true })
    worker.on('error', finish)
    worker.on('exit', () => {
      kill()
      if (!ended) finish(new LocalImportError('read_failed'))
    })
    worker.on(
      'message',
      (message: {
        kind: string
        pid?: number
        active?: boolean
        code?: string
        value?: ImportJobResults[A]
      }) => {
        if (
          message.kind === 'process' &&
          typeof message.pid === 'number' &&
          Number.isSafeInteger(message.pid) &&
          message.pid > 1
        ) {
          if (message.active && cancelling) killProcess(message.pid)
          else if (message.active) processes.add(message.pid)
          else processes.delete(message.pid)
        }
        if (message.kind === 'result') finish(undefined, message.value)
        if (message.kind === 'error')
          finish(
            new LocalImportError(
              message.code === 'source_missing' ||
                message.code === 'source_changed' ||
                message.code === 'upload_failed'
                ? message.code
                : 'read_failed',
            ),
          )
      },
    )
  })
}
