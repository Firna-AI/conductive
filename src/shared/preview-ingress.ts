import config from './preview-ingress-config.json'

export const PREVIEW_INGRESS_PATH = config.path

export const E2B_PRIVATE_HEADER_NAMES: Readonly<typeof config.privateHeaders> =
  config.privateHeaders

export const E2B_PRIVATE_HEADERS: readonly string[] = Object.values(
  E2B_PRIVATE_HEADER_NAMES,
)
