/** The catalogue paths that screens link to. */
export const paths = {
  app: 'app',
  shell: 'app/shell',
  starting: 'app/shell/starting',
  newWorkspace: 'app/new-workspace',
  creating: 'app/new-workspace/creating',
  firstTurn: 'app/new-workspace/first-turn',
  settings: 'app/repository-settings',
  installSoftware: 'app/repository-settings/install-software',
  addRepository: 'app/repository-settings/add-repository',
  chat: 'app/chat',
  filesAll: 'app/files',
  filesChanges: 'app/files/changes',
  markdown: 'app/files/markdown',
  code: 'app/files/code',
  diff: 'app/files/diff',
  terminal: 'app/tools',
  preview: 'app/tools/preview',
  desktop: 'app/tools/desktop',
} as const

/** The screen that shows the checks of each pull request state. */
export const checksPaths = {
  none: 'app/banner',
  'checks-running': 'app/banner/checks-running',
  'checks-failed': 'app/banner/checks-failed',
  'ready-to-merge': 'app/banner/ready-to-merge',
  merged: 'app/banner/merged',
} as const
