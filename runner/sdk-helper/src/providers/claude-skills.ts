import type { ProviderLifetime } from './lifetime'
import { prepareSkillView } from './skill-view'
import type { ProviderOptions } from './types'

export async function prepareClaudeSkills(
  options: ProviderOptions,
  lifetime: ProviderLifetime,
): Promise<string | null> {
  const view = await prepareSkillView(options, 'claude', lifetime)
  return view?.directory ?? null
}
