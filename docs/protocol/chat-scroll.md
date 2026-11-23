# The scroll of the chat

This page holds the requirements and the decisions in force for the
scroll of a workspace chat: the row that stays in view, the button to the
bottom, the scroll after a send, and the place that each session tab
keeps. It belongs to
[Chat and events](chat-and-events.md), which states what the chat shows.
The terms are those of the [architecture doc](../architecture.md#terms).

## The scroll

- At the bottom, the chat keeps the newest message in view.
- While the user reads higher up, the row that they read keeps its place.
  A message of another member, the output of an agent, and a fold that
  closes do not move it.
- While the user reads higher up, a small round button shows above the
  right end of the composer. A press shows the bottom of the chat, with
  the newest message. The button hides at the bottom and near it, so a
  small scroll shows no button. It stays clear of Explain, which a phone
  shows above the middle of the composer.
- Reason: on a phone, a long chat takes many swipes to get back to the
  newest message. The user asked for the button on 23 November 2026.
- A message that the user sends from the chat goes to the bottom of the
  chat, also while the user reads higher up. This applies to the composer
  and to the fixed prompts of the pull request bar, such as Create PR.
- A message that the same member sends from another tab or device does
  not move this chat.
- Reason: the user who sends a message wants to see it and its answer. A
  scroll for each message of the workspace was rejected, because it takes
  the place of a reader who reads an earlier part of the chat.
- Each session tab keeps the reader's place while another tab, another
  workspace, or another page of the app shows. When the tab shows again, the
  row that the user read is at the same place. A chat that was at the bottom
  shows the bottom again, with the output that came in the meantime. When
  the read row is gone, the chat shows the bottom.
- The places stay while the browser tab keeps the workspace. A reload
  forgets them, and each chat then opens at the bottom.
- Reason: the user who looks at another tab comes back to read on. A saved
  scroll offset was rejected, because output that comes in the meantime
  moves the read row. A place that stays after a reload was rejected,
  because it needs browser storage that each sign-out must clear. The user
  chose both on 13 November 2026.
- A session tab that closes forgets its place, also when another member
  closes its session. When the session opens again, such as from the
  session history, it shows the bottom.
- Reason: a reopened tab is a new tab to the user. The user chose this on
  13 November 2026.
