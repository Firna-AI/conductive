import type { EndpointModelList } from '../../src/shared/account'
import type { Agent, AgentModel } from '../../src/shared/agents'

/** Only the signed-in account read projects discovered IDs into app IDs. */
export function endpointModelList(
  agent: Agent,
  savedIds: string | null,
  checkedAt: number | null,
  models?: () => readonly AgentModel[],
): EndpointModelList | undefined {
  if (savedIds === null || checkedAt === null || !models) return undefined
  try {
    const ids: unknown = JSON.parse(savedIds)
    if (
      !Array.isArray(ids) ||
      !ids.every((id: unknown) => typeof id === 'string')
    )
      return undefined
    return {
      missing: models()
        .filter((model) => model.agent === agent && !ids.includes(model.model))
        .map((model) => model.model),
      checkedAt,
    }
  } catch {
    return undefined
  }
}
