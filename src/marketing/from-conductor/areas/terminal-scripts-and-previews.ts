import type { ParityFeature } from '../model'

export const terminalScriptsAndPreviewsFeatures: readonly ParityFeature[] = [
  {
    id: 'workspace-terminal',
    area: 'terminal-scripts-and-previews',
    name: 'Workspace terminal',
    status: 'available',
    note: 'Each workspace has one cloud terminal. It keeps running through connection drops. Terminal tabs are under consideration.',
  },
  {
    id: 'setup-script',
    area: 'terminal-scripts-and-previews',
    name: 'Setup script',
    status: 'different',
    note: 'An admin prepares an org image with an install script. One org startup script runs at each start and resume.',
  },
  {
    id: 'actions',
    area: 'terminal-scripts-and-previews',
    name: 'Actions',
    status: 'considering',
    note: 'Named actions and a Run button are under consideration. Start servers and tests in the terminal.',
  },
  {
    id: 'action-options',
    area: 'terminal-scripts-and-previews',
    name: 'Action options',
    status: 'considering',
    note: 'Action defaults, visibility, and concurrent run options are under consideration.',
  },
  {
    id: 'archive-script',
    area: 'terminal-scripts-and-previews',
    name: 'Archive script',
    status: 'considering',
    note: 'Running a cleanup script before archive is under consideration.',
  },
]
