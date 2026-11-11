/** A PNG image, which Mokly's bundler supplies as a data URL. */
declare module '*.png' {
  const url: string
  export default url
}
