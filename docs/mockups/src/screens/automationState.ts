import type { SchemaProps } from '@mokly/mokly'
import { memberViewer, people, you, type PersonKey } from '../fixtures/members'
import { runListKeys } from '../fixtures/runLists'
import { triggerViewKeys } from '../fixtures/automationTriggers'
import {
  automationKeys,
  automations,
  type Automation,
} from '../fixtures/automations'

/**
 * The state of the automation screen. Each catalogue entry of the screen is a
 * set of these props, and Mokly's serve controls can change each one.
 */
export const automationStateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'automation',
    'read',
    'viewer',
    'triggers',
    'runs',
    'tab',
    'org',
    'dialog',
    'login',
    'modelMenu',
    'capabilities',
  ],
  properties: {
    /** A new automation, a draft of one, or a saved automation of Acme. */
    automation: { enum: automationKeys },
    /**
     * The read of a saved automation: it shows, the org no longer has it,
     * because it was deleted or the address is wrong, or the read failed,
     * such as when the app cannot reach the server. The last two show in
     * place of the automation, without the Runs list and without actions.
     */
    read: { enum: ['ready', 'unavailable', 'failed'] },
    /**
     * The person signed in: Cal, an admin of Acme, or Priya, a member who
     * is not an admin. The person who created the automation changes it.
     */
    viewer: { enum: ['admin', 'member'] },
    /**
     * The Triggers list: the saved triggers, the open Add trigger menu, the
     * editor of a schedule, a refused custom cron, or the author filter of a
     * pull request trigger, with suggestions or with a refused login.
     */
    triggers: { enum: triggerViewKeys },
    /** The runs that the Runs list shows. */
    runs: { enum: runListKeys },
    /**
     * The tab that a phone shows: the form of the automation, or its runs. A
     * desktop shows both, with the runs in a column at the right. A new
     * automation has no tabs, because it has no runs yet.
     */
    tab: { enum: ['automation', 'runs'] },
    /**
     * The org: in use, or suspended by the operator. A suspended org keeps
     * every read, so each member reads its automations and runs, and nobody
     * changes them, also an admin or the owner.
     */
    org: { enum: ['active', 'suspended'] },
    /**
     * The question over the page: none, or the one of Delete, which asks
     * first, because a deleted automation cannot come back.
     */
    dialog: { enum: ['none', 'delete'] },
    /**
     * The agent login that the runs use, the default login of the owner
     * (decision 5 A of the org logins plan): the own login of the owner, or
     * the Claude login of Acme on its gateway, for an owner with no login of
     * their own or while "Use for every member" is on.
     */
    login: { enum: ['own', 'org'] },
    /**
     * The model picker of the prompt: closed, or open. On the gateway of
     * Acme, it hides Fable 5.1, which the model list of the gateway does not
     * name (decision 3 A).
     */
    modelMenu: { enum: ['closed', 'open'] },
    /**
     * The Capabilities control of the prompt, which only the owner opens:
     * closed, or open, above its icon on a computer and as a sheet on a
     * phone (automation capabilities decision 1 A).
     */
    capabilities: { enum: ['closed', 'open'] },
  },
} as const

export type AutomationState = SchemaProps<typeof automationStateSchema>

/** Cal's automation that reviews pull requests, as Cal sees it. */
export const ownerAutomation: AutomationState = {
  automation: 'review-prs',
  read: 'ready',
  viewer: 'admin',
  triggers: 'saved',
  runs: 'review',
  tab: 'automation',
  org: 'active',
  dialog: 'none',
  login: 'own',
  modelMenu: 'closed',
  capabilities: 'closed',
}

/**
 * What the person signed in may do with an automation (decision 502): the
 * owner changes it, turns it on, and uses Run now. An admin turns it off
 * and deletes it. Every other member reads it.
 */
export type AutomationAccess = 'owner' | 'admin' | 'member'

/** The person signed in. */
export function viewerOf(state: AutomationState): PersonKey {
  return state.viewer === 'admin' ? you : memberViewer
}

/**
 * The automation of a state. A new automation belongs to the person who
 * creates it, so its owner is the person signed in.
 */
export function automationOf(state: AutomationState): Automation {
  const automation = automations[state.automation]
  if (automation.saved) return automation
  return { ...automation, owner: people[viewerOf(state)] }
}

export function accessOf(
  state: AutomationState,
  automation: Automation,
): AutomationAccess {
  // A suspended org refuses every change, so every person only reads.
  if (state.org === 'suspended') return 'member'
  return automation.owner.key === viewerOf(state) ? 'owner' : state.viewer
}

/**
 * Whether Save has changes to save, or a value that the form refuses: a
 * prompt without text (decision 511 B), or a cron that runs more than once
 * an hour.
 */
export type SaveState = 'unchanged' | 'changed' | 'refused'

export function saveStateOf(
  state: AutomationState,
  automation: Automation,
): SaveState {
  if (automation.prompt.trim() === '') return 'refused'
  if (!automation.saved) return 'changed'
  switch (state.triggers) {
    case 'saved':
    case 'menu':
      return 'unchanged'
    case 'custom-refused':
      return 'refused'
    case 'hourly':
    case 'daily':
    case 'weekly':
    case 'author-filter':
    case 'suggestions':
    case 'unknown-login':
      return 'changed'
  }
}
