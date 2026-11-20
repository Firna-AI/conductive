/**
 * The catalogue paths of side questions, under `app/chat/side-questions`.
 * They stay beside the paths of the catalogue in `paths.ts`.
 */
export const sideQuestionPaths = {
  overlayRunning: 'app/chat/side-questions',
  select: 'app/chat/side-questions/select',
  prompt: 'app/chat/side-questions/select/prompt',
  marks: 'app/chat/side-questions/marks',
  asked: 'app/chat/side-questions/marks/asked',
  menu: 'app/chat/side-questions/marks/menu',
  overlay: 'app/chat/side-questions/overlay',
  overlayWaiting: 'app/chat/side-questions/overlay/waiting',
  overlayClosed: 'app/chat/side-questions/overlay/closed',
  tab: 'app/chat/side-questions/tab',
  readOnly: 'app/chat/side-questions/read-only',
  readOnlyOverlay: 'app/chat/side-questions/read-only/overlay',
} as const
