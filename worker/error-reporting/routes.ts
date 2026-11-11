import {
  ACCOUNT_TABS,
  SETTINGS_TABS,
  routes as appRoutes,
} from '../../src/app/router'
import { ACCOUNT_PATHS, agentLoginPath } from '../../src/shared/account'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { MODELS_PATH } from '../../src/shared/agents'
import { API_PATHS } from '../../src/shared/api'
import { desktopPath } from '../../src/shared/desktop'
import {
  DEVICE_COMMAND_PATH,
  DEVICE_CURRENT_PATH,
  DEVICE_SETTINGS_PATH,
  deviceApprovalPath,
  deviceConnectionPath,
} from '../../src/shared/device'
import { chatHistoryPath, workspaceEventsPath } from '../../src/shared/events'
import { filePaths } from '../../src/shared/files'
import { FEEDBACK_PATH } from '../../src/shared/feedback'
import { githubPaths } from '../../src/shared/github'
import {
  GITHUB_INSTALL_PATH,
  GITHUB_SETUP_PATH,
} from '../../src/shared/github-setup'
import { HEALTH_PATH } from '../../src/shared/health'
import {
  PENDING_ORG_INVITES_PATH,
  acceptOrgInvitePath,
  invitesPath,
  membersPath,
  workspaceOwnerPath,
} from '../../src/shared/members'
import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import {
  operatorOverviewPath,
  operatorOrgsPath,
  operatorUsersPath,
  userSuspensionPath,
} from '../../src/shared/operator'
import {
  operatorApprovalPath,
  operatorCodeDisablePath,
  operatorSignupPausePath,
  operatorWaitlistPath,
  operatorWaitlistSwitchPath,
} from '../../src/shared/operator-waitlist'
import { orgSettingsPaths } from '../../src/shared/org-settings'
import {
  deleteOrgPath,
  leaveOrgPath,
  restoreOrgPath,
} from '../../src/shared/orgs'
import { previewsPath } from '../../src/shared/previews'
import { sectionsPath } from '../../src/shared/sections'
import { routinePaths } from '../../src/shared/routines'
import {
  retryMessagePath,
  sessionPaths,
  sessionTranscriptPath,
} from '../../src/shared/sessions'
import {
  APP_HOST_PAGES,
  SITE_FOLDER,
  SITE_ICONS,
} from '../../src/shared/site-build'
import { terminalPaths } from '../../src/shared/terminal'
import { joinPath, WAITLIST_PATHS } from '../../src/shared/waitlist'
import { workspaceViewPath } from '../../src/shared/workspace-view'
import { workspacePaths } from '../../src/shared/workspaces'
import { PREVIEW_HANDOFF_PATH } from '../security/preview-launch-path'

const templates = [
  ...Object.values(API_PATHS),
  ...Object.values(ACCOUNT_PATHS),
  ...Object.values(MACHINE_PATHS),
  ...Object.values(WAITLIST_PATHS),
  ...Object.values(SITE_ICONS),
  ...Object.values(workspacePaths).map((path) => path('', '')),
  ...Object.values(sessionPaths).map((path) => path('', '', '')),
  ...Object.values(orgSettingsPaths).map((path) => path('')),
  ...Object.values(filePaths).map((path) => path('', '', '')),
  ...Object.values(githubPaths).map((path) => path('', '')),
  ...Object.values(terminalPaths).map((path) => path('', '')),
  ...Object.values(routinePaths).map((path) => path('', '')),
  ...ACCOUNT_TABS.map((tab) => appRoutes.accountTab(tab)),
  ...SETTINGS_TABS.map((tab) => appRoutes.settings('', tab)),
  appRoutes.newWorkspace(''),
  appRoutes.operatorCodes(),
  FEEDBACK_PATH,
  MODELS_PATH,
  GET_STARTED_PATH,
  HEALTH_PATH,
  GITHUB_SETUP_PATH,
  GITHUB_INSTALL_PATH,
  DEVICE_COMMAND_PATH,
  DEVICE_CURRENT_PATH,
  DEVICE_SETTINGS_PATH,
  PENDING_ORG_INVITES_PATH,
  agentLoginPath('claude'),
  agentLoginPath('codex'),
  desktopPath('', ''),
  deviceApprovalPath('', '', ''),
  deviceConnectionPath(''),
  chatHistoryPath('', '', ''),
  workspaceEventsPath('', ''),
  sessionTranscriptPath('', '', '', 'full'),
  acceptOrgInvitePath(''),
  invitesPath(''),
  membersPath(''),
  workspaceOwnerPath('', ''),
  operatorOverviewPath(),
  operatorOrgsPath(),
  operatorUsersPath(),
  userSuspensionPath(0),
  operatorApprovalPath(0),
  operatorCodeDisablePath(''),
  operatorSignupPausePath(),
  operatorWaitlistPath(),
  operatorWaitlistSwitchPath(),
  joinPath(''),
  PREVIEW_HANDOFF_PATH,
  deleteOrgPath(''),
  leaveOrgPath(''),
  restoreOrgPath(''),
  previewsPath('', ''),
  sectionsPath(''),
  retryMessagePath('', '', '', ''),
  workspaceViewPath('', ''),
  `/${SITE_FOLDER}/${APP_HOST_PAGES}`,
  '/api/auth/desktop',
  '/v1/internal/image-source/credential',
  '/v1/deploy/software-image',
  `${MACHINE_PATHS.claudeGateway}/v1/messages`,
  `${MACHINE_PATHS.claudeGateway}/v1/messages/count_tokens`,
  `${MACHINE_PATHS.codexGateway}/responses`,
  '/favicon.ico',
]
const segments = new Set(
  templates.flatMap((path) =>
    path
      .split('?', 1)[0]
      .split('/')
      .filter((part) => part && part !== '0'),
  ),
)

export function workerRouteTemplate(pathname: string): string {
  return pathname
    .split(/[?#]/, 1)[0]
    .split('/')
    .map((part) => (!part || segments.has(part) ? part : ':param'))
    .join('/')
}

export function isWorkerRouteTemplate(value: unknown): value is string {
  return typeof value === 'string' && workerRouteTemplate(value) === value
}
