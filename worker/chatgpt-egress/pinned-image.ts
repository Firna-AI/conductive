/** The key of the proxy image in the `images` map of the Wrangler config. */
export const PROXY_IMAGE = 'proxy'

type StartableContainer = Pick<Container, 'start'>

/**
 * Starts each container on one image. The Durable Object scheduling policy
 * needs an image at each start, and the container helper passes none.
 */
function withPinnedImage<T extends StartableContainer>(
  container: T,
  image: string,
): T {
  return new Proxy(container, {
    get(target, property) {
      if (property === 'start')
        return (options?: ContainerStartupOptions) =>
          target.start({
            entrypoint: options?.entrypoint,
            enableInternet: options?.enableInternet,
            env: options?.env,
            instance: options?.instance,
            labels: options?.labels,
            image,
          })
      const value: unknown = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

/**
 * Gives the container helper a container that starts the proxy image of
 * this Worker version. The helper keeps its container in a private field,
 * so a later helper release can move it. The check makes that a clear error.
 */
export function pinProxyImage(
  helper: object,
  state: { container?: StartableContainer & Pick<Container, 'images'> },
): void {
  const container = state.container
  const image = container?.images[PROXY_IMAGE]
  if (!container || !image)
    throw new Error('The egress Durable Object has no proxy image.')
  if (Reflect.get(helper, 'container') !== container)
    throw new Error('The container helper keeps its container elsewhere now.')
  Reflect.set(helper, 'container', withPinnedImage(container, image))
}
