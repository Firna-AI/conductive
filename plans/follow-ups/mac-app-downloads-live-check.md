# Check the Mac app downloads on the live site

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge tasks of the plan for the Mac app downloads, pull request #130, branch `calummoore/mac-app-downloads-site`.
- **Location:** None.
- **Reason:** The remaining checks need a Mac, because `spctl`, `xcrun`, and the Mac app do not run on Linux.

- **Terms:**
  - **Latest release:** the newest published release of `Firna-AI/conductive` that is not a pre-release. Each release names its DMGs `Conductive-mac-arm64.dmg` and `Conductive-mac-x64.dmg`.
  - **Gatekeeper:** the macOS security check that assesses downloaded software before it opens.
  - **Ticket:** the notarization record from Apple that the release workflow staples to each DMG, so that macOS can check the notarization offline.
- **Background:** The home page of `conductive.build` has a Mac app section after the Phone section. It links "Download for Mac (Apple silicon)" to `https://github.com/Firna-AI/conductive/releases/latest/download/Conductive-mac-arm64.dmg` and "Download for Mac (Intel)" to the same address with `Conductive-mac-x64.dmg`. The desktop header links Download, and the footer links Mac app, to that section. The release workflow signs, notarizes, and staples each DMG.
- **Results on 2026-11-18:** A check from Linux completed the site and download steps of this task. The Mac steps did not run.
  - `https://conductive.build` returned HTTP 200. Its home page has one section with `id="mac-app"`. That section has the heading "Work from the Mac app." and comes directly after the section "Check in from your phone."
  - The header link Download and the footer link Mac app both go to `/#mac-app`. In Chromium, a click on each link showed the section, both download buttons, and the text "Runs on macOS 13 or later."
  - The download buttons use the two addresses that the background gives. Each address redirected to the same file name under `https://github.com/Firna-AI/conductive/releases/download/v0.26.0/`. Each download then ended with HTTP 200 and the file.
  - The latest release was v0.26.0, published on 2026-11-18 at 13:19:16 UTC. It is not a draft or a pre-release. Its page is `https://github.com/Firna-AI/conductive/releases/tag/v0.26.0`.
  - `Conductive-mac-arm64.dmg` has 130718348 bytes and the SHA-256 digest `3c692667bca333bb44b6ca3effd5b974bad28e3be71b7ddc5a530ac89e0e1b54`.
  - `Conductive-mac-x64.dmg` has 136283635 bytes and the SHA-256 digest `d3098ed811c9b9b821e30107028e93b2c2864fd06f0a328901467de0a6c710ab`.
  - Both sizes and both digests match the values that GitHub records for the release files. Each file has a UDIF `koly` trailer of version 4, the format of a macOS disk image.
  - The Linux tool rcodesign 0.29.0, from `indygreg/apple-platform-rs`, printed the signature of each DMG with `rcodesign print-signature-info <dmg>`. Each signature holds a ticket in slot 65538, with a length of 1955 bytes. For each DMG, rcodesign reports `signature_verifies: true` for the CMS signer and for the timestamp signer.
  - Not proven: Gatekeeper acceptance, `xcrun stapler validate`, and a first open of the app. Linux has no `spctl` or `xcrun`, and it cannot open the Mac app. A readable ticket and a valid CMS signature do not prove that macOS accepts the DMG.
- **Task:** On a Mac, do these steps. The results above do not replace any of them.
  1. Choose the release. To repeat the check of 2026-11-18, use the v0.26.0 addresses of the results above. Otherwise, use the two latest addresses, and record the version that `https://github.com/Firna-AI/conductive/releases/latest` shows.
  2. Download both DMGs in a web browser, such as Safari. A browser marks each file as a download from the internet, so that the first open runs Gatekeeper. `curl` does not add this mark.
  3. Run `shasum -a 256 <dmg>` for each DMG. For v0.26.0, compare each result with its digest above. For a newer release, record each digest.
  4. Run `spctl --assess --type open --context context:primary-signature <dmg>` for each DMG. Each run passes when it exits with status 0. `echo $?` directly after it shows the status.
  5. Run `xcrun stapler validate <dmg>` for each DMG. Each run passes when it prints "The validate action worked!".
  6. Open the DMG that matches the processor of the Mac: `arm64` for Apple silicon, or `x64` for Intel. Copy Conductive to Applications, and open it once. macOS can ask once to confirm an app from the internet. It must not block the app.
- **Impact if no action:** If macOS blocks a DMG or the app, Mac users cannot install or open Conductive, and the fault can stay unnoticed.
- **Needs:** A Mac with macOS 13 or later, and the Apple developer tools that provide `xcrun stapler`, such as Xcode. The site and the release are already live.
- **Done when:** On a Mac, both DMGs of one recorded release pass the `spctl` and `xcrun stapler validate` checks. The app from one of them opens once without a Gatekeeper block.
