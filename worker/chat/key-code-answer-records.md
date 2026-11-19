# Chat backend key code: answer records

This page is part of the [chat backend](README.md), beside
[Chat backend key code](key-code.md). It names the entry points of the
answer records. An answer record keeps the shown ends of one answer that can
still start a secret. Each path is relative to `worker/chat/`, the folder of
this page. [Answer text secrets](../../docs/protocol/answer-text-secrets.md)
gives the requirements.

- `output-answer-records.ts` and `output-answer-key.ts`: `AnswerOutputRecords`
  keeps each answer record in a stream record that `answerOutputStream`
  names. A runner stream can have the same ID. So the reads keep the held
  text of that stream and the answer ends of the record apart.
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
- `saveOutputSnapshot` in `output-filter-records.ts` calls
  `markLegacyContexts` when it writes answer ends in the earlier format, also
  in a cleanup. That call changes a `symbolic` marker to `legacy`. So with
  the control on, the next receipt runs the pass again.
