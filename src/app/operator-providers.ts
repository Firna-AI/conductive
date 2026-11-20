import {
  operatorProvidersPath,
  type OperatorProvidersResponse,
  type UpdateOperatorProvidersRequest,
} from '../shared/operator-providers'
import { readOperatorProviders } from './api/read-operator-providers'
import type { AppModel } from './app-model'
import { operatorFailure, OperatorRead } from './operator-read'

/**
 * The provider accounts of the operator section: the weight of each
 * configured account for new orgs, its orgs, and the last change of the
 * weights. The Providers tab reads them when it opens, and Try again reads
 * them again. Create org of an operator reads the same reply for its
 * account choice. A save sends the weights and shows the reply at once. A
 * failed save throws its error, so the tab can show it and keep the
 * weights that the operator chose.
 */
export class OperatorProviders {
  readonly state: OperatorRead<OperatorProvidersResponse>
  private readonly app: AppModel

  constructor(app: AppModel) {
    this.app = app
    this.state = new OperatorRead(
      app,
      operatorProvidersPath(),
      readOperatorProviders,
    )
  }

  /** Saves the weights of new orgs, a whole percent for each account. */
  async save(
    weights: UpdateOperatorProvidersRequest['weights'],
  ): Promise<void> {
    const request: UpdateOperatorProvidersRequest = { weights }
    let reply: OperatorProvidersResponse
    try {
      reply = await this.app.services.api.send(
        'PUT',
        operatorProvidersPath(),
        request,
        readOperatorProviders,
      )
    } catch (error) {
      throw operatorFailure(this.app, error)
    }
    this.state.put(reply)
  }
}
