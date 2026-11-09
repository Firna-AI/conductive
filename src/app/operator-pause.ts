import {
  operatorSignupPausePath,
  type OperatorSignupPause,
} from '../shared/operator-waitlist'
import { readSignupPause } from './api/read-operator-waitlist'
import type { AppModel } from './app-model'
import { operatorFailure, OperatorRead } from './operator-read'

/**
 * The pause of sign-ups, which each page of the operator section shows
 * while it is on. A page reads it when it opens, and Try again reads it
 * again. Pause sign-ups and Resume sign-ups send `{}`, as the gate of the
 * app asks, and show the state of their reply at once. A failed change
 * throws its error, so the question or the notice can show it.
 */
export class OperatorPause {
  readonly state: OperatorRead<OperatorSignupPause>
  private readonly app: AppModel

  constructor(app: AppModel) {
    this.app = app
    this.state = new OperatorRead(
      app,
      operatorSignupPausePath(),
      readSignupPause,
    )
  }

  /** Pause sign-ups: codes and org invitations let nobody in. */
  pause(): Promise<void> {
    return this.change('POST')
  }

  /** Resume sign-ups. It brings back the usual state, so it asks nothing. */
  resume(): Promise<void> {
    return this.change('DELETE')
  }

  private async change(method: 'POST' | 'DELETE'): Promise<void> {
    let pause: OperatorSignupPause
    try {
      pause = await this.app.services.api.send(
        method,
        operatorSignupPausePath(),
        {},
        readSignupPause,
      )
    } catch (error) {
      throw operatorFailure(this.app, error)
    }
    this.state.put(pause)
  }
}
