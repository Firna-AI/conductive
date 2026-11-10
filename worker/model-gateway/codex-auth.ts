import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'
import type { CodexRotation } from '../codex-auth/rotation'
import type { CodexTokens } from '../codex-auth/tokens'
import { HttpError } from '../http'
import { GatewayRequestError } from './errors'

export interface CodexGatewayAuth {
  current: CodexTokens
  secrets: string[]
  renew(failedAccessToken: string): Promise<void>
  reject(): Promise<never>
}

export async function codexGatewayAuth(
  read: (failedAccessToken?: string) => Promise<CodexTokens>,
  claimRecovery: () => Promise<boolean>,
  saveFailure: (failedAccessToken: string) => Promise<boolean>,
  waitForRotation: (failedAccessToken: string) => Promise<CodexRotation>,
  completeRecovery: () => Promise<void>,
): Promise<CodexGatewayAuth> {
  const readCurrent = async (failed?: string) => {
    try {
      return await read(failed)
    } catch (error) {
      if (error instanceof GatewayRequestError) throw error
      throw new GatewayRequestError(
        'agent_login_unavailable',
        chatGptSignInCopy.causes.notRenewed,
      )
    }
  }
  const auth: CodexGatewayAuth = {
    current: await readCurrent(),
    secrets: [],
    async renew(failedAccessToken) {
      if (await claimRecovery()) {
        try {
          auth.current = await readCurrent(failedAccessToken)
          remember()
        } finally {
          await completeRecovery()
        }
        return
      }
      const rotation = await currentRotation(failedAccessToken)
      if (rotation.state === 'rotated') {
        auth.current = rotation.tokens
        remember()
        return
      }
      if (rotation.state === 'pending') return retryLater()
      return rejectUnchanged(failedAccessToken)
    },
    async reject() {
      const rotation = await currentRotation(auth.current.accessToken)
      if (rotation.state !== 'unchanged') return retryLater()
      return rejectUnchanged(auth.current.accessToken)
    },
  }
  async function currentRotation(failed: string) {
    try {
      return await waitForRotation(failed)
    } catch (error) {
      if (error instanceof GatewayRequestError) throw error
      if (!(
        error instanceof HttpError && error.code === 'codex_reconnect_required'
      ))
        return retryLater()
      throw new GatewayRequestError(
        'agent_login_unavailable',
        chatGptSignInCopy.causes.notRenewed,
      )
    }
  }
  async function rejectUnchanged(failed: string): Promise<never> {
    if (!(await saveFailure(failed))) return retryLater()
    throw new GatewayRequestError(
      'agent_login_unavailable',
      chatGptSignInCopy.causes.notRenewed,
    )
  }
  function retryLater(): never {
    throw new GatewayRequestError(
      'model_upstream_unavailable',
      'The login renewal has not finished.',
    )
  }
  function remember() {
    auth.secrets.push(
      auth.current.accessToken,
      auth.current.refreshToken,
      auth.current.idToken,
    )
  }
  remember()
  return auth
}
