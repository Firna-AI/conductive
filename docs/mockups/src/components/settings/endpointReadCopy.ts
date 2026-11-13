import { productName } from '../../brand'

/**
 * The words of the lines that the reads of the model list of an own
 * endpoint add under its login: the note after a Codex save that added
 * `/v1` to the typed address, the warning after a read that failed, and
 * Refresh, which reads the list again. It imports no fixture, so the app
 * can import the same words.
 */
export const endpointReadCopy = {
  addedV1: `${productName} added /v1 to the address, because the endpoint lists its models there.`,
  readFailed: `${productName} couldn't read the model list of this endpoint. Check the address and the key.`,
  refresh: 'Refresh',
  /** The spoken name of Refresh, with the name of the agent. */
  refreshLabel: (agent: string) => `Refresh the model list of ${agent}`,
} as const
