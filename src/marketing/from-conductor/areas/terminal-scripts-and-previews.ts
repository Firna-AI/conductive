import type { ParityFeature } from '../model'

export const terminalScriptsAndPreviewsFeatures: readonly ParityFeature[] = [
  {
    id: 'workspace-terminal',
    area: 'terminal-scripts-and-previews',
    name: 'Workspace terminal',
    status: 'available',
    note: 'One cloud terminal keeps running through disconnects, with text selection and copying while programs use the mouse. Terminal tabs are under consideration.',
  },
  {
    id: 'big-terminal-mode',
    area: 'terminal-scripts-and-previews',
    name: 'Big Terminal Mode',
    status: 'considering',
    note: 'A full-size terminal with presets for agent programs is under consideration. The workspace terminal runs installed commands today.',
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
    id: 'port-range-per-workspace',
    area: 'terminal-scripts-and-previews',
    name: 'Port range per workspace',
    status: 'different',
    note: 'Each workspace has its own cloud computer, so dev servers in different workspaces can use the same ports.',
  },
  {
    id: 'archive-script',
    area: 'terminal-scripts-and-previews',
    name: 'Archive script',
    status: 'considering',
    note: 'Running a cleanup script before archive is under consideration.',
  },
  {
    id: 'in-app-browser',
    area: 'terminal-scripts-and-previews',
    name: 'In-app browser',
    status: 'available',
    note: 'Port previews open inside the app, with Open in new tab. Sending notes from the page to the agent is under consideration.',
  },
  {
    id: 'spotlight-testing',
    area: 'terminal-scripts-and-previews',
    name: 'Spotlight testing',
    status: 'different',
    note: 'Run the app on the workspace’s own cloud computer and open a port preview. A one way copy to a Mac folder is planned.',
  },
]
