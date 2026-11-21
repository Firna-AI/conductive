import { defineComponent } from '@mokly/mokly'
import { ScreenshotRow } from '../../../components/feedback/ScreenshotRow'
import {
  feedbackScreenshot,
  longFeedbackScreenshots,
} from '../../../fixtures/feedback'
import { screenshotsSchema } from './feedbackSchemas'

/** The screenshots of the feedback draft, registered with Mokly. */
export const screenshotRow = defineComponent({
  slug: 'screenshot-row',
  title: 'Screenshot row',
  description:
    'The screenshots of the feedback draft, above its text, as a row of chips with their names and their sizes. The icon of a chip turns into a × that removes it under a pointer or the keyboard focus. Where no pointer hovers, a × button of touch size ends each chip. Its own page shows the screenshot that Cal pasted.',
  relatedDocs: ['docs/mockups/catalogue-palette.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['screenshots'],
    properties: { screenshots: screenshotsSchema },
  } as const,
  props: { screenshots: [feedbackScreenshot] },
  render: (props) => <ScreenshotRow screenshots={props.screenshots} />,
  variants: [
    {
      slug: 'long',
      title: 'Many screenshots',
      description:
        'The screenshots of a long report, which wrap to more lines.',
      props: { screenshots: longFeedbackScreenshots },
    },
  ],
})
