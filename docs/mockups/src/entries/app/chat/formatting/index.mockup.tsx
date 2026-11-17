import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const relatedDocs = ['docs/protocol/chat-markdown.md']

export const chatFormatting = defineScreen({
  title: 'Quotes, rules, and emphasis in replies',
  description:
    'Cal asked what Priya asked for in her review of #482. The agent quotes each of her two comments, with a rule between the two parts of its answer. A quote has a thin line at its left and muted text, and the rule is a thin line across the reply, as in the Markdown preview of a file. The word "stops" shows in italics, and the option that Priya turned down shows with a line through it. The address of her test shows on two lines, where the agent wrote a line-break tag. The bold label "Next:" keeps its weight. The variants show the work of a turn, the answer while the agent writes it, marks without a pair, and pictures.',
  rationale:
    'The user chose D of item 8 of the Markdown plan on 17 November 2026: the chat draws each Markdown part as the file preview draws it, with one shared style for quotes, rules, emphasis, and strikethrough. Before, the chat showed the > and * marks that agents write. On 16 November 2026, the user chose C of item 3, one markdown-it parser for the chat and the file preview, and with it item 1: <br>, <br/>, and <br />, in any letter case, draw a line break. Other HTML stays text, so no HTML of an agent reaches the page.',
  relatedDocs,
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'formatting' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'work',
      title: 'In the work of a turn',
      description:
        'The user opened the folded work of a finished turn, and its last message. The first three messages are closed, so each stays one line. The first line starts with the quote of Priya as its text, in the muted colour of a quote, with its italics. The second line shows its rule as a middle dot, and its line through the option that Priya turned down. The third line shows its table as text, and the line break in a cell as a space. The open message shows its quote with the line at its left, its rule as a line, and the address on two lines.',
      rationale:
        'A closed message stays one line, so the steps of the work stay close together, as for a table. A summary holds no quote and no rule element, so the line draws them as spans with the shared look of a quote and a rule. Open, they show as blocks. Closed, a quote shows as its text, a rule as a middle dot, and a line break as a space (design calls 3 and 13 of the Markdown plan).',
      props: { conversation: 'formatting-in-work', fold: 'open-message' },
    },
    {
      slug: 'writing',
      title: 'While the agent writes',
      description:
        'The agent writes the same answer. The bold label at its end has its first ** and not its closing **, so it shows as the agent typed it, with its stars, while the agent works. The next update with the closing ** shows the label in bold, as the first screen of this page does.',
      rationale:
        'The chat reads bold text as CommonMark does, so a ** without a pair shows as typed (design call 7 of the Markdown plan). Before, a ** without a pair made the rest of the text bold. Each update shows the text so far as a finished answer with the same text shows it.',
      props: { conversation: 'formatting-writing' },
    },
    {
      slug: 'as-typed',
      title: 'Marks without a pair',
      description:
        'The agent answers with marks that have no pair: a ~ before a number, a * between two spaces, and the ** and the * of a file pattern. Each shows as the agent typed it. The <kbd> tags show as text too, because a line-break tag is the only HTML that the chat draws.',
      rationale:
        'CommonMark pairs a mark only where it can open and close, so a mark between two spaces, or one with no mark to pair with, stays text. Before, the ** of the file pattern made the rest of the text bold. HTML stays text, because sandbox code is untrusted and can shape the text of an agent.',
      props: { conversation: 'marks-as-typed' },
    },
    {
      slug: 'pictures',
      title: 'Pictures in replies',
      description:
        'The agent answers with three pictures. The picture of the guide of the places API is at a web address, so it shows its alt text as a link, and a press opens the picture in a new tab. The copy of the diagram names a path that no file of the workspace has, so it shows its alt text only. The screenshot is a file of the workspace, so its link opens the file, as app/file-mentions/answers shows.',
      rationale:
        'The user chose A of item 5 of the Markdown plan on 17 November 2026: a picture at a web address shows its alt text as a link to its address, with the rules of a web link, and no picture loads. A picture that loads from its address makes the browser of each reader call a server that sandbox text chose, and the content security policy of the app blocks it.',
      relatedDocs: [...relatedDocs, 'docs/protocol/chat-links.md'],
      props: { conversation: 'web-images' },
    },
  ],
})
