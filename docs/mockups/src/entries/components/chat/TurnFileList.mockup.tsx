import { defineComponent } from '@mokly/mokly'
// The chip comes first: a screen that loads this module loads the styles
// of the diff stat of the chip before those of the list, as it did when the
// end of a turn drew the chip itself.
import { turnFileChip } from './TurnFileChip.mockup'
import { TurnFileList } from '../../../../../../src/ui/components/chat/TurnFileList'
import { changedFiles } from '../../../fixtures/files'
import { instanceKey } from '../../../instanceKey'
import { changedFileSchema } from '../files/fileSchemas'

/** Twelve changed files: more than the 8 chips that show before the rest. */
const manyFiles = Array.from({ length: 12 }, (_, index) => ({
  path: `src/app/checkout/steps/step${index + 1}.tsx`,
  change: 'added' as const,
  added: 20 + index,
  removed: 0,
}))

/**
 * The list of the files that a turn changed, registered with Mokly. The
 * app draws the same list with its own chips. A render function is not
 * data, so its adapter draws the chip of the mockups for each file.
 */
export const turnFileList = defineComponent({
  slug: 'turn-file-list',
  title: 'Turn file list',
  description:
    'The list of the files that a turn changed. It shows the first 8 chips on desktop and the first 5 on a phone, then a button that shows the rest. The files that the runner did not list follow as plain text after the last chip. Its own page shows the files of the turn of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'files', 'omittedFiles'],
    properties: {
      /** The spoken name of the list. */
      label: { type: 'string' },
      files: { type: 'array', items: changedFileSchema },
      /** The files that the runner did not list. */
      omittedFiles: { type: 'integer', minimum: 0 },
    },
  } as const,
  props: {
    label: 'Files this turn changed',
    files: changedFiles,
    omittedFiles: 0,
  },
  render: (props) => (
    <TurnFileList
      files={props.files}
      label={props.label}
      omittedFiles={props.omittedFiles}
      renderChip={(file) => (
        <turnFileChip.Component
          file={file}
          moklyInstance={`chip-${instanceKey(file.path)}`}
        />
      )}
    />
  ),
  variants: [
    {
      slug: 'show-more',
      title: 'Show more',
      description:
        'Twelve files: the first 8 chips, then the button that shows the other 4.',
      props: { files: manyFiles },
    },
    {
      slug: 'not-listed',
      title: 'Files not listed',
      description:
        'The runner listed the files up to its limit, and the rest follow as text.',
      props: { omittedFiles: 5 },
    },
  ],
})
