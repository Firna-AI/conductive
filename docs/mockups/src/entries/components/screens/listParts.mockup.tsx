import { defineComponent } from '@mokly/mokly'
import {
  ChooseWorkspace,
  DeletedOrg,
  HomeList,
  ListHeader,
  NewOrgEmpty,
  SuspendedList,
  type NewOrg,
} from '../../../screens/listParts'
import { suspendedSections } from '../../../components/workspaces/sections'
import { plainData } from '../../../defined'
import { deletedOrg, orgs } from '../../../fixtures/orgs'
import { newOrg } from '../../../fixtures/repositories'
import { orgSchema } from '../layout/railSchemas'
import { acmeSections, adminViewer } from '../workspaces/listPages'
import { rowFocusSchema } from '../workspaces/rowSchemas'
import { sectionListProperties } from '../workspaces/SectionList.mockup'
import {
  membershipSchema,
  sidebarSectionSchema,
} from '../workspaces/workspaceSchemas'

/** A screen of the catalogue that a link opens. */
const toSchema = { type: 'string', minLength: 1 } as const

/** A new org and the repositories that it chose, as `NewOrg`. */
const newOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'repositories'],
  properties: {
    name: { type: 'string' },
    repositories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'used'],
        properties: { name: { type: 'string' }, used: { type: 'boolean' } },
      },
    },
  },
} as const

/** The fields of a new org that `NewOrgEmpty` takes, for its wrapper. */
export function newOrgOf(org: NewOrg): NewOrg {
  return {
    name: org.name,
    repositories: org.repositories.map(({ name, used }) => ({ name, used })),
  }
}

/** The sections of a suspended org, with every row stopped. */
const stoppedSections = plainData(suspendedSections())

/** The header of the list page of a phone, registered with Mokly. */
export const listHeader = defineComponent({
  slug: 'list-header',
  title: 'List header',
  description:
    'The header of the list page on a phone. A phone has no rail, so the tile and the name of the org open the org switcher. The cog opens the settings of the org, and a deleted org has none. Its own page shows the header of Acme.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org'],
    properties: {
      org: orgSchema,
      /** The org has settings to open. A deleted org has none. */
      settings: { type: 'boolean' },
      /** The page of the settings, such as those of a suspended org. */
      settingsTo: toSchema,
    },
  } as const,
  props: { org: orgs.acme },
  render: (props) => (
    <ListHeader
      org={props.org}
      settings={props.settings}
      settingsTo={props.settingsTo}
    />
  ),
  variants: [
    {
      slug: 'deleted',
      title: 'Deleted org',
      description: 'The header of a deleted org, without the cog.',
      props: { org: orgs[deletedOrg.org], settings: false },
    },
  ],
})

/** The workspace list as a page, registered with Mokly. */
export const homeList = defineComponent({
  slug: 'home-list',
  title: 'Home list',
  description:
    'The workspace list as a page: on a phone, and in a narrow window. The header, New workspace, Automations, Search, and the sections of the org. A suspended org shows its notice first, and no New workspace and no section menus. Search shows the key of the palette only in a desktop window. A list that did not load shows its failure in place of the sections. Its own page shows the list of Acme on a phone.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org', 'sections', 'viewer', 'menuStyle'],
    properties: {
      org: orgSchema,
      ...sectionListProperties,
      /** An open menu beside its trigger, or only the open trigger. */
      menuStyle: { enum: ['anchored', 'sheet'] },
      /** The operator suspended the org. */
      suspended: { type: 'boolean' },
      /** The New workspace page of the org. */
      newWorkspaceTo: toSchema,
      /** Search shows the key of the palette, as in a desktop window. */
      keys: { type: 'boolean' },
      /** The workspace list of the org did not load. */
      failed: { type: 'boolean' },
    },
  } as const,
  props: {
    org: orgs.acme,
    sections: acmeSections,
    viewer: adminViewer,
    menuStyle: 'sheet',
  },
  render: (props) => (
    <HomeList
      archived={props.archived}
      archivedCollapsed={props.archivedCollapsed}
      drag={props.drag}
      failed={props.failed}
      focus={props.focus}
      keys={props.keys}
      menu={props.menu}
      menuStyle={props.menuStyle}
      newWorkspaceTo={props.newWorkspaceTo}
      org={props.org}
      queue={props.queue}
      queueDrag={props.queueDrag}
      queueable={props.queueable}
      sections={props.sections}
      suspended={props.suspended}
      viewer={props.viewer}
    />
  ),
  variants: [
    {
      slug: 'keys',
      title: 'Narrow window',
      description:
        'The list in a narrow desktop window: Search shows the key of the palette, and menus open beside their triggers.',
      props: { keys: true, menuStyle: 'anchored' },
    },
    {
      slug: 'suspended',
      title: 'Suspended org',
      description:
        'The notice of the suspension first, no New workspace, and sections without menus.',
      props: { sections: stoppedSections, suspended: true },
    },
    {
      slug: 'failed',
      title: "List didn't load",
      description: 'The failure of the list in place of the sections.',
      props: { failed: true },
    },
  ],
})

/** The main area of the list of a suspended org, registered with Mokly. */
export const suspendedList = defineComponent({
  slug: 'suspended-list',
  title: 'Suspended list',
  description:
    'The main area of the list of a suspended org on desktop: the notice of the org in place of New workspace. A narrow window shows the list as a page, with the notice at its top. The screen draws the rail and the sidebar around it, so its own page shows the notice.',
  relatedDocs: ['docs/mockups/catalogue-operator.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['viewer', 'sections'],
    properties: {
      viewer: membershipSchema,
      focus: rowFocusSchema,
      sections: { type: 'array', items: sidebarSectionSchema },
    },
  } as const,
  props: { viewer: adminViewer, sections: stoppedSections },
  render: (props) => (
    <SuspendedList
      focus={props.focus}
      sections={props.sections}
      viewer={props.viewer}
    />
  ),
})

/** The main area of a desktop list, registered with Mokly. */
export const chooseWorkspace = defineComponent({
  slug: 'choose-workspace',
  title: 'Choose workspace',
  description:
    'The main area of a wide desktop list while no workspace is open: the user picks a workspace in the sidebar, or starts a new one.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <ChooseWorkspace />,
})

/** The main area of a new org without workspaces, registered with Mokly. */
export const newOrgEmpty = defineComponent({
  slug: 'new-org-empty',
  title: 'New org empty',
  description:
    'The main area of a new org, which has no workspaces yet: where its workspaces start, and New workspace. Its own page shows Firna after the sign-up.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org'],
    properties: { org: newOrgSchema, newWorkspaceTo: toSchema },
  } as const,
  props: { org: newOrgOf(newOrg) },
  render: (props) => (
    <NewOrgEmpty newWorkspaceTo={props.newWorkspaceTo} org={props.org} />
  ),
})

/** The page of a deleted org, registered with Mokly. */
export const deletedOrgPart = defineComponent({
  slug: 'deleted-org',
  title: 'Deleted org',
  description:
    'The page of an org that an admin deleted: its cloud computers are stopped, and its members cannot open it. An admin restores it until the date when everything is deleted. A suspended org refuses a restore, so its page offers none, and the notice of the suspension shows above the date. Its own page shows Restore.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: { suspended: { type: 'boolean' } },
  } as const,
  render: (props) => <DeletedOrg suspended={props.suspended} />,
  variants: [
    {
      slug: 'suspended',
      title: 'Suspended',
      description:
        'The notice of the suspension above the page, without Restore.',
      props: { suspended: true },
    },
  ],
})
