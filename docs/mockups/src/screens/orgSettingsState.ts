import type { SchemaProps } from '@mokly/mokly'
import { ORG_COLORS } from '../design/orgColors'
import { repositoryOrderStates } from '../components/settings/RepositoryOrderList'
import { computerListViews, ownComputerKeys } from '../fixtures/ownComputers'
import { repositoryChanges } from '../fixtures/repositories'
import {
  orgAgentsDefaults,
  orgAgentsKeys,
  orgAgentsProperties,
} from './orgAgentsState'

export const orgSettingsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'tab',
    'build',
    'script',
    'repositoryChange',
    'repositoryView',
    'repositoryOrder',
    'envForm',
    'secrets',
    'ownComputers',
    'computer',
    'dialog',
    'viewer',
    'org',
    'color',
    ...orgAgentsKeys,
  ],
  properties: {
    tab: {
      enum: [
        'general',
        'repositories',
        'computer',
        'own-computers',
        'agents',
        'secrets',
        'members',
      ],
    },
    /**
     * The builds of the cloud computer, which its tab shows, or of the own
     * computer whose page shows. `time-limit` is a build that the app
     * stopped at its 60-minute limit. `none` is an org with no build yet,
     * such as a new org whose first build did not start.
     * `waiting` is a build of an admin that waits for another update of the
     * cloud computer, which members do not see, and that the tab shows as a
     * build that runs. `ended` is a build that an operator ended for such an
     * update, which the tab shows as a failed build.
     */
    build: {
      enum: [
        'ready',
        'building',
        'waiting',
        'failed',
        'time-limit',
        'ended',
        'none',
      ],
    },
    /**
     * The install script: the one that the newest build started with, or
     * one that an admin changed and saved after that start, which a later
     * build runs.
     */
    script: { enum: ['built', 'changed'] },
    /**
     * The saved repository changes of Acme that its cloud computer does not
     * hold yet: none, acme/admin-dashboard added, acme/marketing-site
     * removed, or both. The repository notice then shows on the
     * Repositories and Cloud computer tabs, in the state that `build`
     * gives. Firna draws no change, because the notices of its first build
     * cover the time before its first good build.
     */
    repositoryChange: { enum: repositoryChanges },
    /**
     * The Repositories tab of an admin: the chosen repositories with Edit,
     * or, after Edit, every repository that the GitHub App reaches, with
     * search, Add, Remove, and Done. `edit-added` is an open edit that
     * adds acme/admin-dashboard, which Done has not saved yet.
     */
    repositoryView: { enum: ['list', 'edit', 'edit-added'] },
    /**
     * The order of the chosen repositories outside Edit, from
     * repository-order decision 1 F: the plain list, the row menu of
     * acme/billing-service open, a drag of acme/marketing-site to the top,
     * or the list after Make default on acme/billing-service.
     */
    repositoryOrder: { enum: repositoryOrderStates },
    /**
     * The open form of the environment variables, which the cloud computer
     * tab of an admin shows: none, Add variable, or the new value of
     * DATABASE_URL.
     */
    envForm: { enum: ['none', 'add', 'change'] },
    /**
     * The Secrets tab: the list, the value of PROD_DATABASE_URL that an
     * admin just revealed, the Add secret form, that form after it refused
     * a name with spaces, or the field of a new value in the row of a
     * secret. `replace-older` lists Cloudflare (read-only), a secret with
     * an older name, and opens that field in its row.
     */
    secrets: {
      enum: [
        'list',
        'revealed',
        'add',
        'add-refused',
        'replace',
        'replace-older',
      ],
    },
    /**
     * The own computers of Acme (own computer decision 2 A): none yet, the
     * four of the list, the first three before Cal added build-03, or those
     * three with build-03 after Add computer, which waits for its first
     * connection or whose one-time code expired. Acme has none in every
     * other state of the settings.
     */
    ownComputers: { enum: computerListViews },
    /**
     * The page of one own computer, which a row of the Own computers tab
     * opens, or none, so that the tab shows the list. Its build card shows
     * the builds of the computer in the state of `build`.
     */
    computer: { enum: ['none', ...ownComputerKeys] },
    /**
     * A dialog over the page: Delete org, the removal of a member, the
     * leave of a suspended org, that leave while it runs, the question
     * before Delete of a secret, a step of Add computer, or the question
     * before Remove computer. The steps of Add computer are the name, the
     * install command while the app waits for the first connection, the
     * first connection, and a one-time code that expired.
     */
    dialog: {
      enum: [
        'none',
        'delete-org',
        'remove-member',
        'leave-org',
        'leaving-org',
        'delete-secret',
        'add-computer',
        'computer-command',
        'computer-connected',
        'computer-expired',
        'remove-computer',
      ],
    },
    /**
     * The person signed in: an admin, or a member who is not an admin. A
     * member sees no actions on the members, no Delete org, and the name,
     * the repositories, the cloud computer, and the agents read-only.
     */
    viewer: { enum: ['admin', 'member'] },
    /**
     * The org: Acme in use, Acme suspended by the operator, or Firna, the
     * new org of the sign-up, whose builds start with its first build. A
     * suspended org shows its notice above every tab, and every person,
     * also an admin, sees the settings read-only, without Delete org. Its
     * one action is Leave org, for each person whom the last-admin rule
     * lets leave.
     */
    org: { enum: ['active', 'suspended', 'new'] },
    /**
     * The colour of the org, which an admin picks on the General tab. The
     * tile of the open org in the rail shows it. Blue is the colour of an
     * org that has none.
     */
    color: { enum: ORG_COLORS },
    ...orgAgentsProperties,
  },
} as const

export type OrgSettingsState = SchemaProps<typeof orgSettingsSchema>

/** The settings of Acme, on its General tab, with no dialog open. */
export const acmeSettings: OrgSettingsState = {
  tab: 'general',
  build: 'ready',
  script: 'built',
  repositoryChange: 'none',
  repositoryView: 'list',
  repositoryOrder: 'list',
  envForm: 'none',
  secrets: 'list',
  ownComputers: 'none',
  computer: 'none',
  dialog: 'none',
  viewer: 'admin',
  org: 'active',
  color: 'blue',
  ...orgAgentsDefaults,
}
