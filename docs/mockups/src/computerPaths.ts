/**
 * The screens of own computers: Linux servers that an admin adds to an org,
 * where each workspace runs in its own container. The Own computers tab of
 * the org settings lists them, with the page of each computer and the Add
 * computer dialog. New workspace, the automation form, the workspace, its
 * archive, and the operator page of an org show them too.
 */
export const computerPaths = {
  settings: {
    list: 'app/org-settings/own-computers',
    member: 'app/org-settings/own-computers/member',
    empty: 'app/org-settings/own-computers/empty',
    emptyMember: 'app/org-settings/own-computers/empty/member',
    waiting: 'app/org-settings/own-computers/waiting',
    waitingExpired: 'app/org-settings/own-computers/waiting/expired',
    add: 'app/org-settings/own-computers/add',
    addCommand: 'app/org-settings/own-computers/add/command',
    addConnected: 'app/org-settings/own-computers/add/connected',
    addExpired: 'app/org-settings/own-computers/add/expired',
    computer: 'app/org-settings/own-computers/computer',
    computerFull: 'app/org-settings/own-computers/computer/full',
    computerOffline: 'app/org-settings/own-computers/computer/offline',
    computerMember: 'app/org-settings/own-computers/computer/member',
    computerRemove: 'app/org-settings/own-computers/computer/remove',
    build: 'app/org-settings/own-computers/build',
    buildFailed: 'app/org-settings/own-computers/build/failed',
    rebuildFailed: 'app/org-settings/own-computers/build/rebuild-failed',
    buildFailedMember: 'app/org-settings/own-computers/build/failed-member',
    cloudComputer: 'app/org-settings/cloud-computer/own-computers',
    suspended: 'app/orgs/suspended/settings/own-computers',
  },
  newWorkspace: {
    page: 'app/new-workspace/own-computer',
    menu: 'app/new-workspace/own-computer/menu',
    picked: 'app/new-workspace/own-computer/picked',
    offline: 'app/new-workspace/own-computer/offline',
    full: 'app/new-workspace/own-computer/full',
    dialog: 'app/new-workspace/dialog/own-computer',
    dialogMenu: 'app/new-workspace/dialog/own-computer/menu',
    dialogOffline: 'app/new-workspace/dialog/own-computer/offline',
    dialogFull: 'app/new-workspace/dialog/own-computer/full',
  },
  automation: {
    page: 'app/automations/automation/own-computer',
    menu: 'app/automations/automation/own-computer/menu',
    member: 'app/automations/automation/own-computer/member',
    removed: 'app/automations/automation/own-computer/computer-removed',
  },
  workspace: {
    starting: 'app/shell/own-computer',
    menu: 'app/shell/own-computer/menu',
    wentOffline: 'app/shell/own-computer/went-offline',
    wentOfflineDuringTurn: 'app/shell/own-computer/went-offline/during-turn',
    waiting: 'app/shell/own-computer/waiting',
    waitingStoppedTurn: 'app/shell/own-computer/waiting/stopped-turn',
    offline: 'app/shell/own-computer/offline',
    full: 'app/shell/own-computer/full',
    fullFailed: 'app/shell/own-computer/full/failed',
    removed: 'app/shell/own-computer/removed',
  },
  archive: {
    computerRemoved: 'app/archive/computer-removed',
    computerRemovedLeft: 'app/archive/computer-removed/removed',
  },
  operatorOrg: 'app/operator/org/own-computers',
} as const
