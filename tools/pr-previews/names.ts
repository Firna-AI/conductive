export interface PreviewNames {
  number: number
  zone: string
  workerName: string
  databaseName: string
  marketingHost: string
  appHost: string
  machineHost: string
  marketingOrigin: string
  appOrigin: string
  machineOrigin: string
}

export function previewNames(number: number, zone: string): PreviewNames {
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error('Pull request number must be a positive safe integer.')
  const labels = zone.split('.')
  if (
    zone.length > 253 ||
    /[^a-z0-9.-]/.test(zone) ||
    labels.length < 2 ||
    !labels.every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  )
    throw new Error(
      'PREVIEW_ZONE must be a lower-case DNS name with at least one dot.',
    )
  const workerName = `conductive-pr-${number}`
  const marketingHost = `pr-${number}.${zone}`
  const appHost = `pr-${number}-app.${zone}`
  const machineHost = `pr-${number}-api.${zone}`
  return {
    number,
    zone,
    workerName,
    databaseName: workerName,
    marketingHost,
    appHost,
    machineHost,
    marketingOrigin: `https://${marketingHost}`,
    appOrigin: `https://${appHost}`,
    machineOrigin: `https://${machineHost}`,
  }
}

export function previewNumber(
  value: unknown,
  prefix: 'pr-' | 'conductive-pr-',
): number | null {
  if (typeof value !== 'string' || !value.startsWith(prefix)) return null
  const suffix = value.slice(prefix.length)
  if (!/^[1-9]\d*$/.test(suffix)) return null
  const number = Number(suffix)
  return Number.isSafeInteger(number) ? number : null
}
