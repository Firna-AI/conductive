interface PreviewPage {
  keys: { name: string }[]
  list_complete: boolean
  cursor?: string
}

export interface RelayEnv {
  PREVIEWS: {
    list(options?: {
      prefix?: string
      cursor?: string
      limit?: number
    }): Promise<PreviewPage>
  }
  PREVIEW_ZONE: string
  GITHUB_WEBHOOK_SECRET: string
}

export interface RelayContext {
  waitUntil(promise: Promise<unknown>): void
}

export interface RelayWarning {
  kind: 'preview_webhook_delivery_failed' | 'preview_registry_unavailable'
  preview: string | null
  status: number | null
}

export interface RelayDependencies {
  fetch(request: Request): Promise<Response>
  warn(warning: RelayWarning): void
}
