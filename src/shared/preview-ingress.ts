export const PREVIEW_INGRESS_PATH = '/run/conductive-preview/ingress.json'

export const E2B_PRIVATE_HEADER_NAMES = {
  trafficToken: 'e2b-traffic-access-token',
  accessToken: 'x-access-token',
  sandboxId: 'e2b-sandbox-id',
  sandboxPort: 'e2b-sandbox-port',
} as const

export const E2B_PRIVATE_HEADERS: readonly string[] = Object.values(
  E2B_PRIVATE_HEADER_NAMES,
)

export interface PreviewIngressIdentity {
  sandboxId: string
  domain: string
  aliases: Record<string, number>
}
