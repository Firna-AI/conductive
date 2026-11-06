import type { AgentChoice, AgentModel, Effort } from '../../shared/agents'

/** The effort levels from the lowest, with the words that the picker shows. */
export const effortLabels: Readonly<Record<Effort, string>> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Max',
}

const effortOrder = Object.keys(effortLabels)

/** A length of time such as "24s", "4m 12s", or "1h 5m". */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** The time since a moment, such as "now", "5m ago", or "1d ago". */
export function formatAgo(then: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - then) / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/** A day such as "5 November". */
export function formatDay(timestamp: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(new Date(timestamp))
}

/** A file size such as "12 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function findModel(
  models: readonly AgentModel[],
  choice: Pick<AgentChoice, 'agent' | 'model'>,
): AgentModel | undefined {
  return models.find(
    (item) => item.agent === choice.agent && item.model === choice.model,
  )
}

/** The name of a model without its agent's brand, such as "Opus 5.5". */
export function modelLabel(
  models: readonly AgentModel[],
  choice: AgentChoice,
): string {
  return findModel(models, choice)?.label ?? choice.model
}

/**
 * The effort that a model keeps after a change of model: the same level when
 * the model has it, else the nearest level below, else its lowest level.
 */
export function effortFor(model: AgentModel, wanted: Effort): Effort {
  if (model.efforts.includes(wanted)) return wanted
  const rank = (effort: Effort) => effortOrder.indexOf(effort)
  const sorted = [...model.efforts].sort(
    (left, right) => rank(left) - rank(right),
  )
  return (
    sorted.filter((effort) => rank(effort) < rank(wanted)).at(-1) ??
    sorted[0] ??
    wanted
  )
}
