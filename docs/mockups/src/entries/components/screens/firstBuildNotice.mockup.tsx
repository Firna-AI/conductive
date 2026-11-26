import { defineComponent } from '@mokly/mokly'
import { FirstBuildNotice } from '../../../screens/firstBuildNotice'
import type { FirstBuildState } from '../../../fixtures/computer'

/** The states of a first build that the notice shows. */
const builds = [
  'running',
  'failed',
  'none',
] as const satisfies readonly Exclude<FirstBuildState, 'succeeded'>[]

/**
 * The notice of the first build of an org over the composer of New
 * workspace, registered with Mokly. Its pages show a build that runs, a
 * failed build, no build, and the notice of a member.
 */
export const firstBuildNotice = defineComponent({
  slug: 'first-build-notice',
  title: 'First build notice',
  description:
    'The notice over the composer of New workspace while the org has no good image: its first build runs, failed, or never started. Send stays off until a build succeeds. Only an admin gets the link to the Cloud computer tab, and a member reads who can act. Its own page shows the build that runs, as an admin sees it.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['build', 'admin'],
    properties: {
      build: { enum: builds },
      /** The viewer is an admin, who gets the link to the computer. */
      admin: { type: 'boolean' },
    },
  } as const,
  props: { build: 'running', admin: true },
  render: (props) => (
    <FirstBuildNotice admin={props.admin} build={props.build} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Build failed',
      description: 'The first build failed.',
      props: { build: 'failed' },
    },
    {
      slug: 'none',
      title: 'No build',
      description: 'The first build never started.',
      props: { build: 'none' },
    },
    {
      slug: 'member',
      title: 'Member',
      description:
        'A member reads who can act, without the link to the computer.',
      props: { admin: false },
    },
  ],
})
