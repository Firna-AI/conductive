import { productName } from '../../brand'

/**
 * The note under the list of env vars: what the Secret mark does, and when
 * a change applies. A cloud computer gets its variables and their marks
 * when it starts, so a running computer keeps the ones that it started
 * with. The mockups, the app shell, and the members UI share it.
 */
export const secretNote = `${productName} hides secret values in agent output and start logs. Changes apply at the next start.`
