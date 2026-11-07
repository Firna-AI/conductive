import app, { Workspace as ProductionWorkspace } from '../../index'

export class Workspace extends ProductionWorkspace {
  advanceStartAlarm(): Promise<void> {
    return this.alarm()
  }
}

export default app
