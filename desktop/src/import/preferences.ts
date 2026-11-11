import type { DeviceFiles } from '../device/files.js'

interface ImportPreference {
  dismissed: boolean
  consent: 'unknown' | 'allowed' | 'denied'
}
interface Dependencies {
  files: DeviceFiles
  prompt(): Promise<boolean>
  warn(): void
}

/** Consent belongs to this Mac. It never comes from a renderer reply. */
export function createImportPreferences(dependencies: Dependencies) {
  let value: ImportPreference = { dismissed: false, consent: 'unknown' }
  try {
    const saved = dependencies.files.read('conductor-import.json')
    const parsed: unknown = saved === undefined ? null : JSON.parse(saved)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'dismissed' in parsed &&
      'consent' in parsed &&
      typeof parsed.dismissed === 'boolean' &&
      (parsed.consent === 'allowed' ||
        parsed.consent === 'denied' ||
        parsed.consent === 'unknown')
    )
      value = { dismissed: parsed.dismissed, consent: parsed.consent }
  } catch {
    dependencies.warn()
  }
  let pending: Promise<boolean> | undefined
  const save = () => {
    try {
      dependencies.files.write('conductor-import.json', JSON.stringify(value))
    } catch {
      dependencies.warn()
    }
  }
  return {
    read: (): ImportPreference => ({ ...value }),
    dismiss() {
      value.dismissed = true
      save()
    },
    allow(): Promise<boolean> {
      if (value.consent === 'allowed') return Promise.resolve(true)
      if (pending) return pending
      pending = dependencies
        .prompt()
        .then((allowed) => {
          value.consent = allowed ? 'allowed' : 'denied'
          save()
          return allowed
        })
        .finally(() => {
          pending = undefined
        })
      return pending
    },
  }
}

export type ImportPreferences = ReturnType<typeof createImportPreferences>
