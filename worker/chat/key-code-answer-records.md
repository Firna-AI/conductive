# Chat backend key code: answer records

This page is part of the [chat backend](README.md), beside
[Chat backend key code](key-code.md). It names the entry points of the
answer records. An answer record keeps the shown ends of one answer that can
still start a secret. Each path is relative to `worker/chat/`, the folder of
this page. [Answer text secrets](../../docs/protocol/answer-text-secrets.md)
gives the requirements.

- `output-answer-records.ts`: `AnswerOutputRecords` keeps each answer record
  in a stream record, with the ID that `answerOutputStream` gives.
- `output-answer-key.ts`: `answerOutputStream` gives an HMAC-SHA-256 under
  the app key. Its input holds its own purpose, the workspace, the session,
  the turn, and the message of the answer. So code without the app key, such
  as sandbox code, cannot compute the ID of an answer record.
- The Worker uses that ID only to save and read the record. It puts no ID that
  `answerOutputStream` gives into a message to a runner or a browser. A
  reply to a runner and a refusal marker still repeat the stream ID that the
  runner sent.
- Code with the app key, such as a test, can still give a runner stream the
  ID of an answer record. So the reads keep the held text of that stream and
  the answer ends of the record apart.
- Outside a full pass, a receipt prepares only its stream record and the
  records of its answers. Each receipt saves only the records that change.
- A full pass reads the answer ends of every stream record and of the
  workspace record. It runs `prepareOutputState` on them, and moves each
  answer end into its answer record. It deletes the workspace record, so
  that an older Worker reads the answer records when it scans the stream
  records.
- A full pass runs in each of these cases:
  - `contextIndexFormat` in `runner-output-state.ts` finds no marker.
  - A workspace record of answer ends exists.
  - The control `CONDUCTIVE_SYMBOLIC_ANSWER_STATE` is on, and the marker is
    `legacy`.
- After the pass, `saveContextIndexFormat` saves `symbolic` when the control
  is on, and `legacy` when it is off. The pass, the records, and the marker
  commit in the transaction of the receipt.
- `saveOutputSnapshot` in `output-filter-records.ts` writes each saved
  record of the answer filter. It runs `prepareOutputState` on the complete
  record before it encrypts it. Its caller gives the active values, and a
  cleanup also gives the values from before its change. So each part of a
  saved record is prepared, also when held text and answer ends share it.
- `saveOutputSnapshot` then calls `markLegacyContexts` when the prepared
  record holds answer ends in the earlier format, also in a cleanup. That
  call changes a `symbolic` marker to `legacy`. So with the control on, the
  next receipt runs the pass again.
