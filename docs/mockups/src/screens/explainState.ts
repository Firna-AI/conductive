/**
 * The parts of the workspace state that draw Explain: the marks in the chat
 * of the first session, the explanation that Cal starts about a line of its
 * answer, and what lies open by the text or over the chat.
 * `workspaceState.ts` adds them to the state of the screen, and
 * `explainModel.ts` reads them.
 */
export const explainStateProperties = {
  /**
   * The marks in the chat of the first session: none, the explanation that
   * Cal starts about a line of the answer, explanations in each run state,
   * an explanation of Priya whose quote lies inside the quote of Cal, so
   * their marks overlap, or the explanation of Cal whose text no longer
   * matches, so its mark covers the whole answer.
   */
  explainMarks: { enum: ['none', 'asked', 'states', 'overlap', 'stale'] },
  /**
   * The explanation of Cal: its first turn works with no answer yet, writes
   * its answer, or has answered. Then a follow-up of Cal runs, or waits for
   * a member to allow its run with a secret. Its first turn can also fail,
   * stop, or end with a long answer. `closed` has the answer, and its tab is
   * closed. While the sandbox starts, the first message waits for it, and
   * while the sandbox does not run, no turn runs.
   */
  explainSession: {
    enum: [
      'working',
      'answering',
      'answered',
      'follow-up',
      'waiting',
      'failed',
      'stopped',
      'long',
      'closed',
    ],
  },
  /**
   * What lies open: a selection in the answer or in the first message of
   * Cal with Explain, the menu of the overlapping marks, or the popover of
   * the explanation of Cal. A phone shows the popover as a sheet at half
   * height, and `popover-full` drags it to full height. `popover-resized`
   * has the panel of a computer at the size that Cal chose with its
   * handles, with the focus on its height handle. A phone has no handles,
   * so its sheet stays at half height. A read-only workspace shows a
   * selection with no button.
   */
  explainOpen: {
    enum: [
      'none',
      'select',
      'select-message',
      'menu',
      'popover',
      'popover-full',
      'popover-resized',
    ],
  },
} as const

export const explainStateKeys = [
  'explainMarks',
  'explainSession',
  'explainOpen',
] as const

/** No explanation, and nothing open. */
export const explainStateDefaults = {
  explainMarks: 'none',
  explainSession: 'answered',
  explainOpen: 'none',
} as const
