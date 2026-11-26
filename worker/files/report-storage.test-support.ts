import { REPORT_KEY } from './report-storage'

export async function storedReportPartKeys(
  storage: Pick<DurableObjectStorage, 'list'>,
): Promise<string[]> {
  const records = await storage.list({ prefix: `${REPORT_KEY}:` })
  return [...records.keys()].sort()
}
