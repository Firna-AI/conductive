import { defineComponent } from '@mokly/mokly'
import { Gauge } from 'lucide-react'
import {
  OrgItem,
  RailLink,
  RailTile,
} from '../../../components/layout/RailItems'
import { shortcutSchema } from '../common/shortcutSchemas'
import { orgs } from '../../../fixtures/orgs'
import { paths } from '../../../paths'
import { menuSchema } from '../common/menuEntries'
import { orgSchema } from './railSchemas'

/** A link of the org rail, registered with Mokly. */
export const railLink = defineComponent({
  slug: 'rail-link',
  title: 'Rail link',
  description:
    'A link of the org rail, such as Create org, Operator, or the account: a 34 px square with its content, in a filled pill when it is the current page. Its own page shows a link that is not the current page.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'to', 'current'],
    properties: {
      label: { type: 'string' },
      to: { type: 'string', minLength: 1 },
      current: { type: 'boolean' },
      /** The tile menu of the link is open. */
      open: { type: 'boolean' },
    },
  } as const,
  slots: ['children'],
  props: { label: 'Operator', to: paths.operator, current: false },
  render: (props) => (
    <RailLink
      current={props.current}
      label={props.label}
      open={props.open}
      to={props.to}
    >
      {props.children}
    </RailLink>
  ),
  variants: [
    {
      slug: 'current',
      title: 'Current page',
      description: 'The link of the current page, with its icon in the pill.',
      props: { current: true },
      slots: { children: <Gauge size={16} /> },
    },
  ],
})

/** The square of an org in the rail, registered with Mokly. */
export const railTile = defineComponent({
  slug: 'rail-tile',
  title: 'Rail tile',
  description:
    'The square of an org in the rail: its initials on a 26 px tile, in the accent when the org is open. Its own page shows the tile of the open org.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org', 'current'],
    properties: { org: orgSchema, current: { type: 'boolean' } },
  } as const,
  props: { org: orgs.acme, current: true },
  render: (props) => <RailTile current={props.current} org={props.org} />,
  variants: [
    {
      slug: 'other',
      title: 'Another org',
      description: 'The tile of an org that is not open.',
      props: { org: orgs.futex, current: false },
    },
  ],
})

/**
 * The tile of an org in the rail, registered with Mokly, with its name and
 * key on hover, the menu of a right click, and the faint copy of a drag.
 */
export const orgItem = defineComponent({
  slug: 'org-item',
  title: 'Org item',
  description:
    'The tile of an org in the rail: a link to the org, its name and its key beside it on hover, and the menu of a right click at the pointer. A tile in the middle of a drag stays as a faint copy, which links nowhere. While the sidebar hides, the link of the open org says whether its workspace list is open as a popover. Its own page shows the tile of the open org. The name, the key, and the menu lie beside the narrow rail, so the pages of the org rail show them.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org', 'current', 'hint'],
    properties: {
      org: orgSchema,
      current: { type: 'boolean' },
      /** The workspace list of the org is open as a popover beside the tile. */
      expanded: { type: 'boolean' },
      /** The name of the org shows beside its tile, as on hover. */
      hint: { type: 'boolean' },
      /** The key that opens the org, which its hint shows. */
      shortcut: shortcutSchema,
      state: { const: 'suspended' },
      /** The tile stays as a faint copy during a drag. */
      placeholder: { type: 'boolean' },
      /** The menu of a right click on the tile. */
      menu: menuSchema.properties.entries,
    },
  } as const,
  props: { org: orgs.acme, current: true, hint: false },
  render: (props) => (
    <OrgItem
      current={props.current}
      expanded={props.expanded}
      hint={props.hint}
      menu={props.menu}
      org={props.org}
      placeholder={props.placeholder}
      shortcut={props.shortcut}
      state={props.state}
    />
  ),
  variants: [
    {
      slug: 'suspended',
      title: 'Suspended',
      description:
        'The tile of an org that the operator suspended: it looks as before, and its link names the suspension.',
      props: { org: orgs.futex, current: false, state: 'suspended' },
    },
    {
      slug: 'placeholder',
      title: 'Drag',
      description:
        'The faint copy of a tile during a drag, which links nowhere.',
      props: { placeholder: true },
    },
  ],
})
