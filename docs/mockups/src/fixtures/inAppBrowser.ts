/**
 * The hosts that the in-app browser of the phone apps shows. Previews live
 * on the preview domain, `conductive.page`, as the deployment sets it.
 * `src/shared/brand.ts` holds no preview domain.
 */

/** The host of the open preview: each preview has its own random host. */
export const previewHost = 'k7q2m9fz.conductive.page'

/** The fixed host of the authorizer, which shows while a preview opens. */
export const authorizerHost = 'authorize.conductive.page'

/**
 * The host of the desktop stream. It stands for an address of the app on
 * the preview domain: no screen names the provider of the cloud computer,
 * whose address the stream has today.
 */
export const desktopHost = 'r4t8w2nb.conductive.page'
