import { defineComponent } from '@mokly/mokly'
import { ComputerTab } from '../../../components/settings/ComputerTab'
import { changedNames } from '../../../fixtures/repositories'
import { orgs } from '../../../fixtures/orgs'
import {
  acmeComputer,
  buildStateSchema,
  newComputer,
  orgComputerSchema,
  readOnlyCauseSchema,
} from './computerSchemas'
import { repositoryNotice } from './RepositoryNotice.mockup'
import { skillsTrustSchema } from './skillsSchemas'

/**
 * The Cloud computer tab of the org settings, registered with Mokly. A
 * screen supplies the repository notice in the `repositoryNotice` slot,
 * while a repository change waits for a build.
 */
export const computerTab = defineComponent({
  slug: 'computer-tab',
  title: 'Computer tab',
  description:
    'The Cloud computer tab of the org settings: its intro, the builds of the cloud computer, the install script and the startup script, the env vars, and the skills repository. A member who is not an admin, and everyone in a suspended org, reads them without edit fields and actions. While a repository change waits for a build, its notice shows under the intro. Its own page shows the tab of Acme for an admin, before an admin chose a skills repository.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org', 'build', 'script', 'computer'],
    properties: {
      /** The name of the org. */
      org: { type: 'string' },
      build: buildStateSchema,
      /** The install script: as the newest build started, or changed since. */
      script: { enum: ['built', 'changed'] },
      computer: orgComputerSchema,
      readOnly: readOnlyCauseSchema,
      /** The open form of the env vars. */
      envForm: { enum: ['none', 'add', 'change'] },
      /** The text of the Skills field, when an admin changed it and has not saved. */
      skillsDraft: { type: 'string' },
      /** The trust choice, while the Skills section names a repository. */
      skillsTrust: skillsTrustSchema,
    },
  } as const,
  slots: ['repositoryNotice'],
  props: {
    org: orgs.acme.name,
    build: 'ready',
    script: 'built',
    computer: acmeComputer,
  },
  render: (props) => (
    <ComputerTab
      build={props.build}
      computer={props.computer}
      envForm={props.envForm}
      org={props.org}
      readOnly={props.readOnly}
      repositoryNotice={props.repositoryNotice}
      script={props.script}
      skillsDraft={props.skillsDraft}
      skillsTrust={props.skillsTrust}
    />
  ),
  variants: [
    {
      slug: 'script-changed',
      title: 'Install script changed',
      description:
        'An install script that an admin saved after the newest build started: the notice under the script asks for a build, and the history stays closed.',
      props: { script: 'changed' },
    },
    {
      slug: 'repositories-changed',
      title: 'Repositories changed',
      description:
        'An added repository that waits for a build: its notice under the intro, without an action, because the card of the builds has it.',
      props: {},
      slots: {
        repositoryNotice: (
          <repositoryNotice.Component
            added={changedNames('added').added}
            admin
            removed={[]}
            wait="waiting"
          />
        ),
      },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'The tab of a member who is not an admin: the builds, the scripts, and the env vars without edit fields and actions.',
      props: { readOnly: 'member' },
    },
    {
      slug: 'new-org',
      title: 'New org',
      description:
        'A new org whose first build did not start: Build computer first, empty scripts, and no env vars.',
      props: { org: orgs.firna.name, build: 'none', computer: newComputer },
    },
  ],
})
