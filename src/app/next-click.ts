/**
 * Stops the next click of the page, wherever it lands, such as the click
 * that ends a drag. A finger sends that click after it lets go, when a sheet
 * or a menu that the release opened can lie under it. So the wait lasts
 * until the click comes, or until the next press of a pointer or a key,
 * which starts an action of its own. It returns the end of the wait.
 */
export function stopNextClick(): () => void {
  const stop = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
    end()
  }
  function end() {
    window.removeEventListener('click', stop, true)
    window.removeEventListener('pointerdown', end, true)
    window.removeEventListener('keydown', end, true)
  }
  window.addEventListener('click', stop, true)
  window.addEventListener('pointerdown', end, true)
  window.addEventListener('keydown', end, true)
  return end
}
