import { defineComponent } from '@mokly/mokly'
import { Menu } from '../../../../../../src/ui/components/common/Menu'
import { menuSchema, plainEntry } from './menuEntries'

/**
 * An open menu of actions or choices, registered with Mokly. Its entries
 * are JSON: an item names its icons by key, and its mark as a person or an
 * agent. Its pages show menus at a point and in a sheet, because a page
 * of a part has no trigger to place a menu beside.
 */
export const menu = defineComponent({
  slug: 'menu',
  title: 'Menu',
  description:
    'An open menu of actions or choices, drawn in place: items with an icon or a mark, labels of groups, notes, switches, and dividers. A menu opens beside its trigger, at a point such as the pointer of a right click, or in a phone sheet. Its own page shows the menu of a workspace row at a point.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: menuSchema,
  props: {
    label: 'Saved carts',
    placement: 'point',
    entries: [
      {
        kind: 'item',
        label: 'Move to section',
        icon: 'folder-input',
        submenu: 'closed',
      },
      { kind: 'item', label: 'Rename', icon: 'pencil' },
      { kind: 'item', label: 'Copy link', icon: 'link' },
      { kind: 'divider' },
      { kind: 'item', label: 'Archive', icon: 'archive' },
    ],
  },
  render: (props) => (
    <Menu
      entries={props.entries.map(plainEntry)}
      label={props.label}
      placement={props.placement}
      wide={props.wide}
    />
  ),
  variants: [
    {
      slug: 'sheet',
      title: 'In a sheet',
      description:
        'The rows of a menu in a phone sheet: tall enough to touch, with the label of a group, the current choice, and a note under the choices.',
      props: {
        label: 'Repository',
        placement: 'sheet',
        entries: [
          { kind: 'label', label: 'Acme' },
          { kind: 'item', label: 'acme/web', checked: true },
          { kind: 'item', label: 'acme/api', checked: false },
          {
            kind: 'note',
            text: 'Admins choose the repositories of the org in its settings.',
          },
        ],
      },
    },
    {
      slug: 'people',
      title: 'People',
      description:
        'A wide menu of people, each with an avatar, the current owner marked, and a note.',
      props: {
        label: 'Owner',
        placement: 'point',
        wide: true,
        entries: [
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
    {
      slug: 'states',
      title: 'Item states',
      description:
        'The item under the pointer, an item that is off, and an item that deletes.',
      props: {
        label: 'Backlog',
        placement: 'point',
        entries: [
          {
            kind: 'item',
            label: 'New workspace',
            icon: 'plus',
            highlighted: true,
          },
          {
            kind: 'item',
            label: 'Move section up',
            icon: 'arrow-up',
            disabled: true,
          },
          { kind: 'divider' },
          {
            kind: 'item',
            label: 'Delete section',
            icon: 'trash-2',
            tone: 'danger',
          },
        ],
      },
    },
    {
      slug: 'switch',
      title: 'Choices and a switch',
      description:
        'The model picker: the current model and effort, a model of the other agent that opens a new session, and Fast with its key and its switch.',
      props: {
        label: 'Model and effort',
        placement: 'point',
        entries: [
          { kind: 'item', label: 'Opus 4.5', checked: true },
          {
            kind: 'item',
            label: 'GPT-5.1',
            trailingIcon: 'external-link',
            trailingLabel: 'New session',
            checked: false,
          },
          { kind: 'divider' },
          { kind: 'label', label: 'Effort' },
          { kind: 'item', label: 'High', checked: true },
          { kind: 'divider' },
          {
            kind: 'switch',
            label: 'Fast',
            on: false,
            shortcut: ['⌥', '⌘', 'F'],
          },
        ],
      },
    },
  ],
})
