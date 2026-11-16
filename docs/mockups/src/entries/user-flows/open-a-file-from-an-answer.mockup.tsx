import { defineUseCase } from '@mokly/mokly'

export const openAFileFromAnAnswer = defineUseCase({
  title: 'Open a file from an answer',
  description:
    'The agent names the files that it changed and used. The user opens the quoted lines of a file from a chip in the answer.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/file-mentions/answers',
      title: 'Read the answer',
      description:
        'The answer shows each file of the workspace that it names as a file chip. The chip useAddressAutocomplete.ts:19-22 names four lines of the hook.',
    },
    {
      screenPath: 'app/files/code/at-line',
      title: 'Open the lines',
      description:
        'A press on the chip opens the file tab in source mode. Line 19 sits in the middle of the view, and lines 19 to 22 are marked.',
    },
  ],
})
