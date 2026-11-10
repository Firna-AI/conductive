import { githubInstallLink } from '../../shared/github-setup'
import { useApp } from '../context'
import { useMacApp } from '../mac/mac-app'

/**
 * Opens the install page of the GitHub App from Get started or Account.
 * The link names that screen, or the Mac app, so that GitHub returns the
 * user to the right place after the install.
 */
export function useGitHubInstall(
  screen: 'get-started' | 'account',
): (installUrl: string) => void {
  const { services } = useApp()
  const source = useMacApp() ? 'mac' : screen
  return (installUrl) => services.leave(githubInstallLink(installUrl, source))
}
