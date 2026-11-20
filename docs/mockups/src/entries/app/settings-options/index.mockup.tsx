import { defineScreen } from '@mokly/mokly'
import { SettingsOptionsScreen } from '../../../screens/SettingsOptionsScreen'
import {
  settingsOptionsSchema,
  settingsOptionStates,
} from '../../../screens/settingsOptions'

export const settingsOptions = defineScreen({
  title: 'C. List in place of the sidebar',
  description:
    'Option C, the recommended option: one Settings page. Its list of sections takes the place of the workspace sidebar while the page is open, with an Account group and a group for the current org, Acme. The first row leads back to the workspaces, and the rail stays, so another org tile opens that org. The main area shows the section, with its group as the subtitle. On a phone, Settings first lists the sections in their groups. Each row opens its section, with a way back to the list, as app/settings-options/phone-section shows. Options B and D draw the same phone screens.',
  rationale:
    'The user asked on 17 November 2026 for one place for the settings of the person and of the org, because Command-comma opens only the account, and for a list of sections on the left, because many tabs at the top do not fit a phone. These pages are options for review. The user has not chosen one yet, and the app still shows two pages with tabs, as app/account and app/org-settings show. Every option shows the current org only, which is not yet decided either.',
  relatedDocs: [],
  propSchema: settingsOptionsSchema,
  props: settingsOptionStates['c'],
  render: (props, context) => (
    <SettingsOptionsScreen state={props} viewport={context.viewport} />
  ),
})
