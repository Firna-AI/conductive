export const parityAreas = [
  {
    key: 'workspaces-and-branches',
    title: 'Workspaces and branches',
  },
  {
    key: 'agents-and-chat',
    title: 'Agents and chat',
  },
  {
    key: 'models-and-providers',
    title: 'Models and providers',
  },
  {
    key: 'review-and-merge',
    title: 'Review and merge',
  },
  {
    key: 'terminal-scripts-and-previews',
    title: 'Terminal, scripts, and previews',
  },
  {
    key: 'files',
    title: 'Files',
  },
  {
    key: 'repository-configuration',
    title: 'Repository configuration',
  },
  {
    key: 'cloud',
    title: 'Cloud',
  },
  {
    key: 'multiplayer-and-teams',
    title: 'Multiplayer and teams',
  },
  {
    key: 'integrations',
    title: 'Integrations',
  },
  {
    key: 'automation-and-api',
    title: 'Automation and API',
  },
  {
    key: 'apps-and-devices',
    title: 'Apps and devices',
  },
  {
    key: 'navigation-and-appearance',
    title: 'Navigation and appearance',
  },
  {
    key: 'security-privacy-and-admin',
    title: 'Security, privacy, and admin',
  },
  {
    key: 'plans-and-pricing',
    title: 'Plans and pricing',
  },
] as const

export type ParityArea = (typeof parityAreas)[number]

export type ParityAreaKey = ParityArea['key']
