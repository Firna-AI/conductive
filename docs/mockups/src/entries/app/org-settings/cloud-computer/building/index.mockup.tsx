import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const building = defineScreen({
  title: 'Building',
  description:
    'A build runs after the user chose Build computer. Its log streams in the card, and workspaces keep starting from the last good build until it finishes. The note under the log says that each build has a 60-minute limit.',
  rationale:
    'The user chose option C of decision 128 on 8 November 2026: each whole build and refresh has a 60-minute limit from its start, and the app tells the user of the limit. The note keeps the limit out of the head of the card, beside the build that workspaces use. Moved here from a saved state of the Cloud computer page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  movedFrom: 'app/repository-settings/updating',
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', build: 'building' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'fallback',
      title: 'Building without a software image',
      description:
        'The software image of the current app version is not ready, such as after a deploy whose software image failed. So the build starts from the base image. After the clones, its log shows "Installing the agent and terminal software" with the output of that step, then the install script. A build from the software image has no such step, as the Building page shows.',
      rationale:
        'The user chose option E of image job decision 1 on 10 November 2026: one name covers the app\'s own software in the build log and in the start steps, so an admin does not take it for the install script of the org. "Install software" names the section of the install script, so the step names what it installs. A missing software image slows a build and never fails it.',
      props: { softwareImage: 'missing' },
    },
  ],
})
