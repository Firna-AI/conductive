# Chat message lines

This doc holds the requirements and the decisions in force for the
message lines of the work of a turn. It belongs to
[Chat Markdown](chat-markdown.md), which defines an agent message and
holds the other Markdown of agent messages. Chat Markdown also says which
code blocks of a message line have a Copy code button. The terms are
those of the [architecture doc](../architecture.md#terms). A Markdown
parser decision, such as Markdown parser decision 14 B, is a decision of
the change that reads Markdown with one parser, as Chat Markdown says. The
[mockup catalogue](../mockups/catalogue.md) draws message lines in the
open work of a turn at `app/chat/work`. It draws their tables at
`app/chat/work/table`, their lists at `app/chat/lists/work`, and their
headings at `app/chat/headings/work`. It draws their quotes, rules,
marks, and line breaks at `app/chat/formatting/work`, and their task
boxes at `app/chat/lists/tasks-work`.

## In the work of a turn

- An open work fold shows each agent message as one message line, as
  [The work of a turn](chat-and-events.md#the-work-of-a-turn) says.
- A closed message line stays one line. It shows each table as its cells
  in row order, from the header row, with a middle dot, `·`, between two
  cells.
- An open message line keeps the text before the first table of the agent
  message. When a list or a quote holds that table, the line keeps the
  text before that list or quote. The table, or the block that holds it,
  and all that follows show under the line, with their formatting.
- An agent message without a table opens to its full text in its line.
- The line stays in place when it opens or closes.
- Reason: the steps of the work stay close together, also when a message
  holds a table. A table needs the width of the chat to read, so it shows
  under the line.
- In a message line, each heading shows as text of the line, in the
  heading weight. A screen reader reads it as text too.
- A closed message line shows the text of a heading in the line.
- An open message line shows each heading on its own line, in the size of
  the text of the line. Under the open line, a heading after the first
  table shows as a heading of its level, in the same look.
- Reason: the closed line stays one line, and the weight shows where a
  heading ends, so the words after it read as new text. The work stays
  quieter than the answer. The line is a button that opens and closes,
  and a screen reader does not list a heading inside a button.
- Emphasis, strikethrough, links, and chips show in a message line, closed
  and open.
- A closed message line shows the text of a quote in the line, in the
  colour of a quote and without its line. It shows each rule as a middle
  dot, `·`, and each line break as a space.
- An open message line shows each quote as a block, each rule as a line,
  and each line break as a new line. Under the open line, a quote or a
  rule after the first table shows as in an answer.
- Reason: the closed line stays one line, as for a table. The colour shows
  where a quote ends, so the words after it read as new text.
- A closed message line shows the Markdown image of a picture file of the
  workspace as its link. An open message line shows its picture, as
  [Pictures in answers](file-mentions-answers.md#pictures-in-answers)
  says.
- A closed message line shows each task box as a fixed check box in the
  line, before the words of its task (Markdown parser decision 14 B,
  18 November 2026). An open message line shows each task box as an
  answer does, as [Lists](chat-markdown.md#lists) says.
- A press on a box opens or closes its line, as a press on the words of
  the line does. The box does not change.
- A screen reader reads whether each task of a line is done.
- Reason: the closed line stays one line, and it keeps the state of each
  task in view. The line is a button, so a press on a box acts on the
  line.
