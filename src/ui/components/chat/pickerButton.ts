/**
 * The style of the button of each model picker, in the mockups and in the
 * app. In a narrow bar the button shrinks with its container, so that it
 * never runs under the control after it. Its text then gives way, as
 * `ModelPicker.module.css` says: the effort first, then the model. This
 * module imports nothing, so the app can reuse it.
 */
export function pickerButtonStyle(height: number) {
  return { height, minWidth: 0, flexShrink: 1, paddingHorizontal: 8 }
}
