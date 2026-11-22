import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const computerBuild = defineScreen({
  title: 'Image build',
  description:
    'The page of build-03 during its first build, after its first connection. Its state says Building with the time of the build. The build card shows the live log: the base image of the app with its signature, the clones of the repositories of Acme, and the install script. Under the log, a line says that workspaces start from this build when it finishes, and gives the 60-minute limit of a build.',
  rationale:
    'Each own computer builds its own image of the org from the signed base image that the app publishes with each deploy, and refreshes it, as a cloud account does. Until its first build succeeds, New workspace keeps the computer in its menu, off, with the note of when it is ready.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: {
    ...acmeSettings,
    tab: 'own-computers',
    computer: 'build-03',
    build: 'building',
  },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'First build failed',
      description:
        'The first build of build-03 failed: its state says Build failed, and the build card shows the saved message, that build-03 ran out of disk space while it saved the image, above the end of its log, with Try again. No workspace can start on build-03 yet.',
      rationale:
        'A failed build shows the message that the app saved for it, as on the Cloud computer tab. A full disk is a failure of the server, so the message says what to fix there.',
      props: { build: 'failed' },
    },
    {
      slug: 'rebuild-failed',
      title: 'Later build failed',
      description:
        'A later build of build-01 failed in its install script. Its state stays Connected. The build card shows the saved message and the log, with Try again, and a line says that workspaces still start from the build of 3 hours ago.',
      rationale:
        'A failed build leaves the last good build in use, as on the Cloud computer tab, so the computer keeps its state.',
      props: { computer: 'build-01', build: 'failed' },
    },
    {
      slug: 'failed-member',
      title: 'Seen by a member',
      description:
        'The failed first build of build-03 as Priya, a member who is not an admin, sees it: the saved message and the log, without Try again.',
      rationale:
        'Own computer decision 2 A: only admins change an own computer, also its builds.',
      props: { build: 'failed', viewer: 'member' },
    },
  ],
})
