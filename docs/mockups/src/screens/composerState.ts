import { composerStates } from './chatStates'

/**
 * The parts of the workspace state that draw the composer of the open
 * session: its state, the login that a message runs on, and the model of
 * the next message. `workspaceState.ts` adds them to the state of the
 * screen.
 */
export const composerStateProperties = {
  /** The composer, as `composerStates` says. */
  composer: { enum: composerStates },
  /**
   * The login of the open session: the login of its starter, or the org
   * login of Acme (decisions 1 B, 6 A, and 7 B of the org logins plan). A
   * new session takes the default login of the viewer, here the org login.
   * With `no-starter-login`, an admin removed the org login.
   */
  login: { enum: ['starter', 'org'] },
  /**
   * The model, the effort, and the speed of the next message: those of
   * the workspace, the same with fast mode on, or Sonnet 5.5 High, a model
   * that offers no fast mode.
   */
  modelChoice: { enum: ['workspace', 'fast', 'no-fast'] },
} as const

export const composerStateKeys = ['composer', 'login', 'modelChoice'] as const

/** An empty composer, on the login of the starter, with the workspace model. */
export const composerStateDefaults = {
  composer: 'empty',
  login: 'starter',
  modelChoice: 'workspace',
} as const
