import { defineComponent } from '@mokly/mokly'
import {
  CommandLine,
  CommandStatus,
  MacCommand,
} from '../../../components/chat/MacCommand'
import { safariTest } from '../../../fixtures/mac'
import { macCommandStates } from './chatKeys'
import { macCommandRequestSchema } from './chatItemSchemas'

/** The exact command, registered with Mokly. */
export const commandLine = defineComponent({
  slug: 'command-line',
  title: 'Command line',
  description:
    'The exact command that the agent asks to run on a Mac, after a muted shell prompt, in the colours of a shell. A long command wraps.',
  relatedDocs: ['docs/mockups/mac-app.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['command'],
    properties: { command: { type: 'string' } },
  } as const,
  props: { command: safariTest.command },
  render: (props) => <CommandLine command={props.command} />,
})

/**
 * The state of a command on the Mac, registered with Mokly. `id` names the
 * chat item of the command.
 */
export const commandStatus = defineComponent({
  slug: 'command-status',
  title: 'Command status',
  description:
    'The state of a command on the Mac, as a glyph and a word: Waiting for approval with a spinner, Denied, Done with its time, Mac not available, or Mac access off. Its own page shows a command that waits.',
  relatedDocs: ['docs/mockups/mac-app.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'state'],
    properties: {
      /** The ID of the chat item of the command. */
      id: { type: 'string', minLength: 1 },
      state: { enum: macCommandStates },
    },
  } as const,
  props: { id: 'safari-test', state: 'waiting' },
  render: (props) => <CommandStatus id={props.id} state={props.state} />,
  variants: [
    {
      slug: 'done',
      title: 'Done',
      description: 'The command ran.',
      props: { state: 'done' },
    },
    {
      slug: 'denied',
      title: 'Denied',
      description: 'The person denied the command in the Mac app.',
      props: { state: 'denied' },
    },
    {
      slug: 'unavailable',
      title: 'Mac not available',
      description: 'The Mac is asleep, or the Mac app is closed.',
      props: { state: 'unavailable' },
    },
    {
      slug: 'mac-access-off',
      title: 'Mac access off',
      description:
        'The workspace refused the request, because Mac access is off in its Capabilities.',
      props: { state: 'mac-access-off' },
    },
  ],
})

/**
 * A command that the agent asked to run on a Mac, at its place in the
 * chat, registered with Mokly.
 */
export const macCommand = defineComponent({
  slug: 'mac-command',
  title: 'Mac command',
  description:
    'A command that the agent asked to run on the Mac of the person who sent the turn, at its place in the chat: the Mac, the state, the command, its folder and its time limit, and the output once it ran. A denied command, a Mac that is not available, and a request that the workspace refused because Mac access is off say what happened under the command. Its own page shows a command that ran.',
  relatedDocs: ['docs/mockups/mac-app.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'request', 'state'],
    properties: {
      /** The ID of the chat item of the command. */
      id: { type: 'string', minLength: 1 },
      request: macCommandRequestSchema,
      state: { enum: macCommandStates },
    },
  } as const,
  props: { id: 'safari-test', request: safariTest, state: 'done' },
  render: (props) => (
    <MacCommand id={props.id} request={props.request} state={props.state} />
  ),
  variants: [
    {
      slug: 'denied',
      title: 'Denied',
      description: 'The person denied the command in the Mac app.',
      props: { state: 'denied' },
    },
    {
      slug: 'unavailable',
      title: 'Mac not available',
      description: 'The Mac is asleep, or the Mac app is closed.',
      props: { state: 'unavailable' },
    },
    {
      slug: 'mac-access-off',
      title: 'Mac access off',
      description:
        'A member turned Mac access off in the Capabilities of the workspace, so the workspace refused the request at once, and the line under the command says so.',
      props: { state: 'mac-access-off' },
    },
  ],
})
