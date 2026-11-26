import type { OperatorOrgDetail } from '../shared/operator'
import {
  operatorOrgSwitchPath,
  type OperatorOrgSwitchRequest,
} from '../shared/operator-switch'
import { readSwitchReply } from './api/read-operator-switch'
import type { AppModel } from './app-model'
import { operatorFailure, type OperatorRead } from './operator-read'

/**
 * Switch account and Stop switch on the page of an org. Switch account
 * sends `POST` with the new account and the choice to end the job that
 * runs, and Stop switch sends `DELETE` with `{}`, as the gate of the app
 * asks. After either, the page reads the org again, as after Suspend and
 * Lift. A failed write throws its error, so the question shows it and
 * stays open.
 */
export class OperatorOrgSwitch {
  private readonly app: AppModel
  private readonly path: string
  private readonly detail: OperatorRead<OperatorOrgDetail>

  constructor(
    app: AppModel,
    orgId: string,
    detail: OperatorRead<OperatorOrgDetail>,
  ) {
    this.app = app
    this.path = operatorOrgSwitchPath(orgId)
    this.detail = detail
  }

  /** Switches the org to another configured account. */
  switchTo(request: OperatorOrgSwitchRequest): Promise<void> {
    return this.write('POST', request)
  }

  /** Stops the switch that waits or builds. The org stays on its account. */
  stop(): Promise<void> {
    return this.write('DELETE', {})
  }

  private async write(
    method: 'POST' | 'DELETE',
    body: OperatorOrgSwitchRequest | Record<string, never>,
  ): Promise<void> {
    try {
      await this.app.services.api.send(method, this.path, body, readSwitchReply)
    } catch (error) {
      throw operatorFailure(this.app, error)
    }
    await this.detail.refresh()
  }
}
