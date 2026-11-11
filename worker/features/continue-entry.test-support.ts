import app, { Workspace as FeatureWorkspace } from './entry.test-support'
import type { WorkspaceCompositionEnv } from '../chat/workspace-integration'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'

/** Native alarms stay in the future while this fixture drives each phase. */
export class Workspace extends FeatureWorkspace {
  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    super(context, env, () => DEVICE_TEST_NOW)
  }
}

export default app
