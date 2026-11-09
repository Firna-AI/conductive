import { defineScreen } from '@mokly/mokly'
import { GITHUB_SETUP_PATH } from '../../../../../../../src/shared/github-setup'
import { appDomain } from '../../../../brand'
import {
  GitHubSetupScreen,
  githubSetupSchema,
} from '../../../../screens/GitHubSetupScreen'

export const signInGitHubSetup = defineScreen({
  title: 'Back from GitHub, from the Mac app',
  description:
    'The page that the browser shows after Install the GitHub App in the Mac app, on Get started or Account. The GitHub App is installed, and the page sends the user back to the Mac app, which shows the install when its window gets the focus again.',
  rationale:
    'GitHub returns each user to one address, the Setup URL of the GitHub App. An install from a browser goes back to the screen where it started, Get started or Account, so it needs no page. The Mac app opens GitHub in the browser, and that browser has no sign-in of the Mac app, so this page only sends the user back. The user chose this over a conductive:// address that opens the Mac app, because the Mac app accepts only the address of its sign-in. The page runs no script, so it has the look of the pages of the site.',
  relatedDocs: [],
  address: `${appDomain}${GITHUB_SETUP_PATH}`,
  propSchema: githubSetupSchema,
  props: { outcome: 'installed' },
  render: (props, context) => (
    <GitHubSetupScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'requested',
      title: 'Install requested',
      description:
        'The user asked an owner of a GitHub organization to approve the install. The page says that the request went out, and to go back to the Mac app after the approval.',
      props: { outcome: 'requested' },
    },
  ],
})
