import { defineScreen } from '@mokly/mokly'
import { SettingsOptionsScreen } from '../../../../screens/SettingsOptionsScreen'
import {
  settingsOptionsSchema,
  settingsOptionStates,
} from '../../../../screens/settingsOptions'

export const settingsOptionA = defineScreen({
  title: 'A. Two pages, each with a list',
  description:
    'Option A: the org settings and the account stay two pages. Each page puts its sections in a list on the left of the page, in place of the tabs at the top. The org settings keep the workspace sidebar, and the last row of the list opens the account. Command-comma could open the org settings on an org page. On a phone, the page first lists its sections, and Account settings links to the account.',
  rationale:
    'The user asked on 17 November 2026 for one place for the settings of the person and of the org, because Command-comma opens only the account, and for a list of sections on the left, because many tabs at the top do not fit a phone. These pages are options for review. The user has not chosen one yet, and the app still shows two pages with tabs, as app/account and app/org-settings show. Every option shows the current org only, which is not yet decided either.',
  relatedDocs: [],
  propSchema: settingsOptionsSchema,
  props: settingsOptionStates['a'],
  render: (props, context) => (
    <SettingsOptionsScreen state={props} viewport={context.viewport} />
  ),
})
