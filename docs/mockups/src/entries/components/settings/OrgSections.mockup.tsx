import { defineComponent } from '@mokly/mokly'
import {
  DeleteOrgSection,
  LeaveOrgSection,
  OrgDetailsSection,
  OrgNameFields,
  SettingsTabs,
  suspendedSettingsLinks,
  type SettingsTab,
} from '../../../components/settings/OrgSections'
import { ORG_COLORS } from '../../../../../../src/ui/design/orgColors'
import { orgs } from '../../../fixtures/orgs'
import { readOnlyCauseSchema } from './computerSchemas'

const acme = orgs.acme

/** The tabs of the org settings, as `SettingsTab` lists them. */
const settingsTabKeys = [
  'general',
  'repositories',
  'computer',
  'agents',
  'secrets',
  'members',
] as const satisfies readonly SettingsTab[]

/** A page of the catalogue. */
const pageSchema = { type: 'string', minLength: 1 } as const

/** The tabs of the org settings, registered with Mokly. */
export const settingsTabs = defineComponent({
  slug: 'settings-tabs',
  title: 'Settings tabs',
  description:
    'The parts of the org settings as tabs that link to each part: General, Repositories, Cloud computer, Agents, Secrets, and Members. Every person of the org sees the same tabs. On a phone, the tabs wrap to two lines. Its own page shows General.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['tab'],
    properties: {
      tab: { enum: settingsTabKeys },
      /** The tabs wrap to two lines, for a phone. */
      wrap: { type: 'boolean' },
      /** The page of each tab, when it is not the page of Acme. */
      links: {
        type: 'object',
        additionalProperties: false,
        required: settingsTabKeys,
        properties: {
          general: pageSchema,
          repositories: pageSchema,
          computer: pageSchema,
          agents: pageSchema,
          secrets: pageSchema,
          members: pageSchema,
        },
      },
    },
  } as const,
  props: { tab: 'general' },
  render: (props) => (
    <SettingsTabs links={props.links} tab={props.tab} wrap={props.wrap} />
  ),
  variants: [
    {
      slug: 'wrap',
      title: 'On a phone',
      description: 'The tabs on two lines, with Members shown.',
      props: { tab: 'members', wrap: true },
    },
    {
      slug: 'suspended',
      title: 'Suspended org',
      description:
        'The tabs of a suspended org, which link to its read-only pages.',
      props: { tab: 'computer', links: suspendedSettingsLinks },
    },
  ],
})

/** The name and the initials of an org, registered with Mokly. */
export const orgNameFields = defineComponent({
  slug: 'org-name-fields',
  title: 'Org name fields',
  description:
    'The fields of the name of an org and of the initials that the rail shows, in the org settings and in Create an org. Its own page shows Acme.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'initials'],
    properties: { name: { type: 'string' }, initials: { type: 'string' } },
  } as const,
  props: { name: acme.name, initials: acme.initials },
  render: (props) => (
    <OrgNameFields initials={props.initials} name={props.name} />
  ),
})

/** The Org section of the General tab, registered with Mokly. */
export const orgDetailsSection = defineComponent({
  slug: 'org-details-section',
  title: 'Org details section',
  description:
    'The name of the org and the initials that the rail shows, on the General tab of the org settings: fields with Save for an admin, or the values and the colour of the org without fields for a member who is not an admin and for everyone in a suspended org. An admin changes the colour in its own section. Its own page shows Acme for an admin.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'initials', 'color'],
    properties: {
      name: { type: 'string' },
      initials: { type: 'string' },
      /** The colour of the org, which the rail shows on its tile. */
      color: { enum: ORG_COLORS },
      readOnly: readOnlyCauseSchema,
    },
  } as const,
  props: { name: acme.name, initials: acme.initials, color: 'blue' },
  render: (props) => (
    <OrgDetailsSection
      color={props.color}
      initials={props.initials}
      name={props.name}
      readOnly={props.readOnly}
    />
  ),
  variants: [
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'The values without fields, and that only an admin can change them.',
      props: { readOnly: 'member' },
    },
    {
      slug: 'suspended',
      title: 'Suspended org',
      description:
        'The values without fields in a suspended org, whose notice says why.',
      props: { readOnly: 'suspended' },
    },
  ],
})

/** The props of a section that names its org. */
const namedOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: { name: { type: 'string' } },
} as const

/** Delete org on the General tab, registered with Mokly. */
export const deleteOrgSection = defineComponent({
  slug: 'delete-org-section',
  title: 'Delete org section',
  description:
    'Delete org on the General tab of the org settings, for an admin: what it stops and hides at once, and that everything is deleted after 7 days unless an admin restores the org.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: namedOrgSchema,
  props: { name: acme.name },
  render: (props) => <DeleteOrgSection name={props.name} />,
})

/** Leave org on the General tab of a suspended org, registered with Mokly. */
export const leaveOrgSection = defineComponent({
  slug: 'leave-org-section',
  title: 'Leave org section',
  description:
    'Leave org on the General tab of a suspended org, for each person whom the last-admin rule lets leave: the person can no longer open the org, and their workspaces stay in it.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: namedOrgSchema,
  props: { name: acme.name },
  render: (props) => <LeaveOrgSection name={props.name} />,
})
