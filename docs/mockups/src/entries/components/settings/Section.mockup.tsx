import { defineComponent } from '@mokly/mokly'
import {
  Section,
  SectionText,
} from '../../../../../../src/ui/components/settings/Section'
import { secretNote } from '../../../../../../src/ui/components/settings/envVarCopy'
import { inviteCodeCopy } from '../../../../../../src/ui/components/settings/inviteCodeCopy'
import { inviteLimit } from '../../../fixtures/waitlist'
import { actionButton } from '../common/actions.mockup'

/**
 * A line of body text in a section, registered with Mokly. A screen
 * supplies the text in the `children` slot.
 */
export const sectionText = defineComponent({
  slug: 'section-text',
  title: 'Section text',
  description:
    'A line of body text in a settings section, such as the message of a failed build, or a muted note under a list. A status line says what a change of the section did, so a screen reader reads it out when it shows. A screen supplies the text, so its own page shows an empty line.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The quieter tone of a note or a hint. */
      muted: { type: 'boolean' },
      /** A line that says what a change did, which a screen reader reads. */
      status: { type: 'boolean' },
    },
  } as const,
  slots: ['children'],
  render: (props) => (
    <SectionText muted={props.muted} status={props.status}>
      {props.children}
    </SectionText>
  ),
  variants: [
    {
      slug: 'text',
      title: 'Text',
      description: 'A line of body text, such as the message of a build.',
      props: {},
      slots: {
        children:
          'The cloud computer image could not build. Check the log and try again.',
      },
    },
    {
      slug: 'muted',
      title: 'Muted',
      description: 'A muted note, such as the note under the env vars.',
      props: { muted: true },
      slots: { children: secretNote },
    },
  ],
})

/**
 * A titled card of settings, registered with Mokly. A screen supplies the
 * state beside the title, the content, and the actions in slots. The pages
 * use a plain state, because another part here would move its styles in
 * the screens that load this card.
 */
export const section = defineComponent({
  slug: 'section',
  title: 'Section',
  description:
    'A titled card of settings, in the account, the org settings, Get started, and the operator section: its title with an optional state beside it and an optional action at the end of the title row, such as Edit, a description, its content, and its actions at the bottom. A screen supplies the state, the action, the content, and the actions, so its own page shows the title alone.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
    },
  } as const,
  slots: ['status', 'action', 'children', 'actions'],
  props: { title: inviteCodeCopy.title },
  render: (props) => (
    <Section
      action={props.action}
      actions={props.actions}
      description={props.description}
      status={props.status}
      title={props.title}
    >
      {props.children}
    </Section>
  ),
  variants: [
    {
      slug: 'actions',
      title: 'With an action',
      description:
        'A section with its description and its action at the bottom, such as Delete org.',
      props: {
        title: 'Delete org',
        description:
          'Stops every cloud computer of Acme and hides it from its members. Everything is deleted after 7 days, unless an admin restores it.',
      },
      slots: {
        actions: (
          <actionButton.Component icon="trash-2" tone="danger">
            Delete org
          </actionButton.Component>
        ),
      },
    },
    {
      slug: 'title-action',
      title: 'With an action in the title row',
      description:
        'A section with Edit at the end of its title row, such as the chosen repositories of an org for an admin.',
      props: { title: 'Repositories' },
      slots: {
        action: (
          <actionButton.Component icon="pencil">Edit</actionButton.Component>
        ),
      },
    },
    {
      slug: 'content',
      title: 'With content and a state',
      description:
        'A section with a state beside its title and a line of content, such as an invite code whose invites are used up.',
      props: {},
      slots: {
        status: <span>{inviteCodeCopy.left(0, inviteLimit)}</span>,
        children: (
          <sectionText.Component>
            {inviteCodeCopy.usedUp(inviteLimit)}
          </sectionText.Component>
        ),
      },
    },
  ],
})
