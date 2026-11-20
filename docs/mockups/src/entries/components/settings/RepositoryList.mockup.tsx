import { defineComponent } from '@mokly/mokly'
import { RepositoryList } from '../../../components/settings/RepositoryList'
import { acmeRepositories, newOrg } from '../../../fixtures/repositories'

/** A repository that the GitHub App reaches, as `ReachableRepository`. */
const repositorySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'description', 'used'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    /** The org uses it, so its workspaces can start in it. */
    used: { type: 'boolean' },
  },
} as const

/** A list of repositories. */
const repositoriesSchema = { type: 'array', items: repositorySchema } as const

/** The repositories that the GitHub App reaches, registered with Mokly. */
export const repositoryList = defineComponent({
  slug: 'repository-list',
  title: 'Repository list',
  description:
    'The repositories that the shared GitHub App can reach, by name, with a search field: each with its description, and Added with Remove, or Add. A note under the list links to Manage access. When the app reaches no repository, the list asks for access. Its own page shows the repositories of Acme for an admin.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['repositories', 'search'],
    properties: {
      repositories: repositoriesSchema,
      /** The text in the search field. */
      search: { type: 'string' },
    },
  } as const,
  props: { repositories: acmeRepositories, search: '' },
  render: (props) => (
    <RepositoryList repositories={props.repositories} search={props.search} />
  ),
  variants: [
    {
      slug: 'search',
      title: 'Search',
      description:
        'A search in the form of a new org, with two repositories added.',
      props: { repositories: newOrg.repositories, search: newOrg.search },
    },
    {
      slug: 'unreachable',
      title: 'No access',
      description:
        'The GitHub App reaches no repository: the list asks for access, with Manage access.',
      props: { repositories: [] },
    },
  ],
})
