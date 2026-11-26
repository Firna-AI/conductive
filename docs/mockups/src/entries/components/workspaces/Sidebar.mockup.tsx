import { defineComponent } from '@mokly/mokly'
import { Sidebar } from '../../../components/workspaces/Sidebar'
import { suspendedSections } from '../../../components/workspaces/sections'
import { plainData } from '../../../defined'
import { orgs } from '../../../fixtures/orgs'
import { menuTarget } from '../../../fixtures/workspaceMenu'
import { shortcutChangesSchema } from '../common/shortcutSchemas'
import { orgSchema } from '../layout/railSchemas'
import { acmeSections, adminViewer } from './listPages'
import { sectionListProperties } from './SectionList.mockup'

/**
 * The desktop sidebar of an org, registered with Mokly. Its pages show the
 * sidebar of Acme, New workspace selected after a failed build, a
 * suspended org, a list that did not load, and the open menu of a row.
 */
export const sidebar = defineComponent({
  slug: 'sidebar',
  title: 'Sidebar',
  description:
    'The desktop sidebar beside the org rail: the org name with its Settings cog, New workspace, Automations, Search, and the sections of the org. A suspended org keeps Automations and Search, with read-only sections. A list that did not load shows its failure in place of the sections. An open menu of a row may pass the edge of the sidebar. Its own page shows the sidebar of Acme.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org', 'sections', 'viewer'],
    properties: {
      org: orgSchema,
      ...sectionListProperties,
      /** The page that the main area shows, when the sidebar links to it. */
      current: { enum: ['settings', 'new-workspace', 'automations'] },
      /** A build of the org's cloud computer failed. */
      settingsAlert: { type: 'boolean' },
      /** The New workspace page of the org, such as that of a new org. */
      newWorkspaceTo: { type: 'string', minLength: 1 },
      /** The operator suspended the org. */
      suspended: { type: 'boolean' },
      /** The workspace list of the org did not load. */
      failed: { type: 'boolean' },
      /** The person's changes to the shortcuts, for the key of Search. */
      shortcuts: shortcutChangesSchema,
    },
  } as const,
  props: { org: orgs.acme, sections: acmeSections, viewer: adminViewer },
  render: (props) => (
    <Sidebar
      archived={props.archived}
      archivedCollapsed={props.archivedCollapsed}
      current={props.current}
      drag={props.drag}
      failed={props.failed}
      focus={props.focus}
      menu={props.menu}
      newWorkspaceTo={props.newWorkspaceTo}
      org={props.org}
      queue={props.queue}
      queueDrag={props.queueDrag}
      queueable={props.queueable}
      sections={props.sections}
      settingsAlert={props.settingsAlert}
      shortcuts={props.shortcuts}
      suspended={props.suspended}
      viewer={props.viewer}
    />
  ),
  variants: [
    {
      slug: 'new-workspace',
      title: 'New workspace',
      description:
        'New workspace selected while the main area shows it, with the dot of a failed build on the cog.',
      props: { current: 'new-workspace', settingsAlert: true },
    },
    {
      slug: 'row-menu',
      title: 'Row menu',
      description:
        'The menu of a right click on a row, which may pass the edge of the sidebar.',
      props: { focus: { workspace: menuTarget, drawing: { kind: 'menu' } } },
    },
    {
      slug: 'suspended',
      title: 'Suspended org',
      description:
        'A suspended org: no New workspace, and sections without menus, with every row stopped.',
      props: { sections: plainData(suspendedSections()), suspended: true },
    },
    {
      slug: 'failed',
      title: "List didn't load",
      description: 'The failure of the list in place of the sections.',
      props: { failed: true },
    },
  ],
})
