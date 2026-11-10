# Check the Mac app downloads on the live site

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge tasks of the plan for the Mac app downloads, pull request #130, branch `calummoore/mac-app-downloads-site`.
- **Location:** None.
- **Reason:** the check needs the deployed site, and each push to `main` deploys it only after the pull request merges.

- **Terms:**
  - **Latest release:** the newest published release of `Firna-AI/remote-code` that is not a pre-release. Each release names its DMGs `Conductive-mac-arm64.dmg` and `Conductive-mac-x64.dmg`.
- **Background:** The home page of `conductive.build` has a Mac app section after the Phone section. It links "Download for Mac (Apple silicon)" to `https://github.com/Firna-AI/remote-code/releases/latest/download/Conductive-mac-arm64.dmg` and "Download for Mac (Intel)" to the same address with `Conductive-mac-x64.dmg`. The desktop header links Download, and the footer links Mac app, to that section. The release workflow signs, notarizes, and staples each DMG.
- **Task:** After the deploy of pull request #130, open `https://conductive.build`. Check that the home page shows the Mac app section, and that the header and footer links lead to it. Check that both download addresses return their DMG. On a Mac, check each DMG with `spctl --assess --type open --context context:primary-signature` and `xcrun stapler validate`, and open the app once.
- **Impact if no action:** A broken download or a section that does not show stays unnoticed on the public site.
- **Needs:** The deployed change, and a Mac for the signature checks.
- **Done when:** The live home page shows the section, both addresses return a DMG, and both DMGs pass the Gatekeeper and ticket checks.
