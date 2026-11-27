# Explain: Ask

This doc holds the requirements and the decisions in force for Ask. Ask
stands just after Explain by a selection of chat text. A press on Ask opens
the unsent popover, where the member writes a question, and Send starts the
explanation. It belongs to [Explain](explain.md), which gives the
selection, the explanation, and the terms. The
[mockup catalogue](../mockups/catalogue-chat-and-automations.md) draws Ask
at `app/chat/explain/ask`, with its flow at
`user-flows/ask-about-chat-text`.

## A press on Ask

- A press on Ask opens the unsent popover at once. It shows the quote and
  an empty field, and the field has the focus. Nothing starts yet.
- Send starts the explanation, and the answer shows in the same popover.
  The user chose this on 24 November 2026.
- A field by the selection that turns into the popover after Enter was
  rejected. The user rejected that shape on 20 November 2026. It can also
  cover the text, and on a phone it competes with the selection menu.
- A session that starts at once and waits for the question was left out,
  because the agent spends a turn before it gets the question. The quote
  in the main composer was left out too, because it gives no popover and
  no mark.
- An Ask is an explanation. So it has the anchor, the mark with its states,
  the default login, and the fast mode rule of each explanation, as
  [The explanation](explain.md#the-explanation) says. Reason: the user
  asked for Ask to work as Explain does, apart from the question.

## The selection of an Ask

- The quote of an Ask is the selection at the press on Ask. The focus then
  moves into the field, so the page loses its selection.
- While the unsent popover is open, the quote keeps a highlight in the
  colours of a selection. On a phone, the highlight has no handles and no
  selection menu.
- The quote takes its mark when the explanation starts. Reason: no
  explanation exists before Send, so the text must not look like a mark.

## The unsent popover

- The unsent popover has the width, the highest height, and the place of
  the popover of an explanation, as
  [The popover](explain-popover.md#the-popover) says. It stays by the
  highlighted quote, as a popover stays by its mark.
- On a phone, it is the sheet at half height. The field takes the focus,
  so the keyboard of the phone opens with the sheet. The chat scrolls the
  highlighted quote into view above the sheet. Reason: the sheet and the
  mark of Explain behave in the same way.
- The header shows the quote and Close, with no Expand. Reason: no tab
  exists before Send, so Expand would be off in every unsent popover.
- The chat of the unsent popover is empty.
- Screen readers hear the name Ask for the unsent popover. Reason: it has
  no session title before Send.
- The empty field says "Ask about this text". Reason: the quote in the
  header names the text.
- The field grows from one line to four, as
  [the follow-up field](explain-popover.md#the-follow-up-field) does. It
  takes text only, with no attach button and no model picker. Reason: the
  follow-up field has neither, and after Send, Expand gives the whole
  composer of the tab.
- An `@` in the field is text. It opens no list of files, so Enter sends
  the question, and Tab and Escape act as in a field without the list.
- Send stays off while the field holds no text. White space alone counts
  as no text.
- The field stays while the cloud computer does not run, and no bar takes
  its place. Reason: Send starts the cloud computer, as a press on Explain
  does.

## Send and close

- Send sends the written prompt of the Ask, as
  [The written prompt of an Ask](#the-written-prompt-of-an-ask) says. The
  explanation then starts, as
  [The explanation](explain.md#the-explanation) says.
- Send stays busy while the start waits. So a second press starts no
  second explanation.
- The field empties at Send and has the focus, also when the member
  pressed Send. It takes input at once, also while the start waits.
  Reason: the composer clears at once in the same way, as
  [Messages](messages-and-attachments.md#messages) says.
- The explanation has started when the chat shows its written prompt or
  gets the reply of the start, whichever comes first.
- When the explanation starts, the quote takes its mark, and the unsent
  popover becomes the popover of the new explanation. Its header then
  shows Expand.
- When the unsent popover showed at the start, the follow-up field of the
  new popover takes the focus. While the cloud computer does not run, the
  bar takes the place of that field, and the popover takes the focus. The
  field takes it when it shows, while the popover still has the focus.
  Reason: the member types on, and a later choice of the member stays.
- Text that the member typed while the start waited goes into the draft of
  the new explanation, before any text that the draft already holds. The
  files of that draft stay. So the follow-up field of its popover shows
  that text, and text that the member typed in the tab of the explanation
  stays.
- When the start fails, the unsent popover stays open. The question goes
  back into the field, before any text that the member typed during the
  wait. The parent chat shows the notice of a failed Explain. Reason: the
  member loses no typed text, as with a message that the Worker refuses.
- A start that fails with no answer or with a server error can still have
  reached the Worker, as [Messages](messages-and-attachments.md#messages)
  says for a send. When the chat later shows its written prompt, the
  explanation did start. The notice then goes, and the question leaves the
  field. The unsent popover becomes the popover of the new explanation, and
  the rest of the text of the field goes into its draft. Reason: a notice
  and a question of a start that the chat shows tell the member to start
  it a second time.
- A Send of the same question after such a failure is the same start
  again, so no second explanation starts when the first start reached the
  Worker. A start that the Worker refused is a real failure, so the next
  Send is a new start.
- A repeat of a start that names another model, effort, or fast mode than
  the first start fails as a conflict, as a repeated message does. A
  repeat that names none gets the first explanation, also after a change
  of the saved default. The user chose this on 25 November 2026.
- When a later Send of the same Ask starts the explanation, the notice of
  the earlier failure goes, also after a refusal. It goes at the reply or
  when the chat shows the start, whichever comes first. A notice of
  anything else stays.
  Reason: the notice would tell the member that the question did not go
  through.
- Close and Escape close the unsent popover. On a computer, a press
  outside it closes it too, as
  [Expand and Close](explain-popover.md#expand-and-close) says for each
  popover.
- A close before Send drops the question and starts nothing, so no tab
  opens. Reason: nothing started, so no session holds a draft.
- After Close or Escape, the focus goes to the chat of the parent session.
  A press outside moves no focus, as
  [Expand and Close](explain-popover.md#expand-and-close) says. Reason: the
  chat is the place that the protocol names, and no control of the popover
  stays.
- A close while the start waits stops nothing, because the request has
  gone. When the explanation starts, its popover opens, as the reply of
  Explain opens it. A failed start opens the unsent popover again, with
  the question in the field. Reason: the member loses no typed text.
- The popover of the new explanation opens only while the parent session
  shows. A popover or a menu that the member opened in another session
  stays. Reason: a late reply never changes what another session shows.
- A start that fails while another session shows opens the unsent popover
  again when the parent session shows. An Ask, a press on Explain, or a
  popover in another session leaves that question as it is. Reason: the
  member loses no typed text.
- Before Send, another popover that opens in its place drops the question
  in the same way, because at most one popover is open, as
  [Keys and focus](explain-popover.md#keys-and-focus) says.

## The written prompt of an Ask

- The written prompt of an Ask starts with the question. The first line of
  the question gives the title of the explanation, by the title rule of
  [Sessions](agents-and-sessions.md#sessions).
- Then it holds the session link of the parent session and the ID of the
  message, as [the written prompt](explain.md#the-written-prompt) of
  Explain does.
- Then it holds the whole quote under "The selected text", before the quote
  with the text around it. Reason: the question takes the first line, so
  no other line names the quote.
- Last, it asks the agent for the same three things as the written prompt
  of Explain.
- Reason: the title of the explanation and the tooltip of its mark then
  show the question. The user chose this on 24 November 2026.
- The same written prompt without the requests for no change of the files
  and a short answer was rejected. An answer then can be long, or change
  files, in a small popover.
- A first line `Ask about "<quote>"` was rejected, because the title and
  the tooltip of the mark then do not show the question.
- The written prompt holds the question without the white space at its
  ends.
- A start request without a question gets the written prompt of Explain.
  Reason: older app tabs keep working.
- A question of only white space starts nothing. The request fails as
  invalid input.
- The question has no length limit of its own, as a message has none.
