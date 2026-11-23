import { favouriteListKeys } from '../fixtures/favourites'
import { composerStates } from './chatStates'

/**
 * The parts of the workspace state that draw the composer of the open
 * session: its state, the login that a message runs on, the model of the
 * next message, and the model menu of an open picker. `workspaceState.ts`
 * adds them to the state of the screen.
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
   * the workspace, the same with fast mode on, Sonnet 5.5 High, a model
   * that offers no fast mode, or the model of the workspace at Max.
   */
  modelChoice: { enum: ['workspace', 'fast', 'no-fast', 'max'] },
  /**
   * The favourites of the model menu: the saved favourites of the viewer,
   * the first four of them, as a member who keeps four, the starting
   * favourites of an account that never changed them, or none after the
   * member removed each one.
   */
  favourites: { enum: favouriteListKeys },
  /** The submenu of All models of an open model menu: closed or open. */
  allModels: { enum: ['closed', 'open'] },
} as const

export const composerStateKeys = [
  'composer',
  'login',
  'modelChoice',
  'favourites',
  'allModels',
] as const

/**
 * An empty composer, on the login of the starter, with the workspace model,
 * and the saved favourites with All models closed.
 */
export const composerStateDefaults = {
  composer: 'empty',
  login: 'starter',
  modelChoice: 'workspace',
  favourites: 'saved',
  allModels: 'closed',
} as const
