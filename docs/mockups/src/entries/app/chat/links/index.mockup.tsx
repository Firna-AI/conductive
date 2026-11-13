import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const relatedDocs = [
  'docs/protocol/chat-markdown.md',
  'docs/protocol/workspace-links.md',
  'docs/protocol/port-previews.md',
]

export const chatLinks = defineScreen({
  title: 'Links in chat text',
  description:
    'Cal asked whether #482 is ready for review, and the agent answered with the links that a reviewer needs. Each http and https address is a link, in the colour and with the underline of a link in the file preview. The address of the pull request shows as the agent wrote it. The Markdown link shows as its label, in bold as the agent wrote it, and its title gives the whole address. The address alone in code is a link inside its code box, and the name of the key stays code. A press on each of these links opens a new tab. The variants show labels that are addresses, a local address, a sent message, and links in the open work of a turn.',
  rationale:
    'The user chose D of chat link decision 1 on 10 November 2026: each http and https address of chat text is a link, a Markdown link of an answer shows as its label, and the chat and the file preview share one link part. On the same day, the user chose B of chat link decision 3: code that holds only one address shows it as a link in its code box, and other code keeps its exact text. A link to another site opens a new tab with no opener and no referrer, and the Mac app opens it in the default browser. A link to a page of the app opens in the app, as a chip does. A long link breaks to fit the line.',
  relatedDocs,
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'chat-links' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'label-address',
      title: 'Labels that are addresses',
      description:
        'The agent answered with three Markdown links from the README of the repository. The first shows as its label, “autocomplete endpoint”. The labels of the other two read as addresses: one holds ://, and one starts with www. Each of them names another address than its link. So each link shows its real address in place of its label, as a bare address does, and Cal sees where it leads before a press.',
      rationale:
        'Sandbox code can shape the text of an agent, so a label can name another address than its link. Each label is tested as it shows, without code marks, bold marks, and invisible characters. A label that then holds :// or starts with www. shows the real address. Every option of chat link decision 5 keeps this test. The title of each link gives the whole address as the URL parser writes it, so a host in another script shows its ASCII form.',
      relatedDocs,
      props: { conversation: 'chat-link-labels' },
    },
    {
      slug: 'local-address',
      title: 'Local address',
      description:
        'Cal asked whether the suggestions can be tried. The agent answered with the address of the dev server, http://localhost:3000, as Terminal 1 printed it. The address is a link, and a press opens the Preview tool of this workspace with the preview of port 3000, as app/tools/preview shows. The tool call line keeps its address as text.',
      rationale:
        'The user chose C of chat link decision 2 on 10 November 2026. A local address names a server of the cloud computer, not of the computer of the reader. So a press opens the preview of its port, with the same request and checks as a typed port. The preview opens at the first page of the server, because the path does not carry over. The hosts localhost, 127.0.0.1, [::1], and 0.0.0.0 are local. In a read-only chat, a local address stays text, because no server runs there.',
      relatedDocs,
      props: { conversation: 'chat-link-local' },
      useCasePaths: ['user-flows/open-a-local-server'],
    },
    {
      slug: 'sent',
      title: 'Sent message',
      description:
        'Cal sent a message with the bare address of an older pull request and a Markdown link to a guide. The message shows both as Cal typed them. Each address is a link, and the brackets and the label of the Markdown link stay text. The agent starts to work.',
      rationale:
        'A member typed the message, so it shows as typed: only an answer shows a Markdown link as its label. The message box keeps each address as text, because a press there places the caret.',
      relatedDocs,
      props: { conversation: 'chat-links-sent' },
    },
    {
      slug: 'work',
      title: 'Links in open work',
      description:
        'The user opened the folded work of a finished turn, and its last message. The first message is closed, and its line starts with its label link, #482. The open message holds a long bare address, which breaks to fit the line. A press on a link opens it, and the line stays open or closed.',
      rationale:
        'A message line reads the text of the agent as an answer does, so it shows the same links. A link in a line is its own target, as a chip in a line is: a press opens the link and does not open or close the line.',
      relatedDocs,
      props: {
        conversation: 'chat-links-in-work',
        fold: 'open-message',
        banner: 'checks-running',
      },
    },
  ],
})
