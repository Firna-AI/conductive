// The helpers of the tests that read the header of the workspace screen.
// This file imports no screen, so a test that mounts only a part of the
// screen does not load the whole app.

/**
 * Which of Starting and Stopped the header of the open workspace shows as
 * its state, so that a check names the one that shows and the one that
 * does not.
 */
export function headerStates(root: ParentNode): string[] {
  const text = root.querySelector('header')?.textContent ?? ''
  return ['Starting', 'Stopped'].filter((state) => text.includes(state))
}
