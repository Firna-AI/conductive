import { defineComponent } from '@mokly/mokly'
import { ScriptSection } from '../../../components/settings/EnvironmentSections'
import {
  changedInstallScript,
  includedSoftware,
  installScript,
} from '../../../fixtures/computer'
import { actionButton } from '../common/actions.mockup'
import { notice } from '../common/Notice.mockup'

/**
 * A script of the org with its save action, registered with Mokly. A
 * screen supplies a notice under the field in the `notice` slot.
 */
export const scriptSection = defineComponent({
  slug: 'script-section',
  title: 'Script section',
  description:
    'A script of the org, such as the install script of its cloud computer, in a code field with Save script, which stays off until the script changes. A notice under the field can ask for a build. A member who is not an admin reads the script as text, without Save script. Its own page shows the install script of Acme.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'description', 'script'],
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      script: { type: 'string' },
      /** The script as text, without the save action. */
      readOnly: { type: 'boolean' },
    },
  } as const,
  slots: ['notice'],
  props: {
    title: 'Install software',
    description: `${includedSoftware} The install script runs only when you build the computer.`,
    script: installScript,
  },
  render: (props) => (
    <ScriptSection
      description={props.description}
      notice={props.notice}
      readOnly={props.readOnly}
      script={props.script}
      title={props.title}
    />
  ),
  variants: [
    {
      slug: 'changed',
      title: 'Changed',
      description:
        'An install script that an admin saved after the newest build started: the notice asks for a build.',
      props: { script: changedInstallScript },
      slots: {
        notice: (
          <notice.Component
            action={
              <actionButton.Component icon="hammer" tone="primary">
                Build computer
              </actionButton.Component>
            }
            body="It runs at the next build. Workspaces keep the current build until then."
            icon="hammer"
            title="The install script changed"
          />
        ),
      },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'The script as text, without Save script, for a member who is not an admin.',
      props: {
        description: `${includedSoftware} The install script runs only at a build of the computer.`,
        readOnly: true,
      },
    },
  ],
})
