import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

/** The decision that brings the refreshes to the tab. */
const cleanRefresh =
  'The user chose option G of image job decision 12 on 10 November 2026: every refresh, after a push and each day, is a clean build. It starts from the software image, clones each repository of the newest good build at its newest commit, and runs the install script of that build. So the tab shows each refresh with the builds, with its log and its result.'

export const refreshes = defineScreen({
  title: 'Refreshes',
  description:
    'A push to a default branch started a refresh 2 hours ago, and it succeeded, so new workspaces start from it. The head of the card says "Last refresh". The history lists the builds and the refreshes, newest first. Each row names its job: Build, Refresh after a push, or Daily refresh.',
  rationale: `${cleanRefresh} A refresh still runs the install script of the newest good build, so a saved change of the script waits for Build computer, and the notice of a changed script stays after a refresh. The kind of each row says what started a refresh, so an admin does not look for a build that nobody started. The limit of one refresh after a push in 30 minutes stays.`,
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', job: 'push-refresh' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'running',
      title: 'Refresh after a push runs',
      description:
        'A push started a refresh. The head says "Refreshing after a push" with its time, and Build computer is off while the refresh runs. Its log streams in the card: the clones at the newest commits, then the install script. The note under the log says that workspaces start from the build of 8 hours ago until this one finishes, and that each refresh has a 60-minute limit.',
      rationale: `${cleanRefresh} One job runs at a time in each org, so Build computer waits for the refresh, as it waits for a build.`,
      props: { build: 'building' },
    },
    {
      slug: 'daily',
      title: 'Daily refresh runs',
      description:
        'The daily refresh runs. The head says "Running the daily refresh" with its time. The log and the note are those of a refresh after a push.',
      rationale: `${cleanRefresh} The head names what started the job, so the two kinds of refresh read apart while they run.`,
      props: { job: 'daily-refresh', build: 'building' },
    },
    {
      slug: 'failed',
      title: 'Refresh failed',
      description:
        'A refresh after a push failed: a new commit of acme/billing-service changed its manifest without its lockfile, so the install script stopped. The head says "Last refresh" with "Failed after 3m 02s" and Try again. The card shows the message that the app saved, the end of the log, and that workspaces still start from the build of 8 hours ago. The closed history lists the failed refresh as "Refresh after a push", and the Settings link in the sidebar shows a dot.',
      rationale: `${cleanRefresh} A failed refresh keeps the last good image, as a failed build does. Try again builds the current settings, as it does after a failed build. The app saves the message of a failed build for a refresh too, because each refresh is a clean build.`,
      props: { build: 'failed' },
    },
  ],
})
