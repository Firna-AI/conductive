import { defineComponent } from '@mokly/mokly'
import {
  AccountTabs,
  type AccountTab,
} from '../../../components/settings/AccountTabs'
import { shortcutHosts } from '../common/shortcutSchemas'

/** The pages of the account, as `AccountTab` lists them. */
const accountTabKeys = [
  'general',
  'agents',
  'preferences',
  'shortcuts',
  'stats',
  'this-mac',
] as const satisfies readonly AccountTab[]

/** The tabs of the account, registered with Mokly. */
export const accountTabs = defineComponent({
  slug: 'account-tabs',
  title: 'Account tabs',
  description:
    'The pages of the account as tabs that link to each one: General, Agents, Preferences, Keyboard shortcuts, and Stats. Keyboard shortcuts links to the tab of the host. The Mac app adds This Mac last. On a phone, a tab that does not fit moves to a second line. Its own page shows General in a browser.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tab', 'host'],
    properties: {
      tab: { enum: accountTabKeys },
      /** Where the app runs, which sets the tab of Keyboard shortcuts. */
      host: { enum: shortcutHosts },
      /** A tab that does not fit moves to a second line, for a phone. */
      flow: { type: 'boolean' },
    },
  } as const,
  props: { tab: 'general', host: 'chrome-mac' },
  render: (props) => (
    <AccountTabs flow={props.flow} host={props.host} tab={props.tab} />
  ),
  variants: [
    {
      slug: 'mac-app',
      title: 'Mac app',
      description: 'The tabs of the Mac app, with This Mac last and shown.',
      props: { tab: 'this-mac', host: 'mac-app' },
    },
    {
      slug: 'flow',
      title: 'On a phone',
      description:
        'The tabs of a phone, where a tab that does not fit moves to a second line.',
      props: { tab: 'stats', flow: true },
    },
  ],
})
