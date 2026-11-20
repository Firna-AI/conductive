import { defineScreen } from '@mokly/mokly'
import { SettingsOptionsScreen } from '../../../../screens/SettingsOptionsScreen'
import {
  settingsOptionsSchema,
  settingsOptionStates,
} from '../../../../screens/settingsOptions'

export const settingsOptionD = defineScreen({
  title: 'D. Dialog over the window',
  description:
    'Option D: Settings opens in a large dialog over the whole window, with the list on its left and the section on its right. Close and Esc return to the page below. The dialog covers the rail, so another org shows its settings only after Close. On a phone the dialog fills the screen, so it draws the same screens as option C.',
  rationale:
    'The user asked on 17 November 2026 for one place for the settings of the person and of the org, because Command-comma opens only the account, and for a list of sections on the left, because many tabs at the top do not fit a phone. These pages are options for review. The user has not chosen one yet, and the app still shows two pages with tabs, as app/account and app/org-settings show. Every option shows the current org only, which is not yet decided either.',
  relatedDocs: [],
  propSchema: settingsOptionsSchema,
  props: settingsOptionStates['d'],
  render: (props, context) => (
    <SettingsOptionsScreen state={props} viewport={context.viewport} />
  ),
})
