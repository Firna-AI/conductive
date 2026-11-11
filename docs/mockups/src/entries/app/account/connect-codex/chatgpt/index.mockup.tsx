import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../../../screens/AccountScreen'

export const connectCodexChatGpt = defineScreen({
  title: 'Connect Codex with a ChatGPT plan',
  description:
    'The user chose ChatGPT plan in the switch of the Codex form. The form has no field. Its words say that Codex runs on the ChatGPT plan of the user after a sign-in. They say to turn on device code sign-in in the security settings of ChatGPT first, or to ask an admin of ChatGPT, who turns it on for a Business or Enterprise plan. They quote no label, so they stay true when OpenAI renames the setting, as the user chose on 10 November 2026. The link Open ChatGPT settings follows them, and opens chatgpt.com/settings/security in a new tab. Get a code leads to app/account/connect-codex/chatgpt/code.',
  rationale:
    'The user chose option A of decision 175 on 10 November 2026: a device code sign-in that the app runs, in place of the access token of decision 170. It works with each ChatGPT plan, also Plus and Pro, once the setting is on, so the words name the setting before the start. The user chose on 11 November 2026 to link to the setting, so the user finds it in one step, and confirmed its address. chatGptSignInCopy.ts holds the address in one place. The switch names the plan, because Codex then runs on it. The app keeps the sign-in encrypted and renews it, so the user signs in once. The sign-in has no secret field, so the form has no hint that the app tests the login.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, form: 'codex-token' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'code',
      title: 'Waiting for the ChatGPT sign-in',
      description:
        'The user pressed Get a code. The form gives the link to auth.openai.com/codex/device, where the user signs in to ChatGPT and enters the code. Then come the one-time code in large type, the warning never to share it and to enter only a code that this page shows, and that it expires in 15 minutes. A line with a spinner says that the page waits for the sign-in, and Cancel ends it. Once the user enters the code, the form closes, and the row shows Codex connected, as app/account/codex-token shows.',
      rationale:
        'OpenAI warns that device codes are a common target of phishing, so the words say never to share the code. An attacker can also send a code to enter, so the words say to enter only a code that this page shows, as the user chose on 10 November 2026. The address shows in full, so the user sees that the page is of OpenAI, and can type it on another device. A code works for 15 minutes, the time that the pinned Codex 0.167.0 waits. The page finds the sign-in by itself, so the form has no button to press after it.',
      props: { codexSignIn: 'code' },
    },
    {
      slug: 'expired',
      title: 'ChatGPT code expired',
      description:
        'The user did not enter the code within 15 minutes. The form says that the code expired, without the old code, and offers Get a new code, which leads to app/account/connect-codex/chatgpt/code with a new code.',
      rationale:
        'An expired code cannot sign in, so the form hides it, and the main action gets a new one.',
      props: { codexSignIn: 'expired' },
    },
    {
      slug: 'refused',
      title: 'ChatGPT sign-in refused',
      description:
        'OpenAI refused the first request for a code, because device code sign-in is off for the ChatGPT account of the user. The form gives the cause in red with what to do: turn device code sign-in on in the security settings of ChatGPT, or ask an admin of ChatGPT. The link Open ChatGPT settings follows the cause, as it follows the words before the start. No code showed yet, so the button says Get a code, and leads to app/account/connect-codex/chatgpt/code. Once a code showed, the button says Get a new code. A sign-in that fails for another reason shows its own cause in the same place, without the link. One such cause says that the Codex login changed while the sign-in ran, and asks for a new code.',
      rationale:
        'The cause names what failed and the one way back, so the user does not start a new sign-in that fails again. The app words the cause from the answer of OpenAI. The user chose on 11 November 2026 to say Get a code until a code showed, because no code showed that a new one replaces. A removal or a save of the Codex login during the sign-in ends it, so the sign-in does not replace the login that the user chose.',
      props: { codexSignIn: 'refused' },
    },
  ],
})
