import {
  encryptedStartText,
  releasedStartLog,
  startLogContext,
} from './start-logs'
import type { AppDependencies, AppEnv } from '../env'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import { WorkspaceStartCoordinator } from './start-coordinator'
import type {
  WorkspaceStartJob,
  WorkspaceStartResult,
  StartJobStorage,
} from './start-types'

function storageGate() {
  let enter: () => void = () => {}
  let release: () => void = () => {}
  const entered = new Promise<void>((resolve) => {
    enter = resolve
  })
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  return {
    entered,
    release,
    wait: async () => {
      enter()
      await pending
    },
  }
}

export function startFixture(
  env: AppEnv,
  dependencies: AppDependencies,
  endpoint: WorkspaceLifecycleEndpoint,
  paused: boolean,
  onQueued: () => void,
) {
  let job: WorkspaceStartJob | undefined
  let result: WorkspaceStartResult | undefined
  let chunks: string[] = []
  let secretsCiphertext: string | undefined
  let context = ''
  let lastAccepted: WorkspaceStartJob | undefined
  const readLog = () =>
    releasedStartLog(env, context, chunks, secretsCiphertext)
  let pumping = false
  let epoch = 0
  let resultGate: ReturnType<typeof storageGate> | undefined
  let admissionGate: ReturnType<typeof storageGate> | undefined
  const storage: StartJobStorage = {
    job: async () => structuredClone(job),
    epoch: async () => epoch,
    stop: async () => {
      epoch++
      if (job) job = { ...job, cancelled: true }
      return Boolean(job)
    },
    begin: async (input, expected) => {
      if (admissionGate) {
        const gate = admissionGate
        admissionGate = undefined
        await gate.wait()
      }
      if (epoch !== expected) return false
      job = structuredClone(input)
      result = undefined
      chunks = []
      secretsCiphertext = undefined
      context = startLogContext(input.workspaceId, input.attempt)
      lastAccepted = structuredClone(input)
      onQueued()
      return true
    },
    update: async (input) => {
      if (job?.attempt === input.attempt)
        job = {
          ...structuredClone(input),
          cancelled: job.cancelled || input.cancelled,
        }
    },
    result: async () => {
      const stored = result
      if (resultGate) {
        const gate = resultGate
        resultGate = undefined
        await gate.wait()
      }
      return stored && !stored.ok
        ? {
            ...stored,
            error: { ...stored.error, log: (await readLog()) || null },
          }
        : stored
    },
    complete: async (input) => {
      if (!job || (job.cancelled && input.ok)) return
      result = structuredClone(input)
      job = undefined
    },
    secrets: async (values) => {
      secretsCiphertext = await encryptedStartText(
        env,
        context,
        JSON.stringify({ secrets: values }),
      )
    },
    capture: async (input, output) => {
      const encrypted: string[] = []
      for (const [stream, text] of [
        ['stdout', output.stdout],
        ['stderr', output.stderr],
      ]) {
        if (text)
          encrypted.push(
            await encryptedStartText(
              env,
              context,
              JSON.stringify({ stream, text }),
            ),
          )
      }
      if (job?.attempt !== input.attempt || job.cancelled) return
      chunks.push(...encrypted)
      job = {
        ...input,
        stdoutOffset: output.stdoutNextOffset,
        stderrOffset: output.stderrNextOffset,
      }
    },
    schedule: async () => {
      if (!paused) void pump()
    },
  }
  let coordinator = new WorkspaceStartCoordinator(
    env,
    dependencies,
    endpoint,
    storage,
  )
  async function pump() {
    if (pumping) return
    pumping = true
    try {
      while (await storage.job()) await coordinator.advance()
    } finally {
      pumping = false
    }
  }
  return {
    enqueue: (input: WorkspaceStartJob) => coordinator.enqueue(input),
    wait: () => coordinator.wait(),
    readLog,
    job: storage.job,
    lastAccepted: () => structuredClone(lastAccepted),
    storedCiphertexts: () => [...chunks],
    advance: () => coordinator.advance(),
    cancel: () => coordinator.cancel(),
    holdResultRead: () => {
      resultGate = storageGate()
      return resultGate
    },
    holdAdmission: () => {
      admissionGate = storageGate()
      return admissionGate
    },
    restart: () => {
      coordinator = new WorkspaceStartCoordinator(
        env,
        dependencies,
        endpoint,
        storage,
      )
    },
  }
}
