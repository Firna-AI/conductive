# The GitHub App

This page is part of [Deployment inputs](../deployment.md). It gives the
settings of the GitHub App on GitHub.

Set these values on GitHub, in the settings of the GitHub App. Replace
`<APP_ORIGIN>` and `<MACHINE_ORIGIN>` with the values of the variables
in [Public variables](../deployment.md#public-variables).

| Setting | Value |
| --- | --- |
| Callback URL | `<APP_ORIGIN>/api/auth/github/callback`. Add one for each app origin that signs in, such as `http://127.0.0.1:5173/api/auth/github/callback` for `npm run dev`. |
| Request user authorization (OAuth) during installation | Off. When it is on, GitHub turns off the Setup URL and sends each install to the sign-in callback, which refuses it. |
| Setup URL | `<APP_ORIGIN>/github/setup`, such as `https://app.conductive.build/github/setup`. GitHub sends the user there after an install. |
| Redirect on update | On, so that a change of an install, such as a new repository, returns to the app too. |
| Webhook URL | `<MACHINE_ORIGIN>/v1/github/webhooks`, as [The GitHub App](../protocol/github-banner.md#the-github-app) says. |
| Webhook secret | The value of `GITHUB_WEBHOOK_SECRET`. |

- Subscribe to the webhook events that the
  [GitHub banner backend](../../worker/github/README.md#server-integration)
  lists.
- A GitHub App has only one Setup URL. So an install from `npm run dev`
  returns to the deployed app, not to the local app.
