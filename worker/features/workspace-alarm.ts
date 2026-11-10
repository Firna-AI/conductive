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
}

export class WorkspaceAlarmRunner {
  private readonly input: WorkspaceAlarmInput
  private readonly tasks: WorkspaceAlarmTasks

  constructor(input: WorkspaceAlarmInput) {
    this.input = input
    this.tasks = new WorkspaceAlarmTasks(input.context)
  }

  async alarm(): Promise<void> {
    const { alarms, now, browsers, devices } = this.input
    const security = await alarms.takeSecurity(now())
    if (security.has('browser')) await browsers.alarm()
    if (security.has('runner'))
      this.tasks.start('runner', () => this.input.runner.alarm())
    if (security.has('devices'))
      this.tasks.start('devices', async () => {
        try {
          await devices.alarm()
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
        return
      }
      const due = await alarms.take(now(), security.size === 0)
      await this.run(due)
      await alarms.complete(due)
    } catch (error) {
      await alarms.deferRegular(now() + 2_000)
      throw error
    }
  }

  private async run(due: ReadonlySet<string>): Promise<void> {
    const { lifecycle, github, features, storage, alarms } = this.input
    if (due.has('lifecycle')) await lifecycle()
    if (due.has('github')) await github.alarm()
    if (due.has('previews')) {
      await features.previews.expire()
      const id = await storage.get<string>('previews:workspace-id')
      if (id)
        await alarms.set('previews', await features.previews.nextExpiry(id))
    }
    const previewWorkspace = await storage.get<string>('previews:workspace-id')
    if (previewWorkspace) await features.publishRevocations(previewWorkspace)
  }
}
