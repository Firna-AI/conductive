import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../../screens/AccountScreen'

export const accountCodexToken = defineScreen({
  title: 'Codex on a ChatGPT plan',
  description:
    'Codex is connected with a sign-in to the ChatGPT plan of the user, so its row says ChatGPT plan, and Claude keeps Subscription token. The switch under the Codex login starts off, as the switch of the Claude subscription token does. So a message of another member in a session of the user starts a new session on the login of that member. Under the switch, a note says that only the user may use a ChatGPT plan, under the terms of OpenAI. The sign-in of app/account/connect-codex/chatgpt/code leads here once the user enters the code.',
  rationale:
    'The user chose option A of decision 175 on 10 November 2026: Codex connects with a device code sign-in to the ChatGPT plan of the member. A new ChatGPT sign-in is not shared, because the terms of OpenAI forbid making an account available to anyone else, and one typed default for each agent and kind sets it, from decision 171. The owner can still turn the switch on, as decision 116 allows for each login, so the note names the terms, as the user chose on 10 November 2026. The app keeps the sign-in encrypted and renews it, so the row shows no expiry date.',
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
        'OpenAI did not renew the ChatGPT sign-in, so the app can no longer use it. The Codex row says Signed out in place of Connected, and keeps ChatGPT plan and Remove. Under the row comes the cause from the field unusableCause of the login status, then Sign in again, which opens the ChatGPT sign-in form of app/account/connect-codex/chatgpt. The share switch keeps its value.',
      rationale:
        'The app renews the sign-in alone, and a refused renewal makes the login not usable, with a cause. The row says so at once, so that the user does not learn it from a failed turn. Sign in again is the way back, and Remove stays for another login. The state has an icon and a word, so it never depends on colour alone.',
      props: { codexUse: 'not-usable' },
    },
  ],
})
