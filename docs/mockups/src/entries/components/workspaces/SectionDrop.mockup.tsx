import { defineComponent } from '@mokly/mokly'
import { SectionDrop } from '../../../components/workspaces/SectionDrop'
import { acmeSection } from './listPages'
import { sidebarSectionSchema } from './workspaceSchemas'

/**
 * Where a dragged section lands, registered with Mokly. Its page shows
 * Infra lifted between General and Checkout, as the section drag of the
 * list draws it.
 */
export const sectionDrop = defineComponent({
  slug: 'section-drop',
  title: 'Section drop',
  description:
    'Where a dragged section lands: a line in the gap between two sections, and the lifted header of the section under the pointer, with its name and its count, also while the section is open. The line takes no room, so the sections do not move while the drag lasts. Its own page shows Infra on its way to the second place.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['item', 'place'],
    properties: {
      item: sidebarSectionSchema,
      /** The place of the section after the drop, counted from 1. */
      place: { type: 'integer', minimum: 1 },
    },
  } as const,
  props: { item: acmeSection('infra'), place: 2 },
  render: (props) => <SectionDrop item={props.item} place={props.place} />,
})
