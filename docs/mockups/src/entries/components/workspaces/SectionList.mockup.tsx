import { defineComponent } from '@mokly/mokly'
import { SectionList } from '../../../components/workspaces/SectionList'
import { sectionDrag } from '../../../fixtures/sections'
import { workspaceDrag } from '../../../fixtures/workspaces'
import { acmeSections, adminViewer, openInCollapsedSections } from './listPages'
import { listDragSchema, listMenuSchema, rowFocusSchema } from './rowSchemas'
import {
  membershipSchema,
  sidebarSectionSchema,
  workspaceRowSchema,
} from './workspaceSchemas'

/** The props of the sections of a list, as `SectionList` takes them. */
export const sectionListProperties = {
  sections: { type: 'array', items: sidebarSectionSchema },
  menu: listMenuSchema,
  drag: listDragSchema,
  /** The archived workspaces, in the Archived group at the end. */
  archived: { type: 'array', items: workspaceRowSchema },
  /** The Archived group shows collapsed, with its count. */
  archivedCollapsed: { type: 'boolean' },
  /** The person who looks at the list. Their role decides the actions. */
  viewer: membershipSchema,
  /** The row whose menu, field, or hover the view draws. */
  focus: rowFocusSchema,
} as const

/**
 * The sections of an org with their workspaces, registered with Mokly. Its
 * pages show the sidebar of Acme, the list page, the menu of a section, and
 * the drags of a workspace and of a section.
 */
export const sectionList = defineComponent({
  slug: 'section-list',
  title: 'Section list',
  description:
    'The sections of the org, each a group of workspaces that the user made, with the Archived group at the end. A collapsed section shows only its header and its count, and the row of the open workspace when it holds that workspace. A workspace moves to another section by drag and drop, and a section moves by a drag of its header. The sidebar uses compact rows, and the list page taller rows for touch. Its own page shows the sections of Acme in the sidebar.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['sections', 'variant', 'viewer'],
    properties: {
      ...sectionListProperties,
      variant: { enum: ['sidebar', 'page'] },
      /** An open menu beside its trigger, or only the open trigger. */
      menuStyle: { enum: ['anchored', 'sheet'] },
      /** A suspended org: no menus. */
      readOnly: { type: 'boolean' },
    },
  } as const,
  props: { sections: acmeSections, variant: 'sidebar', viewer: adminViewer },
  render: (props) => (
    <SectionList
      archived={props.archived}
      archivedCollapsed={props.archivedCollapsed}
      drag={props.drag}
      focus={props.focus}
      menu={props.menu}
      menuStyle={props.menuStyle}
      readOnly={props.readOnly}
      sections={props.sections}
      variant={props.variant}
      viewer={props.viewer}
    />
  ),
  variants: [
    {
      slug: 'page',
      title: 'On the list page',
      description: 'The sections on the list page, with taller rows.',
      props: { variant: 'page' },
    },
    {
      slug: 'open-in-collapsed',
      title: 'Open workspace in a collapsed section',
      description:
        'Infra is collapsed, and its workspace "Move retries to a queue" is open. Infra still shows that row, so the open workspace stays in sight. Its other rows stay hidden.',
      props: { sections: openInCollapsedSections },
    },
    {
      slug: 'section-menu',
      title: 'Section menu',
      description: 'The menu of the Checkout section, open below its button.',
      props: { menu: { section: 'checkout' } },
    },
    {
      slug: 'drag',
      title: 'Workspace drag',
      description:
        'A workspace on its way to General: a faint copy at its place, a line where it lands, and the lifted row.',
      props: { drag: workspaceDrag },
    },
    {
      slug: 'section-drag',
      title: 'Section drag',
      description:
        'Infra on its way to the second place: a faint section, a line between General and Checkout, and its lifted header.',
      props: { drag: sectionDrag },
    },
  ],
})
