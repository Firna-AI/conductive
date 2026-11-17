import type { AutomationResponse } from '../../src/shared/automations'
import { resolveDefaultLogin } from '../chat/default-login'
import { publicLoginOwner } from '../chat/login-owner'
import type { AppEnv } from '../env'
import { readAutomation } from './automation-data'

export async function readAutomationResponse(
  env: AppEnv,
  orgId: string,
  id: string,
): Promise<AutomationResponse> {
  const automation = await readAutomation(env.DB, orgId, id)
  const login = await resolveDefaultLogin(
    env,
    { orgId },
    automation.owner.id,
    automation.choice.agent,
  )
  return { automation, runLogin: publicLoginOwner(login) }
}
