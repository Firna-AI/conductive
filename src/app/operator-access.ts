import {
  operatorApprovalPath,
  operatorCodeDisablePath,
  operatorCodesPath,
  type CreateOperatorCodeRequest,
  type OperatorAccessCode,
  type OperatorApprovalResponse,
} from '../shared/operator-waitlist'
import { readAccessCode, readApproval } from './api/read-operator-waitlist'
import type { AppModel } from './app-model'
import { operatorFailure } from './operator-read'

/**
 * A POST of the operator section. A refusal with `operator_required` takes
 * the section away, as for a read, and the error goes to the caller.
 */
async function operatorPost<T>(
  app: AppModel,
  path: string,
  body: object,
  read: (body: unknown) => T,
): Promise<T> {
  try {
    return await app.services.api.send('POST', path, body, read)
  } catch (error) {
    throw operatorFailure(app, error)
  }
}

/**
 * Approve: gives app access to one person who waits. The reply says the
 * state of the approval email after its first send. A failed email is not
 * a failure of the approval, so it only shows in that state.
 */
export function approveUser(
  app: AppModel,
  githubId: number,
): Promise<OperatorApprovalResponse> {
  return operatorPost(app, operatorApprovalPath(githubId), {}, readApproval)
}

/** New code: the app makes an invite code with the label and the use limit. */
export function makeInviteCode(
  app: AppModel,
  request: CreateOperatorCodeRequest,
): Promise<OperatorAccessCode> {
  return operatorPost(app, operatorCodesPath(), request, readAccessCode)
}

/** Disable: the code, an invite code or a referral code, never works again. */
export function disableCode(
  app: AppModel,
  code: string,
): Promise<OperatorAccessCode> {
  return operatorPost(app, operatorCodeDisablePath(code), {}, readAccessCode)
}
