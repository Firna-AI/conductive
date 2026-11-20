import { defineScreen } from '@mokly/mokly'
import { SettingsOptionsScreen } from '../../../../screens/SettingsOptionsScreen'
import {
  settingsOptionsSchema,
  settingsOptionStates,
} from '../../../../screens/settingsOptions'

export const settingsOptionB = defineScreen({
  title: 'B. One page, list inside the page',
  description:
    'Option B: one Settings page, with an Account group and an Acme group in a list on the left of the page. The workspace sidebar stays beside it, so the desktop shows four columns: the rail, the sidebar, the list, and the section. On a phone it draws the same screens as option C.',
  rationale:
    'The user asked on 17 November 2026 for one place for the settings of the person and of the org, because Command-comma opens only the account, and for a list of sections on the left, because many tabs at the top do not fit a phone. These pages are options for review. The user has not chosen one yet, and the app still shows two pages with tabs, as app/account and app/org-settings show. Every option shows the current org only, which is not yet decided either.',
  relatedDocs: [],
  propSchema: settingsOptionsSchema,
  props: settingsOptionStates['b'],
  render: (props, context) => (
    <SettingsOptionsScreen state={props} viewport={context.viewport} />
  ),
})
