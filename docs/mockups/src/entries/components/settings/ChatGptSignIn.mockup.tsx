import { defineComponent } from '@mokly/mokly'
import { ChatGptSignIn } from '../../../components/settings/ChatGptSignIn'
import { paths } from '../../../paths'
import { signInStepSchema } from './loginSchemas'

/** The ChatGPT sign-in of Codex in the Connect form, registered with Mokly. */
export const chatGptSignIn = defineComponent({
  slug: 'chatgpt-sign-in',
  title: 'ChatGPT sign-in',
  description:
    'The ChatGPT sign-in of Codex in its Connect form, by step. Before the start, the words name the setting of ChatGPT that must be on, with its link. Get a code shows a one-time code in large type and the link to the page of OpenAI, while the page waits. An expired code offers Get a new code. A refused sign-in names the setting with its link. Cancel shows when the form can close. Its own page shows the step before the start.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['step', 'codeTo', 'cancel'],
    properties: {
      step: signInStepSchema,
      /** The screen that each button that gets a code leads to. */
      codeTo: { type: 'string', minLength: 1 },
      /** The form can close, so it shows Cancel. */
      cancel: { type: 'boolean' },
    },
  } as const,
  props: { step: 'start', codeTo: paths.connectCodexChatGptCode, cancel: true },
  render: (props) => (
    <ChatGptSignIn
      cancel={props.cancel}
      codeTo={props.codeTo}
      step={props.step}
    />
  ),
  variants: [
    {
      slug: 'code',
      title: 'Code',
      description:
        'The one-time code, the link to the page of OpenAI, the warning never to share it, and the line that says that the page waits.',
      props: { step: 'code' },
    },
    {
      slug: 'expired',
      title: 'Code expired',
      description: 'The code expired: Get a new code.',
      props: { step: 'expired' },
    },
    {
      slug: 'refused',
      title: 'Refused',
      description:
        'OpenAI refused the first request, because the setting is off: the cause with the link to the setting, and Get a code.',
      props: { step: 'refused' },
    },
  ],
})
