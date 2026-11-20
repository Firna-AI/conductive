/**
 * The parts of the workspace state that draw side questions: the marks in
 * the chat of the first session, the side session that Cal asks about its
 * answer, and what lies open by the text or over the chat.
 * `workspaceState.ts` adds them to the state of the screen, and
 * `sideQuestionModel.ts` reads them.
 */
export const sideQuestionStateProperties = {
  /**
   * The marks in the chat of the first session: none, the side question
   * that Cal asks about a line of the answer, side questions in each run
   * state, a side question of Priya whose quote lies inside the quote of
   * Cal, so their marks overlap, or the side question of Cal whose text no
   * longer matches, so its mark covers the whole answer.
   */
  sideMarks: { enum: ['none', 'asked', 'states', 'overlap', 'stale'] },
  /**
   * The side session of Cal: its turn runs, waits for a member to allow
   * its run with a secret, has ended, or its tab is closed. A closed
   * session keeps its mark and its chat. While the sandbox does not run,
   * no turn runs.
   */
  sideSession: { enum: ['running', 'waiting', 'idle', 'closed'] },
  /**
   * What lies open: a selection in the answer or in the first message of
   * Cal with Ask about this, the prompt field of the answer selection, the
   * menu of the overlapping marks, or the overlay of the side session of
   * Cal. A read-only workspace shows a selection with no button.
   */
  sideOpen: {
    enum: ['none', 'select', 'select-message', 'prompt', 'menu', 'overlay'],
  },
} as const

export const sideQuestionStateKeys = [
  'sideMarks',
  'sideSession',
  'sideOpen',
] as const

/** No side question, and nothing open. */
export const sideQuestionStateDefaults = {
  sideMarks: 'none',
  sideSession: 'running',
  sideOpen: 'none',
} as const
