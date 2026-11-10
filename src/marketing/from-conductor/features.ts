import type { ParityAreaKey } from './areas'
import type { ParityFeature } from './model'
import { workspacesAndBranchesFeatures } from './areas/workspaces-and-branches'
import { agentsAndChatFeatures } from './areas/agents-and-chat'
import { modelsAndProvidersFeatures } from './areas/models-and-providers'
import { reviewAndMergeFeatures } from './areas/review-and-merge'
import { terminalScriptsAndPreviewsFeatures } from './areas/terminal-scripts-and-previews'
import { filesFeatures } from './areas/files'
import { repositoryConfigurationFeatures } from './areas/repository-configuration'
import { cloudFeatures } from './areas/cloud'
import { multiplayerAndTeamsFeatures } from './areas/multiplayer-and-teams'
import { integrationsFeatures } from './areas/integrations'
import { automationAndApiFeatures } from './areas/automation-and-api'
import { appsAndDevicesFeatures } from './areas/apps-and-devices'
import { navigationAndAppearanceFeatures } from './areas/navigation-and-appearance'
import { securityPrivacyAndAdminFeatures } from './areas/security-privacy-and-admin'
import { plansAndPricingFeatures } from './areas/plans-and-pricing'

export const parityCheckedOn = '2026-11-10'

/** The time in UTC of the last full check of every row, as `YYYY-MM-DDTHH:MMZ`. */
export const parityCheckedAt = '2026-11-09T19:17Z'

export const parityFeatures: readonly ParityFeature[] = [
  ...workspacesAndBranchesFeatures,
  ...agentsAndChatFeatures,
  ...modelsAndProvidersFeatures,
  ...reviewAndMergeFeatures,
  ...terminalScriptsAndPreviewsFeatures,
  ...filesFeatures,
  ...repositoryConfigurationFeatures,
  ...cloudFeatures,
  ...multiplayerAndTeamsFeatures,
  ...integrationsFeatures,
  ...automationAndApiFeatures,
  ...appsAndDevicesFeatures,
  ...navigationAndAppearanceFeatures,
  ...securityPrivacyAndAdminFeatures,
  ...plansAndPricingFeatures,
]

export function featuresOf(area: ParityAreaKey): readonly ParityFeature[] {
  return parityFeatures.filter((feature) => feature.area === area)
}
