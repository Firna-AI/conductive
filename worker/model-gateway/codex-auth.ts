import type { CodexTokens } from '../codex-auth/tokens'
import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'
import { GatewayRequestError } from './errors'

export interface CodexGatewayAuth {
  current: CodexTokens
  secrets: string[]
  renew(failedAccessToken: string): Promise<void>
}

export async function codexGatewayAuth(
  read: (failedAccessToken?: string) => Promise<CodexTokens>,
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
      auth.current = await readCurrent(failedAccessToken)
      remember()
    },
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
