import app, { Workspace as ProductionWorkspace } from '../../index'

export class Workspace extends ProductionWorkspace {
  readScheduledAlarm(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
  }

  async advanceStartAlarm(): Promise<void> {
    await this.alarm()
    await this.settledAlarms()
  }
}

export default app
