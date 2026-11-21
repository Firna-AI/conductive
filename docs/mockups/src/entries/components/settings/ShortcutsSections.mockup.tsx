import { defineComponent } from '@mokly/mokly'
import {
  keyChanges,
  ShortcutsTab,
} from '../../../components/settings/ShortcutsSections'
import { shortcutSearches } from '../../../components/settings/shortcutSearch'
import { editedShortcuts } from '../../../fixtures/shortcutChanges'
import { shortcutChangesSchema, shortcutHosts } from '../common/shortcutSchemas'

/** The Keyboard shortcuts tab of the account, registered with Mokly. */
export const shortcutsTab = defineComponent({
  slug: 'shortcuts-tab',
  title: 'Shortcuts tab',
  description:
    'The Keyboard shortcuts tab of the account on a host: a search field, the lines about the keys, and each command with its shortcuts in the groups of Conductor. A press on a shortcut, on +, or on Add shortcut records the next keys, and each change saves at once. A changed row shows Reset. A group of fixed shortcuts says so under its title. In a normal browser tab, a key that the browser keeps is dimmed. Its own page shows the default keys in a normal Chrome tab on a Mac.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['host', 'changes', 'change', 'search'],
    properties: {
      /** Where the app runs, which sets the keys of the tab. */
      host: { enum: shortcutHosts },
      /** The person's changes on the keyboard of the host. */
      changes: shortcutChangesSchema,
      /** The change of a shortcut on the tab, in progress or last. */
      change: { enum: keyChanges },
      /** The query in the search field. */
      search: { enum: shortcutSearches },
    },
  } as const,
  props: { host: 'chrome-mac', changes: {}, change: 'none', search: 'none' },
  render: (props) => (
    <ShortcutsTab
      change={props.change}
      changes={props.changes}
      host={props.host}
      search={props.search}
    />
  ),
  variants: [
    {
      slug: 'changes',
      title: 'Changes',
      description:
        'The tab after a few changes: changed rows with Reset, and Reset all.',
      props: { changes: editedShortcuts },
    },
    {
      slug: 'conflict',
      title: 'Conflict',
      description:
        'A recorded shortcut that another command holds: Replace and Cancel in its row.',
      props: { change: 'conflict' },
    },
    {
      slug: 'search',
      title: 'Search',
      description:
        'A search for "tab", which keeps the rows whose label or words hold it.',
      props: { search: 'found' },
    },
    {
      slug: 'mac-app',
      title: 'Mac app',
      description:
        'The tab of the Mac app, which gives the page every key and adds its own commands.',
      props: { host: 'mac-app' },
    },
  ],
})
