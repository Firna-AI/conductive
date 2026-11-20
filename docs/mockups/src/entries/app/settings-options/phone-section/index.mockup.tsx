import { defineScreen } from '@mokly/mokly'
import { SettingsOptionsScreen } from '../../../../screens/SettingsOptionsScreen'
import {
  settingsOptionsSchema,
  settingsOptionStates,
} from '../../../../screens/settingsOptions'

export const settingsOptionSection = defineScreen({
  title: 'Phone: a section',
  description:
    'A section on a phone in options B, C, and D: the Repositories section of Acme, with Settings as the way back to the list. The desktop view draws option C with the same section.',
  rationale:
    'The user asked on 17 November 2026 for one place for the settings of the person and of the org, because Command-comma opens only the account, and for a list of sections on the left, because many tabs at the top do not fit a phone. These pages are options for review. The user has not chosen one yet, and the app still shows two pages with tabs, as app/account and app/org-settings show. Every option shows the current org only, which is not yet decided either.',
  relatedDocs: [],
  propSchema: settingsOptionsSchema,
  props: settingsOptionStates['phone-section'],
  render: (props, context) => (
    <SettingsOptionsScreen state={props} viewport={context.viewport} />
  ),
})
