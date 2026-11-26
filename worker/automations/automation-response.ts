import type { AutomationResponse } from '../../src/shared/automations'
import { resolveDefaultLogin } from '../chat/default-login'
import { publicLoginOwner } from '../chat/login-owner'
import type { AppEnv } from '../env'
import { readAutomationChosenSecrets } from './automation-capabilities-data'
import { readAutomation } from './automation-data'

export async function readAutomationResponse(
  env: AppEnv,
  orgId: string,
  id: string,
): Promise<AutomationResponse> {
  const automation = await readAutomation(env.DB, orgId, id)
  const [login, chosenSecrets] = await Promise.all([
    resolveDefaultLogin(
      env,
      { orgId },
      automation.owner.id,
      automation.choice.agent,
    ),
    readAutomationChosenSecrets(env.DB, orgId, id),
  ])
  return { automation, runLogin: publicLoginOwner(login), chosenSecrets }
}
