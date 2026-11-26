import { defineComponent } from '@mokly/mokly'
import { DropPlace, TabItem } from '../../../components/workspace/TabItem'
import { paths } from '../../../paths'
import { openTabMenuSchema, workspaceTabSchema } from './tabSchemas'
import { openTabs } from './tabPages'

const [session, , code] = openTabs

/**
 * One tab of the row of the centre column, registered with Mokly. Its
 * pages show a shown session, the temporary tab, the open menu of a tab,
 * the field of Rename session, and a terminal tab that cannot close.
 */
export const tabItem = defineComponent({
  slug: 'tab-item',
  title: 'Tab item',
  description:
    'One tab of the row: its icon, its title, and its close button. The temporary tab shows its title in italics. While a drag lasts, the dragged tab stays at its place as a faint copy. A tab with an open menu shows the menu below it, and a tab that renames its session shows the rename field in place of its label. A tab that cannot close, such as the last terminal, has no close button. Its own page shows the shown session.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tab'],
    properties: {
      tab: workspaceTabSchema,
      /** The faint copy that a drag leaves at the place of the tab. */
      placeholder: { type: 'boolean' },
      menu: openTabMenuSchema,
      renaming: { type: 'boolean' },
      closable: { type: 'boolean' },
      /** The screen that the close button opens, such as a question. */
      closeTo: { type: 'string', minLength: 1 },
    },
  } as const,
  props: { tab: session },
  render: (props) => (
    <TabItem
      closable={props.closable}
      closeTo={props.closeTo}
      menu={props.menu}
      placeholder={props.placeholder}
      renaming={props.renaming}
      tab={props.tab}
    />
  ),
  variants: [
    {
      slug: 'temporary',
      title: 'Temporary tab',
      description:
        'The temporary tab of a file, whose title shows in italics, in the middle of a drag.',
      props: {
        tab: { ...code, title: 'AddressForm.tsx', temporary: true },
        placeholder: true,
      },
    },
    {
      slug: 'menu',
      title: 'Menu open',
      description:
        'The menu of the last tab below it: the moves and the close that its place rules out are off.',
      props: {
        tab: code,
        menu: {
          anchored: true,
          entries: [
            { kind: 'item', label: 'Move left', icon: 'arrow-left' },
            {
              kind: 'item',
              label: 'Move right',
              icon: 'arrow-right',
              disabled: true,
            },
            { kind: 'divider' },
            {
              kind: 'item',
              label: 'Close tabs to the right',
              icon: 'x',
              disabled: true,
            },
          ],
        },
      },
    },
    {
      slug: 'renaming',
      title: 'Rename session',
      description: 'The field of Rename session in place of the label.',
      props: { renaming: true },
    },
    {
      slug: 'kept',
      title: 'Last terminal',
      description:
        'The last terminal of a workspace, which cannot close, so it has no close button.',
      props: {
        tab: {
          key: 'terminal-1',
          kind: 'terminal',
          title: 'Terminal 1',
          to: paths.terminal,
          selected: true,
        },
        closable: false,
      },
    },
  ],
})

/** Where a dragged tab lands, registered with Mokly. */
export const dropPlace = defineComponent({
  slug: 'drop-place',
  title: 'Drop place',
  description:
    'Where a dragged tab lands: a line between two tabs, and the tab lifted under the pointer. Its own page shows the code file on its way to the second place of three.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tab', 'place', 'count'],
    properties: {
      tab: workspaceTabSchema,
      /** The place of the tab after the drop, counted from 1. */
      place: { type: 'integer', minimum: 1 },
      count: { type: 'integer', minimum: 1 },
    },
  } as const,
  props: { tab: code, place: 2, count: openTabs.length },
  render: (props) => (
    <DropPlace count={props.count} place={props.place} tab={props.tab} />
  ),
})
