import type { RunnerConnections } from '../chat/runner-connections'
import type { BrowserTabs } from '../chat/browser-tabs'
import type { DeviceRuntime } from '../devices/runtime'
import type { WorkspaceCompositionEnv } from '../chat/workspace-integration'
import type { WorkspaceMembersReceiver } from '../members/workspace-receiver'
import type { ReceiverStorage } from '../members/receiver-storage'
import { orgLifecycleActive } from '../members/composition-data'
import type { WorkspaceAlarms } from './alarms'
import { WorkspaceAlarmTasks } from './alarm-tasks'
import type { WorkspaceGitHub } from './github'
import type { WorkspaceFeatures } from './workspace'
import type { WorkspaceErrorReporting } from '../error-reporting/workspace'
import {
  expireWorkspacePreviews,
  runWorkspaceAlarms,
} from '../workspace-alarms'

interface WorkspaceAlarmInput {
  context: DurableObjectState
  env: WorkspaceCompositionEnv
  now: () => number
  alarms: WorkspaceAlarms
  storage: ReceiverStorage
  browsers: BrowserTabs
  runner: RunnerConnections
  devices: DeviceRuntime
  members: WorkspaceMembersReceiver
  github: WorkspaceGitHub
  features: WorkspaceFeatures
  lifecycle: () => Promise<void>
  reporting?: WorkspaceErrorReporting
}

export class WorkspaceAlarmRunner {
  private readonly input: WorkspaceAlarmInput
  private readonly tasks: WorkspaceAlarmTasks

  constructor(input: WorkspaceAlarmInput) {
    this.input = input
    this.tasks = new WorkspaceAlarmTasks(input.context, input.reporting)
  }

  async alarm(): Promise<void> {
    const { alarms, now, browsers, devices } = this.input
    const startedAt = now()
    const security = await alarms.takeSecurity(startedAt)
    const claimAt = startedAt + 2_000
    if (security.has('browser'))
      await alarms.run('browser', claimAt, () => browsers.alarm())
    if (security.has('runner'))
      this.tasks.start('runner', () =>
        alarms.run('runner', claimAt, () => this.input.runner.alarm()),
      )
    if (security.has('devices'))
      this.tasks.start('devices', async () => {
        try {
          await alarms.run('devices', claimAt, () => devices.alarm())
        } catch (error) {
          await alarms.set('devices', now() + 2_000)
          throw error
        }
      })
    await alarms.deferRegular(now() + 2_000)
    this.tasks.start('regular', () => this.regular(security))
  }

  async settled(): Promise<void> {
    await this.tasks.settled()
    await this.input.browsers.settled()
  }

  private async regular(security: ReadonlySet<string>): Promise<void> {
    const { alarms, now, members, env } = this.input
    try {
      if (!(await members.active())) {
        await alarms.deferRegular(now() + 30_000)
        return
      }
      const fence = await members.readFence()
      if (
        fence &&
        !(await orgLifecycleActive(env.DB, fence.orgId, fence.generation))
      ) {
        await alarms.deferRegular(now() + 30_000)
        await alarms.set('lifecycle:access', now() + 30_000)
        return
      }
      const { lifecycle, github, features, storage } = this.input
      await runWorkspaceAlarms(
        alarms,
        now,
        {
          lifecycle,
          github: () => github.alarm(),
          previews: () =>
            expireWorkspacePreviews(storage, alarms, features.previews),
          devices: async () => {},
          publishRevocations: async () => {
            const id = await storage.get<string>('previews:workspace-id')
            if (id) await features.publishRevocations(id)
          },
        },
        { securityHandled: true, fallbackLifecycle: security.size === 0 },
      )
      await alarms.deferRegular(null)
    } catch (error) {
      await alarms.deferRegular(now() + 2_000)
      throw error
    }
  }
}
