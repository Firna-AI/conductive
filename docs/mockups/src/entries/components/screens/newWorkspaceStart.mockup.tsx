import { defineComponent } from '@mokly/mokly'
import { Start } from '../../../screens/newWorkspaceStart'
import type { PageOrg } from '../../../screens/newWorkspacePageParts'
import { defaultChoice } from '../../../fixtures/agents'
import { lastBuild } from '../../../fixtures/computer'
import { orgs } from '../../../fixtures/orgs'
import { addedRepository, repositories } from '../../../fixtures/repositories'
import { paths } from '../../../paths'
import { menuSchema, type MenuEntryData } from '../common/menuEntries'
import { orgSchema } from '../layout/railSchemas'
import { agentChoiceSchema } from '../workspaces/workspaceSchemas'

/** A chosen repository of a form, as `FormRepository`. */
const formRepositorySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'name'],
  properties: { key: { type: 'string' }, name: { type: 'string' } },
} as const

/** The org of the New workspace page and its form, as `PageOrg`. */
export const pageOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ready',
    'waiting',
    'repository',
    'org',
    'draft',
    'choice',
    'list',
  ],
  properties: {
    /** The chosen repositories that the cloud computer holds. */
    ready: { type: 'array', items: formRepositorySchema },
    /** The chosen repositories that wait for their build. */
    waiting: { type: 'array', items: formRepositorySchema },
    /** The repository of the form. */
    repository: formRepositorySchema,
    org: orgSchema,
    /** The draft of the first message. */
    draft: { type: 'string' },
    choice: agentChoiceSchema,
    /** When the build that new workspaces start from ended. */
    built: { type: 'string' },
    /** The workspace list of the org. */
    list: { type: 'string', minLength: 1 },
  },
} as const

/** A repository of a form: its full name is its key in the mockups. */
const named = (name: string) => ({ key: name, name })

const storefront = named(repositories.storefront.name)

/** The New workspace page of Acme, whose workspaces start from a build. */
const acmePage = {
  ready: Object.values(repositories).map((item) => named(item.name)),
  waiting: [],
  repository: storefront,
  org: orgs.acme,
  draft: '',
  choice: defaultChoice,
  built: lastBuild.when,
  list: paths.shell,
} satisfies PageOrg

/** The start of an empty chat on the New workspace page, registered with Mokly. */
export const newWorkspaceStart = defineComponent({
  slug: 'start',
  title: 'Start',
  description:
    'The start of the empty chat of the New workspace page, with the repository of the new workspace as a compact picker, and the branch control directly right of it when the page supplies one. The note names the build that the workspace starts from. An org without chosen repositories asks an admin to choose them first, and tells a member that an admin chooses them. While the repository of the form waits for its build, the notice over the composer says when it is ready, so the note gives way. Its own page shows the start in Acme.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['page', 'chosen', 'admin'],
    properties: {
      page: pageOrgSchema,
      /** The org has chosen repositories. */
      chosen: { type: 'boolean' },
      admin: { type: 'boolean' },
      /** The open repository menu, on a computer. */
      menu: menuSchema.properties.entries,
    },
  } as const,
  slots: ['branch'],
  props: { page: acmePage, chosen: true, admin: true },
  render: (props) => (
    <Start
      admin={props.admin}
      branch={props.branch}
      chosen={props.chosen}
      menu={props.menu}
      page={props.page}
    />
  ),
  variants: [
    {
      slug: 'menu',
      title: 'Repository menu',
      description: 'The chosen repositories below the picker.',
      props: {
        menu: acmePage.ready.map((item): MenuEntryData => ({
          kind: 'item',
          label: item.name,
          checked: item.key === storefront.key,
        })),
      },
    },
    {
      slug: 'waiting',
      title: 'Repository waits',
      description:
        'A form whose repository waits for its build: the note gives way to the notice over the composer.',
      props: {
        page: {
          ...acmePage,
          waiting: [named(addedRepository)],
          repository: named(addedRepository),
        },
      },
    },
    {
      slug: 'choose',
      title: 'No repositories',
      description: 'An org without chosen repositories, for an admin.',
      props: { chosen: false },
    },
    {
      slug: 'member',
      title: 'No repositories, member',
      description:
        'An org without chosen repositories, for a member who is not an admin.',
      props: { chosen: false, admin: false },
    },
  ],
})
