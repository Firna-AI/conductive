import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../screens/orgSettingsState'

export const ownComputers = defineScreen({
  title: 'Own computers',
  description:
    'The Own computers tab of Acme, as Cal, an admin, sees it. Each row names an own computer, its size and its builds, its state, and how many of its workspaces run of its limit: build-01 with room, build-02 full, lab-server offline, and build-03, which Cal just added, during its first build. The name of a computer opens its page. Add computer at the bottom opens the dialog. The note under the list says that each computer builds the repositories, the scripts, and the env vars of the Cloud computer tab, and links to that tab. The tab follows Cloud computer, and a phone puts the seven tabs in three columns. The child pages show the view of a member, an org without own computers, a computer that waits for its first connection, the Add computer dialog, the page of a computer, and its builds.',
  rationale:
    'Own computers are Linux servers that an org adds to the app, and each workspace on one runs in its own container (own computer decisions 1 D and 5 C, which Cal chose on 22 November 2026). Only admins add an own computer, and each one serves the whole org (own computer decision 2 A), because root on the server can read the work, the env vars, and the allowed secrets of every workspace on it. Users see the name "own computer", and the cloud computer keeps its name. The tab is Own computers, not Computers, because a tab named Computers beside Cloud computer reads as a list of every computer. Each computer builds the setup of the org from the base image of the app, so the scripts and the env vars stay on the Cloud computer tab, and the note links there. A row gives the workspaces that run with the limit, because an admin sets the limit for the size of each server.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'own-computers', ownComputers: 'list' },
  useCasePaths: ['user-flows/add-own-computer'],
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
