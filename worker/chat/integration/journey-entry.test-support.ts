import app, { Workspace as ProductionWorkspace } from '../../index'

export class Workspace extends ProductionWorkspace {
  readScheduledAlarm(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
  }

  advanceStartAlarm(): Promise<void> {
    return this.alarm()
  }
}

export default app
