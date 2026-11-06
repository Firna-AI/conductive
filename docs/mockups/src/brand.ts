/**
 * The name and the domain of the product, as the user chose them for
 * decision 32. Every screen reads them from here, so that one change
 * renames the product. The app lives on the `app.` subdomain.
 */
export const productName = 'Conducting'

export const productDomain = 'conducting.build'

/** The address of the app, which signs users in. */
export const appDomain = `app.${productDomain}`
