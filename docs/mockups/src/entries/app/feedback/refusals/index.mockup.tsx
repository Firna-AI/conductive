import { defineScreen } from '@mokly/mokly'
import {
  feedbackDraft,
  FeedbackScreen,
  feedbackSchema,
} from '../../../../screens/FeedbackScreen'

export const feedbackRefusals = defineScreen({
  title: 'Files not added',
  description:
    'A screenshot over the limit. Cal also chose a capture of a whole page. With the pasted screenshot, the two pass 7 MB, so the dialog does not add the capture. The notice under the box names the file and the limit. The pasted screenshot stays, and Send takes the message with it.',
  rationale:
    'The screenshots of one message can be up to 7 MB in all, because the route takes a body of up to 10 MB, and base64 makes each screenshot a third larger. The dialog checks the size before the send, so the person does not wait for a send that the Worker refuses. The notice gives no size of the file, because the chips show sizes in units of 1024, and the limit counts in units of 1000, so the two numbers could disagree.',
  relatedDocs: [],
  propSchema: feedbackSchema,
  props: { ...feedbackDraft, refusal: 'too-large' },
  render: (props, context) => (
    <FeedbackScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'other-type',
      title: 'Other file type',
      description:
        'Cal also chose a photo in the HEIC format. It is not a PNG, JPEG, GIF, or WebP image, so the dialog does not add it. The notice names the file and the four types. The pasted screenshot stays.',
      rationale:
        'The dialog and the Worker run the same check of the first bytes of each file, as decision 274 chose. So a renamed file of another type fails at once, also when its name ends in .png. The Worker names each screenshot and gives its type itself.',
      props: { refusal: 'other-type' },
    },
  ],
})
