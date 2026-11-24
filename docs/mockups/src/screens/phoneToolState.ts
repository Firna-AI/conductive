import { previewStates } from '../components/tools/PortPreview'
import { tabStates } from './chatStates'
import { workspaceStateSchema } from './workspaceState'

/** The values of a list without the values that only the web app draws. */
function without<T extends string, W extends T>(
  values: readonly T[],
  webOnly: readonly W[],
): readonly Exclude<T, W>[] {
  const left: readonly string[] = webOnly
  return values.filter((value): value is Exclude<T, W> => !left.includes(value))
}

/**
 * The state of the Preview tool of the phone apps: the state of the
 * workspace screen without the Preview states that only the web app draws.
 * Those are a preview in a frame of the tool, the frame after "+", and a
 * Preview tab of the centre row, in front or behind. The phone apps open
 * each preview in the in-app browser, so no control of the page draws a
 * preview inside the app.
 */
export const phoneToolSchema = {
  ...workspaceStateSchema,
  properties: {
    ...workspaceStateSchema.properties,
    ports: { enum: without(previewStates, ['open', 'adding']) },
    tab: { enum: without(tabStates, ['preview', 'preview-behind']) },
  },
} as const
