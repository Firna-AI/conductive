import { defineComponent } from '@mokly/mokly'
import { TabMenuSheet } from '../../../components/workspace/TabMenu'
import { openTabs } from './tabPages'
import { workspaceTabSchema } from './tabSchemas'

/** The tab menu of a phone, registered with Mokly. */
export const tabMenuSheet = defineComponent({
  slug: 'tab-menu-sheet',
  title: 'Tab menu sheet',
  description:
    'The menu of a tab on a phone: a sheet with the title of the tab, which a long press that ends without a move opens. A session tab leads with Rename session and its copy items, and a read-only workspace leaves out each item that changes the workspace. Its own page shows the menu of the first session.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tabs', 'tab', 'readOnly'],
    properties: {
      tabs: { type: 'array', items: workspaceTabSchema },
      /** The key of the tab whose menu is open. */
      tab: { type: 'string' },
      /** A read-only workspace, such as an archived one. */
      readOnly: { type: 'boolean' },
    },
  } as const,
  props: { tabs: openTabs, tab: openTabs[0].key, readOnly: false },
  render: (props) => (
    <TabMenuSheet readOnly={props.readOnly} tab={props.tab} tabs={props.tabs} />
  ),
  variants: [
    {
      slug: 'read-only',
      title: 'Read-only',
      description:
        'The menu of a session of an archived workspace: only its copy items.',
      props: { readOnly: true },
    },
  ],
})
