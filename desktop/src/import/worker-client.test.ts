import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'
import { runImportJob, stopImportJobs } from './worker-client.ts'

it('keeps late Git process registrations owned until cancellation cleanup and worker exit', async () => {
  class FixtureWorker extends EventEmitter {
    messages: unknown[] = []
    postMessage(message: unknown) {
      this.messages.push(message)
    }
    terminate = vi.fn(async () => {
      this.emit('exit', 0)
      return 0
    })
  }
  const worker = new FixtureWorker()
  const kill = vi.spyOn(process, 'kill').mockImplementation(() => true)
  const abort = new AbortController()
  try {
    const result = runImportJob(
      { home: '/source-home', userData: '/private-profile' },
      { action: 'exists' },
      abort.signal,
      () => worker,
    )
    abort.abort(new Error('Connection ended'))
    await expect(result).rejects.toThrow('Connection ended')
    expect(worker.messages).toEqual(['abort'])
    expect(worker.terminate).toHaveBeenCalledTimes(0)
    const stopped = stopImportJobs()
    expect(stopped).toBeInstanceOf(Promise)
    worker.emit('message', { kind: 'process', pid: 12345, active: true })
    expect(kill.mock.calls).toEqual([[-12345, 'SIGKILL']])
    worker.emit('message', { kind: 'error', code: 'read_failed' })
    await stopped
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(stopImportJobs()).toBeUndefined()
  } finally {
    kill.mockRestore()
    worker.emit('exit', 0)
  }
})
