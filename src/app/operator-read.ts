import type { ApiError } from './api/client'
import type { AppModel } from './app-model'
import { PageRead } from './page-read'
import { asApiError } from './store'

/**
 * The refusal of an operator request: the person signed in is not an operator.
 */
function isOperatorRefusal(error: ApiError): boolean {
  return error.status === 403 && error.code === 'operator_required'
}

/**
 * The error of a failed operator request. A refusal shows that the person is no
 * longer an operator, so the app takes the section away.
 */
export function operatorFailure(app: AppModel, error: unknown): ApiError {
  const failure = asApiError(error)
  if (isOperatorRefusal(failure)) app.account.refuseOperator()
  return failure
}

/**
 * A value of the operator section that a page reads each time that it
 * opens: the numbers of the Overview, or the page of an org or a user. A
 * refusal of the operator takes the section away, as `operatorFailure` says.
 */
export class OperatorRead<T> extends PageRead<T> {
  constructor(app: AppModel, path: string, read: (body: unknown) => T) {
    super(app, path, read, (error) => operatorFailure(app, error))
  }
}
