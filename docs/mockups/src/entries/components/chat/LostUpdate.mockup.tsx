import { defineComponent } from '@mokly/mokly'
import {
  LostUpdateBar,
  LostUpdateRow,
} from '../../../../../../src/ui/components/chat/LostUpdate'
import type { UnavailableData } from '../../../../../../src/ui/components/chat/lostCopy'

/** The data that a failed repair leaves unavailable. */
const unavailableData = [
  'all-files',
  'changes',
  'start-steps',
  'title',
  'servers',
] as const satisfies readonly UnavailableData[]

/** A failed repair, as `FailedRepair`: its data and how long ago. */
const repairSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['data'],
  properties: {
    data: { enum: unavailableData },
    /** The time since the data became unavailable, such as `4m ago`. */
    ago: { type: 'string' },
  },
} as const

/** The props of a notice of a failed repair. */
const repairProps = {
  type: 'object',
  additionalProperties: false,
  required: ['repair'],
  properties: { repair: repairSchema },
} as const

/**
 * The notice of a failed repair under the workspace header, registered
 * with Mokly. The app draws the same notice, so mockup-only parts render
 * the wrapper.
 */
export const lostUpdateBar = defineComponent({
  slug: 'lost-update-bar',
  title: 'Lost update bar',
  description:
    'The notice of a failed repair of workspace data other than a file list, such as the workspace name: a bar under the workspace header, above the tabs, with the time and Dismiss.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: repairProps,
  props: { repair: { data: 'title', ago: '2m ago' } },
  render: (props) => <LostUpdateBar repair={props.repair} />,
})

/**
 * The notice of a file list that is not the latest one, registered with
 * Mokly. The app draws the same notice, so mockup-only parts render the
 * wrapper.
 */
export const lostUpdateRow = defineComponent({
  slug: 'lost-update-row',
  title: 'Lost update row',
  description:
    'The notice of a list that is not the latest one, after a failed repair or a failed read of the files: a row under the file lists, or under the list of servers of the Preview tool. A list that the cloud computer could not read has no time. Its own page shows the Changes after a failed repair.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: repairProps,
  props: { repair: { data: 'changes', ago: '4m ago' } },
  render: (props) => <LostUpdateRow repair={props.repair} />,
  variants: [
    {
      slug: 'unread-files',
      title: 'Files not read',
      description:
        'The cloud computer could not read the files, so All files keeps its saved list.',
      props: { repair: { data: 'all-files' } },
    },
  ],
})
