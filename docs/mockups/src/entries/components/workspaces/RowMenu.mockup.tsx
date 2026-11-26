import { defineComponent } from '@mokly/mokly'
import { RowPointMenu } from '../../../components/workspaces/RowMenu'
import type { MenuEntryData } from '../common/menuEntries'
import { rowControlsSchema } from './rowSchemas'

/** The menu of a workspace row for an admin, in a list with sections. */
const adminMenu = [
  {
    kind: 'item',
    label: 'Move to section',
    icon: 'folder-input',
    submenu: 'closed',
  },
  {
    kind: 'item',
    label: 'Reassign to',
    icon: 'user-round-pen',
    submenu: 'closed',
  },
  { kind: 'item', label: 'Rename', icon: 'pencil' },
  { kind: 'item', label: 'Copy link', icon: 'link' },
  { kind: 'divider' },
  { kind: 'item', label: 'Archive', icon: 'archive' },
] as const satisfies readonly MenuEntryData[]

/** The menu with one submenu open. */
function openAt(label: string): MenuEntryData[] {
  return adminMenu.map((entry) =>
    entry.kind === 'item' && entry.label === label
      ? { ...entry, submenu: 'open' }
      : entry,
  )
}

/**
 * The menu of a right click on a workspace row, registered with Mokly. Its
 * pages show the menu of an admin at the pointer, and each of its two
 * submenus open beside it, level with its item.
 */
export const rowPointMenu = defineComponent({
  slug: 'row-point-menu',
  title: 'Row point menu',
  description:
    'The menu of a right click on a workspace row, drawn in place at the pointer over the name of the row on desktop: its top left corner takes the point, and an open submenu sits beside it, level with its item. A phone shows the menu as a sheet instead, so the part draws nothing for it. Its own page shows the menu of an admin.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['controls'],
    properties: { controls: rowControlsSchema },
  } as const,
  props: {
    controls: {
      open: { at: 'pointer', label: 'Saved carts', entries: adminMenu },
    },
  },
  render: (props) => <RowPointMenu controls={props.controls} />,
  variants: [
    {
      slug: 'move',
      title: 'Move to section',
      description:
        'The sections beside the first item, with the section of the workspace checked.',
      props: {
        controls: {
          open: {
            at: 'pointer',
            label: 'Saved carts',
            entries: openAt('Move to section'),
            submenu: {
              label: 'Section',
              item: 0,
              entries: [
                { kind: 'label', label: 'Section' },
                { kind: 'item', label: 'General', checked: true },
                { kind: 'item', label: 'Checkout', checked: false },
                { kind: 'item', label: 'Infra', checked: false },
              ],
            },
          },
        },
      },
    },
    {
      slug: 'reassign',
      title: 'Reassign to',
      description:
        'The members of the org beside the second item, in a wide submenu, with the owner checked.',
      props: {
        controls: {
          open: {
            at: 'pointer',
            label: 'Saved carts',
            entries: openAt('Reassign to'),
            submenu: {
              label: 'Owner',
              item: 1,
              wide: true,
              entries: [
                { kind: 'label', label: 'Owner' },
                {
                  kind: 'item',
                  label: 'Cal',
                  mark: { kind: 'person', initials: 'C' },
                  checked: true,
                },
                {
                  kind: 'item',
                  label: 'Priya Raman',
                  mark: { kind: 'person', initials: 'PR' },
                  checked: false,
                },
                { kind: 'divider' },
                {
                  kind: 'note',
                  text: 'Each session runs on the agent login of the member who started it.',
                },
              ],
            },
          },
        },
      },
    },
  ],
})
