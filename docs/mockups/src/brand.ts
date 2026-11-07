/**
 * The name and the domain of the product. Every screen reads them from
 * here, so that one change renames the product. The app lives on the
 * `app.` subdomain.
 */
export const productName = 'Conductive'

export const productDomain = 'conductive.build'

/** The address of the app, which signs users in. */
export const appDomain = `app.${productDomain}`
