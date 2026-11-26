import { defineComponent } from '@mokly/mokly'
import { MobileTabBar } from '../../../components/workspace/MobileTabBar'
import type { MobileTabKey } from '../../../components/workspace/tools'

/** What a phone shows, as `MobileTabKey` lists them. */
const mobileTabKeys = [
  'chat',
  'files',
  'terminal',
  'preview',
  'desktop',
] as const satisfies readonly MobileTabKey[]

/** The workspace tabs of a phone, registered with Mokly. */
export const mobileTabBar = defineComponent({
  slug: 'mobile-tab-bar',
  title: 'Mobile tab bar',
  description:
    'The workspace tabs at the bottom of a phone: the chat, the files, and each tool that the app offers, each with its icon. The tab of the current view has a stronger icon. Its own page shows the chat.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['selected'],
    properties: { selected: { enum: mobileTabKeys } },
  } as const,
  props: { selected: 'chat' },
  render: (props) => <MobileTabBar selected={props.selected} />,
  variants: [
    {
      slug: 'terminal',
      title: 'Terminal',
      description: 'The Terminal tool of the phone.',
      props: { selected: 'terminal' },
    },
  ],
})
