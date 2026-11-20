import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const orgAgentsEveryMember = defineScreen({
  title: 'Use for every member',
  description:
    'Cal turned on "Use for every member" under the Claude login of Acme. The hint now says "Every new session uses it, also for members with a login of their own." The switch saved at once.',
  rationale:
    'The user chose decision 7 B of the org logins plan on 16 November 2026: an admin decides which login runs the work of the org. While the switch is on, each new session in Acme takes the org login, also an automation run and a session that an agent tool starts. While the org login cannot be used, the own login of each member serves. Older sessions keep their login, so the switch moves no session and rewrites no prompt cache. The composer and the New workspace form name the org login, as app/composer/org-login/every-member and app/new-workspace/dialog/org-login/every-member show. A save of the switch keeps the time of the last change of the login, because running turns check that time.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'agents', everyMember: 'on' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'not-saved',
      title: 'Switch not saved',
      description:
        'Cal turned the switch on, and the app could not save the change. The switch shows the saved value, off, again, with its hint. Under the hint, the row says "Not saved. The request failed. Try again." The words stay until the next change of the switch.',
      rationale:
        'The switch saves at once, as the share switch of a personal login does, so a change that failed must not look saved, as app/account/share-not-saved shows. The cause stays beside the switch, not in a toast that goes away, because the setting decides which login every member of Acme spends.',
      props: { everyMember: 'not-saved' },
    },
  ],
})
