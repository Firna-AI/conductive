/**
 * A model of the app that the model list of an own endpoint does not name:
 * its label in the picker, and the ID that the agent sends.
 */
export type UnlistedModel = { label: string; id: string }

/**
 * The last read of the model list of an own endpoint that lacks models of
 * the app: those models, and when the read ran. A read that fails keeps the
 * last list and its time.
 */
export type ModelListCheck = {
  unlisted: readonly UnlistedModel[]
  checked: string
}
