/** A plain stylesheet that a module imports for its side effect. */
declare module '*.css'

/** The class map of a CSS Module, which Mokly's bundler supplies. */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
