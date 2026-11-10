export const PREVIEW_INGRESS_PATH = '/run/conductive-preview/ingress.json'

export interface PreviewIngressIdentity {
  sandboxId: string
  domain: string
  aliases: Record<string, number>
}
