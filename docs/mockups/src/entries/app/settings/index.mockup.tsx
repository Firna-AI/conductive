import { defineScreen } from '@mokly/mokly'
import { SettingsListScreen } from '../../../screens/SettingsListScreen'

export const settings = defineScreen({
  title: 'Settings',
  description:
    'The first screen of Settings on a phone: the Account group with General, Agents, Preferences, Keyboard shortcuts, and Stats, then the Acme group with General, Repositories, Cloud computer, Secrets, and Members. Each row opens its tab as a screen of its own, with Settings as the way back, as app/account/agents shows. The Account row of the org switcher opens this screen. A desktop has no list screen, so the address opens Account › General in the Settings dialog, as app/account shows.',
  rationale:
    'The user asked on 17 November 2026 for one place for the settings of the person and of the org, which Command-comma opens, with the tabs in a list on the left instead of a row at the top, because many tabs at the top do not fit a phone. The user chose option D on 20 November 2026: Settings is a dialog over the whole window. A dialog with two columns does not fit a phone, so a phone shows the list and each tab as screens of their own, as New workspace opens as a page on a phone. The org group shows the current org. Decision 2 of the plan, which asks whether other orgs show too, is open.',
  relatedDocs: [],
  render: (_props, context) => (
    <SettingsListScreen viewport={context.viewport} />
  ),
})
