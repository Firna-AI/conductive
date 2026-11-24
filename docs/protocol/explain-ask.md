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
  and the default login of each explanation, and its fast mode is off.
  Reason: the user asked for Ask to work as Explain does, apart from the
  question.

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
- The field empties at Send and keeps the focus. It takes input at once,
  also while the start waits. Reason: the composer clears at once in the
  same way, as [Messages](messages-and-attachments.md#messages) says.
- When the explanation starts, the quote takes its mark, and the unsent
  popover becomes the popover of the new explanation. Its header then
  shows Expand.
- Text that the member typed while the start waited goes into the draft of
  the new explanation. So the follow-up field of its popover shows that
  text.
- When the start fails, the unsent popover stays open. The question goes
  back into the field, before any text that the member typed during the
  wait. The parent chat shows the notice of a failed Explain. Reason: the
  member loses no typed text, as with a message that the Worker refuses.
- Close and Escape close the unsent popover. On a computer, a press
  outside it closes it too, as
  [Expand and Close](explain-popover.md#expand-and-close) says for each
  popover.
- A close before Send drops the question and starts nothing, so no tab
  opens. The focus then goes back to the chat of the parent session.
  Reason: nothing started, so no session holds a draft.
- A close while the start waits stops nothing, because the request has
  gone. The reply then opens the popover of the new explanation, as the
  reply of Explain does. A failed start opens the unsent popover again,
  with the question in the field. Reason: the member loses no typed text.
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
