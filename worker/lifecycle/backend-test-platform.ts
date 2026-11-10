import type { RunnerEvent } from '../../src/shared/runner'
import { HttpError } from '../http'
import { heldOperation } from '../test-support/held-operation'
import type { TestHarness } from '../test-support/harness'
import type { NativeWorkspaceOptions } from '../test-support/native-workspace-api'
import type { NativeStorageHooks } from '../test-support/native-storage'
import type { StoredWorkspaceStartJob } from './start-job-codec'
import { START_JOB_KEY, START_RESULT_KEY } from './start-storage'
import type { WorkspaceEventPublication } from './workspace-platform'

function readyEndpoint<T extends object>(endpoint: T, ready: Promise<void>): T {
  return new Proxy(endpoint, {
    get: (target, key) => {
      const method: unknown = Reflect.get(target, key)
      if (typeof method !== 'function') return method
      return async (...arguments_: unknown[]) => {
        await ready
        return Reflect.apply(method, target, arguments_)
      }
    },
  })
}

export function backendActor(
  harness: TestHarness,
  id: string,
  environment: Record<string, string | undefined>,
  changed: () => void,
  accepted: (job: StoredWorkspaceStartJob) => void,
  now: () => number,
  advanceTo: (at: number) => Promise<unknown>,
) {
  const events: WorkspaceEventPublication[] = []
  let observer:
    ((event: WorkspaceEventPublication) => Promise<void>) | undefined
  const hooks: NativeStorageHooks = {
    afterWriteKeys: [START_JOB_KEY],
    afterWrite: async (keys) => {
      if (keys.includes(START_JOB_KEY)) {
        const job =
          await native.api.storage.get<StoredWorkspaceStartJob>(START_JOB_KEY)
        if (job) accepted(job)
      }
      changed()
    },
  }
  const options: NativeWorkspaceOptions = {
    environment,
    callbacks: {
      resolveAttachments: async (_user, _workspace, ids) => ({
        attachments: ids.map((attachmentId) => ({
          id: attachmentId,
          name: `${attachmentId}.txt`,
          kind: 'file',
          mediaType: 'text/plain',
          sizeBytes: 7,
        })),
        paths: [],
      }),
      prepareAttachments: async () => null,
    },
    hooks,
    onPublication: async (event) => {
      events.push(structuredClone(event))
      await observer?.(event)
    },
  }
  const native = harness.native.actor(id, options)
  const advance = async (at?: number) => {
    await native.ready
    const alarm = await native.api.storage.getAlarm()
    await advanceTo(at ?? Math.max(now(), alarm ?? now()))
  }
  const endpoint = readyEndpoint(
    {
      ...native.lifecycle,
      reportRunnerLifecycle: native.api.lifecycleRpc.reportRunnerLifecycle,
      registerLifecycleTurn: native.api.lifecycleRpc.registerLifecycleTurn,
      finishLifecycleTurn: native.api.lifecycleRpc.finishLifecycleTurn,
      runnerLifecycleDisconnected:
        native.api.lifecycleRpc.runnerLifecycleDisconnected,
      acknowledgeLifecycleFirstMessage:
        native.api.lifecycleRpc.acknowledgeLifecycleFirstMessage,
      scheduleImage: native.api.lifecycleRpc.scheduleImage,
      advance,
    },
    native.ready,
  )
  return {
    native,
    ready: native.ready,
    storage: native.api.storage,
    events,
    endpoint: () => endpoint,
    checkpoint: () => native.api.lifecycleControls.checkpoint(),
    advance,
    restart: native.restart,
    cancelWaiters: native.api.lifecycleControls.cancelWaiters,
    observePublication: (
      value: (event: WorkspaceEventPublication) => Promise<void>,
    ) => {
      observer = value
    },
    holdResultRead: async () => {
      const gate = heldOperation()
      hooks.afterRead = async (key) => {
        if (key !== START_RESULT_KEY) return
        delete hooks.afterRead
        await native.configure(options)
        await gate.wait()
      }
      await native.configure(options)
      return gate
    },
    holdAdmission: async () => {
      const gate = heldOperation()
      hooks.beforeTransaction = async () => {
        delete hooks.beforeTransaction
        await native.configure(options)
        await gate.wait()
      }
      await native.configure(options)
      return gate
    },
    expectedRunnerReport: async (event: RunnerEvent) => {
      const result =
        await native.api.lifecycleControls.captureRunnerReport(event)
      if (!result.ok)
        throw new HttpError(
          result.error.status,
          result.error.code,
          result.error.message,
        )
    },
  }
}

export type BackendActor = ReturnType<typeof backendActor>
