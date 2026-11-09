/**
 * The words of the notice over the composer of New workspace while the org
 * has no good image. The screen of the app and its mockup share them. Only
 * an admin builds the computer, so an admin and a member read different
 * bodies.
 */
export const firstBuildCopy = {
  running: {
    title: (elapsed: string) => `Preparing the cloud computer · ${elapsed}`,
    body: "You can send when it's ready.",
  },
  failed: {
    title: "The cloud computer didn't build",
    admin: 'Try the build again to send your message.',
    member: 'An admin can try the build again.',
  },
  none: {
    title: 'The cloud computer needs a build',
    admin: 'Build it to send your message.',
    member: 'An admin can build it.',
  },
  open: 'Open Cloud computer',
} as const
