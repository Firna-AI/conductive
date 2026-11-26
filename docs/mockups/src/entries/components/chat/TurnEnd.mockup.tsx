import { defineComponent } from '@mokly/mokly'
import { TurnEnd } from '../../../components/chat/TurnEnd'
import { plainData } from '../../../defined'
import { changedFiles } from '../../../fixtures/files'
import { changedFileSchema } from '../files/fileSchemas'
import { speedCauses, turnEndReasons } from './chatKeys'

/**
 * The end of a finished turn, registered with Mokly. Its pages show a turn
 * with its files, a turn whose files the cloud computer could not read, a
 * turn that background work ended, and a fast turn at standard speed.
 */
export const turnEnd = defineComponent({
  slug: 'turn-end',
  title: 'Turn end',
  description:
    'The end of a finished turn: how long it ran, and the files that it changed. When the cloud computer could not read the changed files, plain text takes the place of the chips. A cause other than the end of the reply, such as the time limit of background work, has its line above the row. A fast turn at standard speed has its note beside the time, and its files under it. Its own page shows the turn of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['duration', 'files'],
    properties: {
      /** How long the turn ran, such as `4m 12s`. */
      duration: { type: 'string' },
      files: { type: 'array', items: changedFileSchema },
      /** The files of the turn past the 200 that the runner lists. */
      omittedFiles: { type: 'integer', minimum: 0 },
      /** The cloud computer could not read the changed files. */
      filesUnavailable: { type: 'boolean' },
      endReason: { enum: turnEndReasons },
      standardSpeed: { enum: speedCauses },
    },
  } as const,
  props: plainData({ duration: '4m 12s', files: changedFiles }),
  render: (props) => (
    <TurnEnd
      duration={props.duration}
      endReason={props.endReason}
      files={props.files}
      filesUnavailable={props.filesUnavailable}
      omittedFiles={props.omittedFiles}
      standardSpeed={props.standardSpeed}
    />
  ),
  variants: [
    {
      slug: 'files-unavailable',
      title: 'Files unavailable',
      description:
        'The cloud computer could not read the changed files, so text takes the place of the chips.',
      props: { files: [], filesUnavailable: true },
    },
    {
      slug: 'background-limit',
      title: 'Background limit',
      description:
        'The time limit of background work ended the turn, so its line sits above the row.',
      props: { endReason: 'background_work_limit' },
    },
    {
      slug: 'standard-speed',
      title: 'Standard speed',
      description:
        'A fast turn that ran at standard speed: the note stands beside the time, and the files go under it.',
      props: { standardSpeed: 'fast_limit' },
    },
  ],
})
