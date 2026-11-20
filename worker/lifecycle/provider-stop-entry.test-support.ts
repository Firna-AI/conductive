import type { WorkspaceCompositionEnv } from '../chat/workspace-integration'
import { Workspace as PendingStopWorkspace } from './pending-access-stop-entry.test-support'

export class Workspace extends PendingStopWorkspace {
  private readonly stops: { id: string; providerStop: boolean }[] = []

  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    super(context, env)
    this.integration.onStopped(async (id, options) => {
      this.stops.push({ id, providerStop: options?.providerStop ?? false })
    })
  }

  publishLifecycle(): Promise<void> {
    return this.run(() => this.controller.changeLifecycle((state) => state))
  }

  takeStops() {
    return this.stops.splice(0)
  }
}
