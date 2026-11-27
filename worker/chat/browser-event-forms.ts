const FORMS = ['changes.changed'] as const

export type BrowserEventForm = (typeof FORMS)[number]

export interface BrowserEventsCursor {
  after: number
  forms: readonly BrowserEventForm[]
}

export function readBrowserEventForms(
  value: unknown,
): readonly BrowserEventForm[] {
  return Array.isArray(value)
    ? FORMS.filter((form) => value.includes(form))
    : []
}
