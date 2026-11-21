import { defineComponent } from '@mokly/mokly'
import { OrgDrop } from '../../../components/orgs/OrgDrop'
import { orgs } from '../../../fixtures/orgs'
import { orgTile } from './OrgTile.mockup'

/**
 * Where a dragged org lands, registered with Mokly. The rail or the org
 * switcher supplies the lifted copy in the `children` slot.
 */
export const orgDrop = defineComponent({
  slug: 'org-drop',
  title: 'Org drop',
  description:
    'Where a dragged org lands, on the rail or in the org switcher of a phone: a line between two orgs, and the org lifted as a raised card under the pointer or the finger. The rail or the switcher supplies the lifted copy. Its own page shows the line and an empty card on the rail.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['at', 'name', 'place', 'count'],
    properties: {
      at: { enum: ['rail', 'sheet'] },
      /** The name of the dragged org. */
      name: { type: 'string' },
      /** The place of the org after the drop, counted from 1. */
      place: { type: 'integer', minimum: 1 },
      count: { type: 'integer', minimum: 1 },
    },
  } as const,
  slots: ['children'],
  props: { at: 'rail', name: orgs.firna.name, place: 1, count: 3 },
  render: (props) => (
    <OrgDrop
      at={props.at}
      count={props.count}
      name={props.name}
      place={props.place}
    >
      {props.children}
    </OrgDrop>
  ),
  variants: [
    {
      slug: 'tile',
      title: 'Tile on the rail',
      description:
        'The raised tile of Firna on its way to the top of the rail.',
      props: {},
      slots: { children: <orgTile.Component org={orgs.firna} size={26} /> },
    },
    {
      slug: 'sheet',
      title: 'In the org switcher',
      description: 'The raised card of a row of the org switcher of a phone.',
      props: { at: 'sheet' },
      slots: { children: <span>{orgs.firna.name}</span> },
    },
  ],
})
