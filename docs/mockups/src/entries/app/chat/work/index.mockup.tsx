import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatWork = defineScreen({
  title: 'Open work of a turn',
  description:
    'The user opened the folded work of the finished turn. It lists its steps in order, one line each: each tool call as in an open run of tool calls, and each message with its first words. The user opened the second message, so its line grows to the full text. Two skill lines show where the agent loaded skills: "Used skill brainstorming" with the arguments of the skill, "high", and "Used skill testing", which has none. The line of the fold names both skills after its counts. The answer and the end of the turn stay under the work.',
  rationale:
    'The user chose B of decision 150 on 8 November 2026: when a turn ends, the work before its answer folds into one line, as in Conductor. A long message shows one line until a click opens it, so the other steps stay close together. The tool calls show as call lines, not as folds inside the fold, so one click shows each call. The fold keeps its choice while the chat shows it. When it opens, its line stays in place and its list opens below it, so a phone shows the line and the first steps. The user chose B of decision 277 on 11 November 2026: a skill line keeps its place among the steps, and the line of the fold names each skill once, in the order of first use, so the skills stay in view while the fold is closed. This session runs Claude, so each skill line comes from its `Skill` tool and gives the arguments as the detail. The words "Used skill" come from A of decision 279.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'skills-in-work',
    fold: 'open-message',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'steered',
      title: 'Message during a turn',
      description:
        'While the agent worked, the user asked for a debounce. The message joined the turn and started a new part of it. When the turn ended, each part folded its own work and kept its own answer in view: the progress that the user read before the message, then the final answer.',
      rationale:
        'The runner answers a message during a turn in the same turn. So each answer stays in view beside the message that it answers, as the chat shows each result with the messages that it answers. A fold of all the work before the last answer was rejected, because it hides the first answer.',
      props: { conversation: 'steered', fold: 'closed' },
    },
    {
      slug: 'mac-command',
      title: 'Mac command and lost data',
      description:
        'The work of a finished turn holds a command that ran on the Mac of Cal and a tool update that was lost. Both folded with the work at their place, and the line of the fold counts only the tool call and the messages. The user opened the fold, so the card of the command and the lost line show among the steps.',
      rationale:
        'The user chose A of decision 151 on 9 November 2026: a Mac command card and a lost line of the turn fold with its work at their place. They add no count and no mark to the line of the fold.',
      props: { conversation: 'mac-in-work', fold: 'open' },
    },
    {
      slug: 'table',
      title: 'Tables in open work',
      description:
        'The work of a finished turn holds two messages with tables. The first message is closed: its line shows the cells of its table as text, with a dot between two cells, and an ellipsis cuts it. The user opened the second message, so its line shows its first words, and its table shows under the line, at the left edge of the text.',
      rationale:
        'A closed message stays one line, so the steps of the work stay close together, also when a message holds a table. A table needs the width of the chat to read, so the open message shows it under its line, in the look of a table in a reply. A table wider than the chat scrolls sideways inside the message.',
      relatedDocs: ['docs/protocol/chat-markdown.md'],
      props: { conversation: 'tables-in-work', fold: 'open-message' },
    },
    {
      slug: 'five-skills',
      title: 'Five skills in a Codex session',
      description:
        'A Codex session finished a turn that loaded five skills, and the user opened its fold. Codex reads the `SKILL.md` file of a skill with a command, so each skill line gives that command as its detail. One command loaded two skills: "Used skills plans, product-ui". The line of the fold names each skill once, in the order of first use: "7 tool calls, 1 message · Skills: brainstorming, plans, product-ui, testing, release-notes". On a phone, the line wraps between two names, the chevron stays beside its first line, and the icons follow the last name. The model picker shows the model of the session, GPT-6.1 Sol.',
      rationale:
        'The user chose B of decision 278 on 11 November 2026: a Codex command that reads the `SKILL.md` file of a listed skill shows as a skill line, as decision 277 gives it. A read of another file stays a plain command. The skill names and the command form one text, and an ellipsis cuts the command first, so a phone keeps the names in view. The line of the fold wraps instead of cutting the names, and a name never breaks at its hyphen, because a broken name reads as two words. A line with one skill says "Used skill" and "Skill:", from A of decision 279, and a line with more says "Used skills" and "Skills:".',
      props: { conversation: 'five-skills-in-work', fold: 'open' },
    },
  ],
})
