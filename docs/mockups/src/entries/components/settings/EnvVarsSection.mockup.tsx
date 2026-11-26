import { defineComponent } from '@mokly/mokly'
import { EnvVarsSection } from '../../../components/settings/EnvVarsSection'
import { envVars } from '../../../fixtures/computer'
import { orgs } from '../../../fixtures/orgs'
import { envVarSchema } from './computerSchemas'

/** The env vars of an org, registered with Mokly. */
export const envVarsSection = defineComponent({
  slug: 'env-vars-section',
  title: 'Env vars section',
  description:
    'The environment variables of the workspaces of an org. Values are write-only: each row shows that a value is set, and an admin replaces it. An admin switches the Secret mark of each variable, and a member reads it as a word. Add variable opens a form with the mark on. Its own page shows the variables of Acme as an admin sees them.',
  relatedDocs: ['docs/mockups/README.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org'],
    properties: {
      /** The name of the org. */
      org: { type: 'string' },
      /** The variables without controls, for a member who is not an admin. */
      readOnly: { type: 'boolean' },
      /** The open form: Add variable, or the new value of the first variable. */
      form: { enum: ['none', 'add', 'change'] },
      /** The variables of the org. */
      vars: { type: 'array', items: envVarSchema },
    },
  } as const,
  props: { org: orgs.acme.name, vars: envVars },
  render: (props) => (
    <EnvVarsSection
      form={props.form}
      org={props.org}
      readOnly={props.readOnly}
      vars={props.vars}
    />
  ),
  variants: [
    {
      slug: 'add',
      title: 'Add variable',
      description:
        'The form of a new variable under the list, with its Secret mark on.',
      props: { form: 'add' },
    },
    {
      slug: 'change',
      title: 'Change a value',
      description:
        'The field of a new value in place of the value and the actions of DATABASE_URL.',
      props: { form: 'change' },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'The names and the marks without controls, for a member who is not an admin.',
      props: { readOnly: true },
    },
    {
      slug: 'empty',
      title: 'No variables',
      description: 'A new org, which has no variables yet.',
      props: { org: orgs.firna.name, vars: [] },
    },
  ],
})
