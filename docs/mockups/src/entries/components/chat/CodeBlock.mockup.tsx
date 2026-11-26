import { defineComponent } from '@mokly/mokly'
import { CodeBlock } from '../../../components/chat/CodeBlock'
import { codeLanguage } from '../../../components/common/CodeBlockText'
import { sessionExample } from '../../../fixtures/codeBlockConversations'

/**
 * A code block of an answer, registered with Mokly. Its Copy code button
 * shows only on a touch screen, which its own pages do not draw.
 */
export const codeBlock = defineComponent({
  slug: 'code-block',
  title: 'Code block',
  description:
    'A code block of an answer of an agent, with its text exactly as the agent wrote it. With the fence label of a known language, such as rust, its lines show the colours of a file tab of that language, and no language name shows. Without a label, its text stays plain. A path in it stays code. On a phone, a Copy code button in its top corner copies the text. With a mouse the button shows while the pointer is on the block, which a view does not draw. Its own page shows the command of a screenshot, without a label, and its Rust variant shows a labelled Rust block.',
  relatedDocs: [
    'docs/mockups/design-chat.md',
    'docs/mockups/design-markdown.md',
  ],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: {
      text: { type: 'string' },
      /**
       * A file name that stands for the fence label of the block, such as
       * `example.rs` for ```rust. Its language gives the colours.
       */
      name: { type: 'string' },
    },
  } as const,
  props: {
    text: 'npx playwright screenshot --device="iPhone 13" http://localhost:3000/checkout .context/shots/after.png',
  },
  render: (props) => (
    <CodeBlock language={codeLanguage(props.name)} text={props.text} />
  ),
  variants: [
    {
      slug: 'rust',
      title: 'Rust',
      description:
        'A code block with the fence label rust: the example of a session from the guide of the places API. Its keywords, types, string, number, and comments show the colours of a Rust file tab, and the comments are in italics.',
      props: { name: 'example.rs', text: sessionExample },
    },
  ],
})
