import type { ParityFeature } from '../model'

export const integrationsFeatures: readonly ParityFeature[] = [
  {
    id: 'github-app-for-cloud',
    area: 'integrations',
    name: 'GitHub App for cloud',
    status: 'available',
    note: 'After app access, install the GitHub App on the GitHub accounts that own your repositories.',
  },
  {
    id: 'github-issues',
    area: 'integrations',
    name: 'GitHub issues',
    status: 'considering',
    note: 'Starting from GitHub issues and attaching issues are under consideration. Agents can read and manage issues through the GitHub CLI.',
  },
  {
    id: 'linear',
    area: 'integrations',
    name: 'Linear',
    status: 'considering',
    note: 'A Linear connection is under consideration.',
  },
  {
    id: 'mcp-servers-for-cloud',
    area: 'integrations',
    name: 'MCP servers for cloud',
    status: 'considering',
    note: 'Agents include workspace tools. A settings page for your own cloud MCP servers is under consideration.',
  },
  {
    id: 'slack',
    area: 'integrations',
    name: 'Slack',
    status: 'considering',
    note: 'A Slack connection is under consideration.',
  },
  {
    id: 'open-in',
    area: 'integrations',
    name: 'Open In',
    status: 'planned',
    note: 'Opening cloud workspaces in desktop editors through SSH is planned for the Mac app.',
    due: null,
  },
]
