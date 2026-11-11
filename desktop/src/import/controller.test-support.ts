import { vi } from 'vitest'
import type {
  ImportControlResult,
  ImportDeviceFrame,
} from '../../../src/shared/conductor-import-operation.ts'
import { memoryFiles } from '../../tests/device-support.js'
import { createImportController } from './controller.ts'
import { createImportPreferences } from './preferences.ts'
import type { ImportJob, ImportJobResults, ImportJobs } from './types.ts'
import type { ImportPut } from './upload.ts'

export function controllerFixture(put?: ImportPut) {
  const files = memoryFiles()
  const prompt = vi.fn<() => Promise<boolean>>()
  const preferences = createImportPreferences({
    files: files.files,
    prompt,
    warn: vi.fn(),
  })
  const queued: { [A in ImportJob['action']]: ImportJobResults[A][] } = {
    exists: [],
    scan: [],
    row: [],
    prepare: [],
    reuse: [],
    build: [],
    seal: [],
    page: [],
    part: [],
    results: [],
    'lfs.page': [],
    'lfs.available': [],
  }
  const calls: ImportJob[] = []
  const jobs: ImportJobs = async <A extends ImportJob['action']>(
    job: Extract<ImportJob, { action: A }>,
  ) => {
    calls.push(job)
    const action: A = job.action
    const value = queued[action].shift()
    if (value === undefined) throw new Error(`Missing test reply: ${action}`)
    return value
  }
  const frames: ImportDeviceFrame[] = []
  const waiting: ((frame: ImportDeviceFrame) => void)[] = []
  const controller = createImportController({
    userId: 'user-one',
    preferences,
    jobs,
    put,
    warn: vi.fn(),
    send: (frame) => {
      if (frame.type === 'import.frame') {
        frames.push(frame)
        waiting.shift()?.(frame)
      }
      return true
    },
  })
  return {
    files,
    prompt,
    preferences,
    jobs,
    calls,
    frames,
    controller,
    queue<A extends ImportJob['action']>(
      action: A,
      value: ImportJobResults[A],
    ) {
      queued[action].push(value)
    },
    next: () =>
      new Promise<ImportDeviceFrame>((resolve) => waiting.push(resolve)),
    ack(
      frame: ImportDeviceFrame,
      result: ImportControlResult = { kind: 'accepted' },
    ) {
      controller.receive({
        type: 'import.ack',
        operationId: frame.operationId,
        sequence: frame.sequence,
        result,
      })
    },
    start(action: 'status' | 'dismiss' | 'scan', operationId: string = action) {
      controller.receive({
        type: 'import.operation',
        orgId: 'org-one',
        operationId,
        operation: { action },
      })
    },
  }
}
