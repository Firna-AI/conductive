import {
  operatorWaitlistSwitchPath,
  type OperatorWaitlistSwitch,
} from '../shared/operator-waitlist'
import { readWaitlistSwitch } from './api/read-operator-waitlist'
import type { AppModel } from './app-model'
import { operatorFailure, OperatorRead } from './operator-read'

/**
 * The waitlist switch, which the Sign-ups box of the Invite codes tab holds,
 * and which each page of the operator section names while the waitlist is
 * off. A page reads it when it opens, and Try again reads it again. Turn off
 * the waitlist and Turn on the waitlist send `{}`, as the gate of the app
 * asks, and show the state of their reply at once. A failed change throws
 * its error, so the question or the notice can show it.
 */
export class OperatorSwitch {
  readonly state: OperatorRead<OperatorWaitlistSwitch>
  private readonly app: AppModel

  constructor(app: AppModel) {
    this.app = app
    this.state = new OperatorRead(
      app,
      operatorWaitlistSwitchPath(),
      readWaitlistSwitch,
    )
  }

  /** Turn off the waitlist: each sign-in gets app access, unless sign-ups are paused. */
  turnOff(): Promise<void> {
    return this.change('DELETE')
  }

  /** Turn on the waitlist. It brings back the usual state, so it asks nothing. */
  turnOn(): Promise<void> {
    return this.change('POST')
  }

  private async change(method: 'POST' | 'DELETE'): Promise<void> {
    let waitlist: OperatorWaitlistSwitch
    try {
      waitlist = await this.app.services.api.send(
        method,
        operatorWaitlistSwitchPath(),
        {},
        readWaitlistSwitch,
      )
    } catch (error) {
      throw operatorFailure(this.app, error)
    }
    this.state.put(waitlist)
  }
}
