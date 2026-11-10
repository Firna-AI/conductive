declare const __CONDUCTIVE_APP_VERSION__: string

export const APP_VERSION =
  typeof __CONDUCTIVE_APP_VERSION__ === 'undefined'
    ? 'development'
    : __CONDUCTIVE_APP_VERSION__
