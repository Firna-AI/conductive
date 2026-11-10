import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

export const macWaitlist = defineScreen({
  title: 'Waitlist',
  description:
    'The waitlist of app/sign-in/waitlist in a window of the Mac app, for Sam, who has no app access yet. The page has no top bar of its own, so its header is the top bar of the window: the red, yellow, and green window buttons sit at its left, and a smaller lockup follows them. A phone view shows the same screen, smaller, because the app is for a Mac only.',
  rationale:
    'The Mac app shows the pages of the web app in its window (decision 62). After the sign-in in the browser, a person who waits sees the waitlist there. The window has no title bar, and the window buttons sit inset in the top bar of the app. So the header is as high as the other top bars, it moves the window, and it keeps the space of the window buttons free.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'waitlist',
    command: 'none',
    change: 'none',
    palette: 'closed',
    keyChange: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'full-screen',
      title: 'Full screen',
      description:
        'The waitlist in full screen. macOS hides the window buttons, so the header gives their space back, and the lockup moves to the left edge.',
      props: { window: 'full-screen' },
    },
  ],
})
