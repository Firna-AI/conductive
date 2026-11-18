import { defineUseCase } from '@mokly/mokly'

export const openAFileFromAnAnswer = defineUseCase({
  title: 'Open a file from an answer',
  description:
    'The agent names the files that it changed and used, and shows a screenshot of the result. The user opens the quoted lines of a file from a chip in the answer, then the screenshot from its picture.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/file-mentions/answers',
      title: 'Read the answer',
      description:
        'The answer shows each file of the workspace that it names as a file chip. The chip useAddressAutocomplete.ts:19-22 names four lines of the hook. The screenshot after the fix shows as a small picture.',
    },
    {
      screenPath: 'app/files/code/at-line',
      title: 'Open the lines',
      description:
        'A press on the chip opens the file tab in source mode. Line 19 sits in the middle of the view, and lines 19 to 22 are marked.',
    },
    {
      screenPath: 'app/files/image/from-answer',
      title: 'Open the screenshot',
      description:
        'Back in the session, a press on the picture opens after.png in the temporary tab, with the whole screenshot at the size of the tab.',
    },
  ],
})
