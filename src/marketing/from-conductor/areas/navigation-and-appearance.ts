import type { ParityFeature } from '../model'

export const navigationAndAppearanceFeatures: readonly ParityFeature[] = [
  {
    id: 'sidebar',
    area: 'navigation-and-appearance',
    name: 'Sidebar',
    status: 'available',
    note: 'The sidebar groups workspaces into sections and shows their state. Branch names and pull request details are under consideration.',
  },
  {
    id: 'sidebar-sections',
    area: 'navigation-and-appearance',
    name: 'Sidebar sections',
    status: 'available',
    note: 'Create sections and move workspaces between them by drag. New workspaces can start in a chosen section.',
  },
  {
    id: 'command-palette',
    area: 'navigation-and-appearance',
    name: 'Command palette',
    status: 'available',
    note: 'Command K or Control K finds workspaces by name or number, actions, and settings. Chat and pull request search are under consideration.',
  },
  {
    id: 'keyboard-shortcuts',
    area: 'navigation-and-appearance',
    name: 'Keyboard shortcuts',
    status: 'in-progress',
    note: 'Custom keyboard shortcuts are in progress. The command palette shortcut works today.',
    due: null,
  },
  {
    id: 'layout-and-zen-mode',
    area: 'navigation-and-appearance',
    name: 'Layout and Zen mode',
    status: 'considering',
    note: 'Resize panels and hide the right column. Zen mode and split views are under consideration.',
  },
  {
    id: 'tab-order',
    area: 'navigation-and-appearance',
    name: 'Tab order',
    status: 'available',
    note: 'Drag session, file, and diff tabs into order, or move them through the tab menu.',
  },
  {
    id: 'themes-fonts-and-zoom',
    area: 'navigation-and-appearance',
    name: 'Themes, fonts, and zoom',
    status: 'considering',
    note: 'The app follows your system’s light or dark setting. Custom themes, fonts, and app zoom are under consideration.',
  },
  {
    id: 'repository-icons',
    area: 'navigation-and-appearance',
    name: 'Repository icons',
    status: 'considering',
    note: 'Custom repository icons are under consideration.',
  },
  {
    id: 'status-indicators',
    area: 'navigation-and-appearance',
    name: 'Status indicators',
    status: 'available',
    note: 'Workspace state marks show activity, unread output, start progress, stopped computers, and errors.',
  },
]
