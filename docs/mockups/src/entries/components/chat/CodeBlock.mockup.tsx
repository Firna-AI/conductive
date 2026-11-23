import { defineComponent } from '@mokly/mokly'
import { CodeBlock } from '../../../components/chat/CodeBlock'

/**
 * A code block of an answer, registered with Mokly. Its Copy code button
 * shows only on a touch screen, which its own pages do not draw.
 */
export const codeBlock = defineComponent({
  slug: 'code-block',
  title: 'Code block',
  description:
    'A code block of an answer of an agent, with its text exactly as the agent wrote it. A path in it stays code. On a phone, a Copy code button in its top corner copies the text. With a mouse the button shows while the pointer is on the block, which a view does not draw. Its own page shows the command of a screenshot.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: { text: { type: 'string' } },
  } as const,
  props: {
    text: 'npx playwright screenshot --device="iPhone 13" http://localhost:3000/checkout .context/shots/after.png',
  },
  render: (props) => <CodeBlock text={props.text} />,
})
