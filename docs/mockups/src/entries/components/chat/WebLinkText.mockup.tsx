import { defineComponent } from '@mokly/mokly'
import { codePart } from '../../../../../../src/chat/links/link-parts'
import { AnswerText } from '../../../components/chat/AnswerText'
import { MessageText, useSentParts } from '../../../components/chat/MessageText'
import { CodeText, NewTabAnchor } from '../../../components/chat/WebLinkText'
import { webLinkOf } from '../../../components/chat/workspaceLinks'
import textLinkStyles from '../../../../../../src/ui/components/common/TextLink.module.css'
import { inline, link } from '../../../fixtures/agentText'

/** The docs of the places API, which the answers of the chat link. */
const docs = 'https://docs.places.example/v1/autocomplete'

/**
 * The anchor that opens a page outside the app in a new tab, registered
 * with Mokly. A link supplies its words in the `children` slot.
 */
export const newTabAnchor = defineComponent({
  slug: 'new-tab-anchor',
  title: 'New tab anchor',
  description:
    'The anchor that opens a page outside the app in a new tab, with no opener and no referrer, so the page gets no address of the app. A link of chat text uses it. Its own page shows the anchor in the look of a link, without words.',
  relatedDocs: ['docs/mockups/design-links.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['href', 'className', 'title'],
    properties: {
      href: { type: 'string', minLength: 1 },
      /** The class of the link that the anchor opens. */
      className: { type: 'string' },
      /** The whole address, as the URL parser writes it. */
      title: { type: 'string' },
    },
  } as const,
  slots: ['children'],
  props: { href: docs, className: textLinkStyles.link, title: docs },
  render: (props) => (
    <NewTabAnchor
      className={props.className}
      href={props.href}
      title={props.title}
    >
      {props.children}
    </NewTabAnchor>
  ),
  variants: [
    {
      slug: 'words',
      title: 'Words',
      description: 'The anchor with the label of an answer.',
      props: {},
      slots: { children: 'autocomplete endpoint' },
    },
  ],
})

function SentLinkExample(props: { text: string }) {
  const parts = useSentParts(props.text, [], false)
  return <MessageText files={[]} parts={parts} />
}

/**
 * A web link of chat text, registered with Mokly. The parts of a text have
 * no key that stays the same, so the text of a message draws it with the
 * plain part.
 */
export const webLinkPart = defineComponent({
  slug: 'web-link-part',
  title: 'Web link part',
  description:
    'A link of chat text that names no workspace of the org. A bare address shows as the text has it. In an answer a Markdown link shows as its label, and its title gives the address. In a message of a member a Markdown link shows as typed, and its address is the link. A link of the app opens its page in the app, and a local address opens the port preview. Its own page shows a bare address in a sent message.',
  relatedDocs: ['docs/mockups/design-links.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['part', 'answer'],
    properties: {
      /** The link as `WebAddressLink`: its address, its source, its label. */
      part: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'href', 'source'],
        properties: {
          kind: { const: 'link' },
          href: { type: 'string', minLength: 1 },
          source: { type: 'string' },
          label: { type: 'string' },
        },
      },
      /** The link stands in an answer of the agent. */
      answer: { type: 'boolean' },
    },
  } as const,
  props: { part: { kind: 'link', href: docs, source: docs }, answer: false },
  render: ({ answer, part }) =>
    answer && part.label !== undefined ? (
      <AnswerText text={inline(link(part.href, part.label))} />
    ) : (
      <SentLinkExample text={part.source} />
    ),
  variants: [
    {
      slug: 'answer-label',
      title: 'Label in an answer',
      description: 'A Markdown link in an answer shows as its label.',
      props: {
        part: {
          kind: 'link',
          href: docs,
          source: `[autocomplete endpoint](${docs})`,
          label: 'autocomplete endpoint',
        },
        answer: true,
      },
    },
    {
      slug: 'typed',
      title: 'Typed link',
      description:
        'A Markdown link in a message of a member shows as typed, and its address is the link.',
      props: {
        part: {
          kind: 'link',
          href: docs,
          source: `[autocomplete endpoint](${docs})`,
          label: 'autocomplete endpoint',
        },
      },
    },
    {
      slug: 'local',
      title: 'Local address',
      description:
        'The address of the dev server opens the port preview of its port.',
      props: {
        part: {
          kind: 'link',
          href: 'http://localhost:3000/',
          source: 'http://localhost:3000',
        },
      },
    },
  ],
})

/**
 * Inline code in its code box, registered with Mokly. The parts of a text
 * have no key that stays the same, so the text of a message draws it with
 * the plain part.
 */
export const codeText = defineComponent({
  slug: 'code-text',
  title: 'Code text',
  description:
    'Inline code in its code box. When its text is one web address that is a link, the address is a link inside the box. Its own page shows a command.',
  relatedDocs: ['docs/mockups/design-links.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: {
      text: { type: 'string' },
    },
  } as const,
  props: { text: 'npm test -- checkout' },
  render: (props) => <CodeText part={codePart(props.text, webLinkOf)} />,
  variants: [
    {
      slug: 'link',
      title: 'Address',
      description: 'Code that holds only an address shows it as a link.',
      props: { text: docs },
    },
  ],
})
