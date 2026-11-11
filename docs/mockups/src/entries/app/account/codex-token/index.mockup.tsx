import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../../screens/AccountScreen'

export const accountCodexToken = defineScreen({
  title: 'Codex on a ChatGPT plan',
  description:
    'Codex is connected with a sign-in to the ChatGPT plan of the user, so its row says ChatGPT plan, and Claude keeps Subscription token. The switch under the Codex login starts off, as the switch of the Claude subscription token does. So a message of another member in a session of the user starts a new session on the login of that member. The sign-in of app/account/connect-codex/chatgpt/code, or of app/account/codex-token/sign-in-again-code, leads here once the user enters the code.',
  rationale:
    'The user chose option A of decision 175 on 10 November 2026: Codex connects with a device code sign-in to the ChatGPT plan of the member. A new ChatGPT sign-in is not shared, because the terms of OpenAI forbid making an account available to anyone else, and one typed default for each agent and kind sets it, from decision 171. The owner can still turn the switch on, as decision 116 allows for each login. The user chose on 10 November 2026 to show no note about the terms. The app keeps the sign-in encrypted and renews it, so the row shows no expiry date.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, codexLogin: 'token' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'not-usable',
      title: 'ChatGPT sign-in stopped working',
      description:
        'OpenAI refused the ChatGPT sign-in or its renewal, so the app can no longer use it. The Codex row says Signed out in place of Connected, and keeps ChatGPT plan and Remove. Under the row comes the cause from the field unusableCause of the login status, then Sign in again, which opens the ChatGPT sign-in form under the row, as app/account/codex-token/sign-in-again shows. The share switch keeps its value.',
      rationale:
        'The app renews the sign-in alone. A refused renewal, or a refusal after a renewal, makes the login not usable, with a cause. The row says so at once, so that the user does not learn it from a failed turn. Sign in again is the way back, and Remove stays for another login. The state has an icon and a word, so it never depends on colour alone.',
      props: { codexUse: 'not-usable' },
    },
    {
      slug: 'sign-in-again',
      title: 'Signing in to ChatGPT again',
      description:
        'The user pressed Sign in again on app/account/codex-token/not-usable. The Codex row keeps Signed out, ChatGPT plan, and Remove. The ChatGPT sign-in form opens under the row, in the place of the cause, with ChatGPT plan selected and its first step, as app/account/connect-codex/chatgpt shows it. The share switch keeps its value under the form. Get a code leads to app/account/codex-token/sign-in-again-code.',
      rationale:
        'The user chose on 11 November 2026 to draw the app here. The old login stays until a new sign-in replaces it, so Remove still removes it, and the share switch still sets it. The form takes the place of the cause, because the form gives the way back.',
      props: { codexUse: 'not-usable', form: 'codex-token' },
    },
    {
      slug: 'sign-in-again-code',
      title: 'Waiting for the new ChatGPT sign-in',
      description:
        'The user pressed Get a code on app/account/codex-token/sign-in-again. The code and its steps show in the form under the Codex row, as app/account/connect-codex/chatgpt/code shows them, and the row and the share switch stay. An expired code and a refused sign-in show in the same place, as the expired and refused variants of app/account/connect-codex/chatgpt show. Once the user enters the code, the form closes, and the row shows Codex connected, with the same share switch.',
      rationale:
        'The row and the share switch stay at each step, as in the app. A new sign-in of the same kind keeps the share setting of the login that it replaces, so the switch does not move.',
      props: {
        codexUse: 'not-usable',
        form: 'codex-token',
        codexSignIn: 'code',
      },
    },
  ],
})
