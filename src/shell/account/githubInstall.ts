import { useHref } from '../../app/navigation'
import { githubInstallLink } from '../../shared/github-setup'
import { useApp } from '../context'
import { useMacApp } from '../mac/mac-app'

/**
 * The link that starts an install or a change of the GitHub App on the
 * current screen, such as Get started, Account, or a list of repositories.
 * In a browser, the link names the screen, so that the return from GitHub
 * opens it again. In the Mac app, it names the Mac app, so that the return
 * tells the user to go back to the Mac app.
 */
export function useGitHubInstallLink(): (installUrl: string) => string {
  const mac = useMacApp() !== null
  const screen = useHref()
  return (installUrl) =>
    githubInstallLink(
      mac ? { kind: 'mac', installUrl } : { kind: 'browser', screen },
    )
}

/** Opens the install page of the GitHub App from the current screen. */
export function useGitHubInstall(): (installUrl: string) => void {
  const { services } = useApp()
  const link = useGitHubInstallLink()
  return (installUrl) => services.leave(link(installUrl))
}
