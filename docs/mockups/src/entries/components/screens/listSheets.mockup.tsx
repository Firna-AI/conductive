import { defineComponent } from '@mokly/mokly'
import {
  OrgSwitcherSheet,
  SectionSheet,
  WorkspaceMenuSheet,
} from '../../../screens/listSheets'
import { orgKeys, orgSchema } from '../layout/railSchemas'
import { rowMenuOpenSchema } from '../workspaces/rowSchemas'

/** The org switcher of a phone, registered with Mokly. */
export const orgSwitcherSheet = defineComponent({
  slug: 'org-switcher-sheet',
  title: 'Org switcher sheet',
  description:
    'The org switcher of a phone, which has no rail: every org in the order of the person, the current one checked, Create org, and the account. An operator also gets Operator under the account. A long press lifts an org: a faint copy stays at its place, a line marks where it lands, and a raised copy of its row follows the finger. Its own page shows the orgs of Cal with Acme open.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['current'],
    properties: {
      current: { enum: orgKeys },
      /** The person signed in runs the app for everyone. */
      operator: { type: 'boolean' },
      /** The orgs in the order of the person. Without them, the orgs of Cal. */
      orgs: { type: 'array', items: orgSchema },
      /** An org that a long press lifted, and the place of its line. */
      drag: {
        type: 'object',
        additionalProperties: false,
        required: ['org', 'index'],
        properties: {
          org: { enum: orgKeys },
          index: { type: 'integer', minimum: 0 },
        },
      },
    },
  } as const,
  props: { current: 'acme' },
  render: (props) => (
    <OrgSwitcherSheet
      current={props.current}
      drag={props.drag}
      operator={props.operator}
      orgs={props.orgs}
    />
  ),
  variants: [
    {
      slug: 'operator',
      title: 'Operator',
      description:
        'The switcher of an operator, with Operator under the account.',
      props: { operator: true },
    },
    {
      slug: 'drag',
      title: 'Drag',
      description: 'Firna on its way to the top of the list.',
      props: { drag: { org: 'firna', index: 0 } },
    },
  ],
})

/** The menu of a section on a phone, registered with Mokly. */
export const sectionSheet = defineComponent({
  slug: 'section-sheet',
  title: 'Section sheet',
  description:
    'The menu of a section as a phone shows it: a sheet with the name of the section and its actions. Its own page shows the menu of Checkout.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <SectionSheet />,
})

/** The menu of a workspace row on a phone, registered with Mokly. */
export const workspaceMenuSheet = defineComponent({
  slug: 'workspace-menu-sheet',
  title: 'Workspace menu sheet',
  description:
    'The menu of a workspace row as a phone layout shows it: a sheet with the name of the workspace. A choice with a submenu, such as Move to section, shows its choices in the sheet in place of the menu. Its own page shows the menu of an admin.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['menu'],
    properties: { menu: rowMenuOpenSchema },
  } as const,
  props: {
    menu: {
      at: 'sheet',
      label: 'Apple Pay button',
      entries: [
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
      ],
    },
  },
  render: (props) => <WorkspaceMenuSheet menu={props.menu} />,
  variants: [
    {
      slug: 'move',
      title: 'Move to section',
      description:
        'The sections in place of the menu, the current one checked.',
      props: {
        menu: {
          at: 'sheet',
          label: 'Apple Pay button',
          entries: [],
          submenu: {
            label: 'Section',
            item: 0,
            entries: [
              { kind: 'label', label: 'Section' },
              { kind: 'item', label: 'General', checked: false },
              { kind: 'item', label: 'Checkout', checked: true },
              { kind: 'item', label: 'Infra', checked: false },
            ],
          },
        },
      },
    },
  ],
})
