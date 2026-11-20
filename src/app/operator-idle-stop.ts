import {
  operatorIdleStopPath,
  type IdleStopMinutes,
  type OperatorIdleStopResponse,
  type UpdateOperatorIdleStopRequest,
} from '../shared/operator-idle-stop'
import { readOperatorIdleStop } from './api/read-operator-idle-stop'
import type { AppModel } from './app-model'
import { operatorFailure, OperatorRead } from './operator-read'

/**
 * The stop time of idle cloud computers on the Settings tab of the
 * operator, with its last change. The tab reads it when it opens, and Try
 * again reads it again. A save sends the time and shows the reply at once.
 * A failed save throws its error, so the tab can show it and keep the time
 * that the operator chose.
 */
export class OperatorIdleStop {
  readonly state: OperatorRead<OperatorIdleStopResponse>
  private readonly app: AppModel

  constructor(app: AppModel) {
    this.app = app
    this.state = new OperatorRead(
      app,
      operatorIdleStopPath(),
      readOperatorIdleStop,
    )
  }

  /** Saves the stop time of idle cloud computers. */
  async save(minutes: IdleStopMinutes): Promise<void> {
    const request: UpdateOperatorIdleStopRequest = { minutes }
    let reply: OperatorIdleStopResponse
    try {
      reply = await this.app.services.api.send(
        'PUT',
        operatorIdleStopPath(),
        request,
        readOperatorIdleStop,
      )
    } catch (error) {
      throw operatorFailure(this.app, error)
    }
    this.state.put(reply)
  }
}
