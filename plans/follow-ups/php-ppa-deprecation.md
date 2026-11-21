# Boat base image holds the frozen PHP PPA

- **Severity:** High. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-20, from branch `calummoore/fix-apt-update-fails-after-the-php-ppa-nsja`, the fix for the failed `apt-get update` of image builds. Rewritten on 2026-11-20 on branch `calummoore/follow-up-the-base-image-holds-a-k9or`, with the facts of a read-only investigation.
- **Location:** `terminalPackagesCommand` at `worker/terminal/service.ts:18`, which runs `apt-get update` over every apt source of an image. `imagePackagesCommand` at `worker/lifecycle/image-packages.ts:15` and `packagesStep` at `worker/lifecycle/image-packages.ts:35`, which compose the apt part of each build. `BASE_IMAGE` at `src/shared/base-image.ts:12`, the base image software that members see. `image/install.md:40`, which describes the Label option. The PPA source file `/etc/apt/sources.list.d/ondrej-ubuntu-php-noble.sources` of the Boat base image, outside this repository.
- **Reason:** The package-source options have real trade-offs, and org script requirements remain unknown. B and E can change the packages that org scripts and users get.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **PPA:** a Personal Package Archive on Launchpad, here `ondrej/php`, the apt source in which Ondřej Surý published PHP for Ubuntu.
  - **Release file:** the signed index `InRelease` of an apt source, with fields such as `Origin`, `Label`, `Suite`, `Version`, `Codename`, and `Date`.
  - **Apt part:** the part of each image build that installs `ttyd`, `tmux`, and `gh` with apt, as `worker/lifecycle/image-packages.ts` composes it.
  - **Label option:** the apt option `-o Acquire::AllowReleaseInfoChange::Label=true`, which lets `apt-get update` accept a changed `Label` in a Release file.
  - **Sury archive:** the apt source `https://packages.sury.org/php/`, which the PPA's maintainer runs and now names as the home of PHP for Ubuntu.
- **Background:**
  - Images and the apt part:
    - Each org has an org image, the saved image that its workspaces start from. Boat org images and the software image derive from the Boat base image, Ubuntu 24.04. Boat owns that base image.
    - The software image is the shared Boat image with the app's own software. Each deploy run builds it from the Boat base image, and the run fails when that build fails.
    - A build runs the software step with the apt part first, then the org install script, as `worker/lifecycle/image-builds.md` says. A refresh runs no install script.
    - The apt part runs `apt-get update` over every apt source of the image, also the PPA. Then it installs only `ttyd`, `tmux`, and `gh`. It upgrades no PHP package.
    - On Boat, `gh` comes from the GitHub CLI source `https://cli.github.com/packages`, not from Ubuntu, as `plans/follow-ups/gh-package-source-claims.md` explains. On E2B, `image/e2b/install-base.sh` installs `gh` from the Ubuntu archive.
    - Each change of the apt part changes `imagePackagesVersion()` and the app software version. The next build or refresh from each older org image then runs the apt part once.
    - The E2B template starts `FROM ubuntu:24.04` in `image/e2b/Dockerfile`. It adds no PHP and no PPA. An org install script can still add the PPA to an org image.
    - `BASE_IMAGE` in `src/shared/base-image.ts` lists the base image software that members see. It names no PHP. The common software list does not promise a PHP version.
  - The failure and the fix:
    - On 2026-11-20, a read-only check of a Boat workspace sandbox of this repository found the PPA in `/etc/apt/sources.list.d/ondrej-ubuntu-php-noble.sources`. That sandbox held 13 PHP packages from the PPA, with PHP 8.4.24, and `/usr/local/bin/composer`.
    - Their dates, within minutes of the Docker and Node.js packages, suggested that the Boat base image installs them. Boat's public docs, below, now confirm it.
    - On 2026-11-20 at 16:41:28 UTC, the PPA Release file changed its `Label` from `PPA for PHP` to `PPA for PHP (deprecated)`. Its `Origin` stayed `LP-PPA-ondrej-php`.
    - apt compares a new Release file with the copy in its cached lists. The Boat base image holds lists with the old `Label`.
    - In that sandbox, with apt 2.8.3 and the old `Label` cached, a plain `sudo apt-get update` failed with exit code 100. It printed: `E: Repository 'https://ppa.launchpadcontent.net/ondrej/php/ubuntu noble InRelease' changed its 'Label' value from 'PPA for PHP' to 'PPA for PHP (deprecated)'`
    - Deploy run 44776951476 started on 2026-11-20 at 16:47:54 UTC, at commit `e1706ffc6`. Its software image build printed that error. Its job `Check the software image result` failed.
    - In the same Boat sandbox, `sudo apt-get -o Acquire::AllowReleaseInfoChange::Label=true update` passed with exit code 0. A second run, with the new `Label` cached, also passed.
    - Commit `bc36e1849` merged the fix on 2026-11-20 at 17:43:49 UTC. It adds the Label option to `apt-get update` in `terminalPackagesCommand`. apt still checks the signatures. A changed `Origin` or `Codename` still stops the update.
    - The fix does not disable, replace, or remove the PPA.
    - When a source stops serving its Release file, apt reports an error, and `apt-get update` fails. The Label option does not accept that error.
    - Org install scripts, startup scripts, and agents can also run a plain `apt-get update`. While their cached lists hold the old `Label`, they fail in the same way.
    - On 2026-11-20, an agent that coordinated this follow-up work chose the Label option alone and no change to the PPA. That was a design call by an agent, not a decision by the user, Cal.
    - That agent asked to record the PPA work as one deferred item. Later that day, it asked for the read-only investigation that the earlier version of this item proposed.
    - The earlier option D required a package-source decision after this investigation. No source choice has been recorded.
  - The investigation, checked on 2026-11-20:
    - The public facts of this item come from these sources:
      - the Launchpad page and archive of the PPA
      - the maintainer's announcements
      - the Sury archive
      - the Ubuntu 24.04 archive
      - the official support pages of PHP, Composer, and Ubuntu
      - Boat's public docs
    - The local facts come from dpkg, `apt-cache policy`, the apt source files, and file dates of one Boat workspace sandbox of this repository. The Composer values come from a read of the file's bytes.
    - The public-source reads sent no credentials. The investigation ran no `apt-get update`, no PHP, and no Composer. It changed no package, apt source, image, or provider setting.
    - Public pages without a publication date were checked on 2026-11-20. The archive dates below are their Release dates.
  - The PPA:
    - The Release file `https://ppa.launchpadcontent.net/ondrej/php/ubuntu/dists/noble/InRelease` holds `Origin: LP-PPA-ondrej-php`, `Label: PPA for PHP (deprecated)`, `Suite: noble`, `Version: 24.04`, `Codename: noble`, and `Date: Fri, 20 Nov 2026 16:41:28 UTC`.
    - Its signature is good for the key `B8DC7E53946656EFBCE4C1DD71DAEAAB4AD4CAB6`, "Launchpad PPA for Ondřej Surý". The PPA source file of the Boat base image holds that key.
    - The page `https://launchpad.net/~ondrej/+archive/ubuntu/php` names the PPA `PPA for PHP (deprecated)`. Its description starts: "This PPA is frozen and no longer receives updates. The PHP packages for Ubuntu are now published at https://packages.sury.org/php/"
    - The description gives these migration steps for Jammy and Noble: `sudo apt update`, `sudo apt install debsuryorg-repository-php`, `sudo add-apt-repository --remove ppa:ondrej/php`, and `sudo apt update`.
    - It also says: "Nothing is removed or downgraded; the installed PHP packages stay as they are and get their next updates from the new repository." New installations follow `https://packages.sury.org/php/README.txt`.
    - The description has no date. It gives no date when the PPA stops serving its files.
    - The PPA published its newest `php8.4` and `php8.3` sources for noble on 2026-11-19 at 20:38:03 UTC, PHP 8.4.28 and 8.3.37. PHP 8.4.25, 8.4.26, and 8.4.27 came on 2026-08-28, 2026-09-24, and 2026-10-21.
    - Its noble index now offers the 12 `php8.4-*` packages at `8.4.28-2+ubuntu24.04.1+deb.sury.org+1`, and `php-common` at `2:101~+ubuntu24.04.1+deb.sury.org+1`. It has no `composer` package.
    - It also offers the maintainer's package `debsuryorg-repository-php` at `2026.11.11+ubuntu24.04.1+deb.sury.org+1`. That package writes `/etc/apt/sources.list.d/php.sources` for the Sury archive, and it needs the key package `debsuryorg-archive-keyring`.
    - That package also installs `/etc/apt/preferences.d/php.pref`. The file gives the PPA the priority 100, so apt prefers the Sury archive. The package does not remove the PPA source.
  - The maintainer's announcements:
    - On 2026-02-12, the maintainer opened `https://codeberg.org/oerdnj/deb.sury.org/issues/73`, "Moving Ubuntu from PPA to the packages.sury.org". He wrote: "The existing Ubuntu releases will follow."
    - On 2026-05-03, he wrote there that he had added `jammy`, `noble`, and `resolute` to `packages.sury.org`.
    - On 2026-07-12, he wrote there that the PPA builds and the Sury builds "are built from the same sources".
    - On 2026-11-12, he asked users there to try `debsuryorg-repository-php`. The issue is still open.
    - On 2026-11-20 at 15:21:53 UTC, in `https://codeberg.org/oerdnj/deb.sury.org/issues/73#issuecomment-28145358`, he discussed a reminder to remove the PPA "when convenient". He suggested that such a reminder go to `NEWS.Debian`. That comment gives no end date for the PPA.
    - His home page `https://deb.sury.org/`, last changed on 2026-11-19, calls `packages.sury.org/php` "the main PHP repository for Debian and Ubuntu".
    - His news feed `https://mastodon.rfc1925.org/@deb` holds two posts, both from 2024-07-03. No source that the investigation read gives an end date for the PPA.
  - The Sury archive:
    - Its Release file holds `Origin: deb.sury.org`, `Suite: noble`, `Codename: noble`, and `Date: Fri, 20 Nov 2026 10:15:58 UTC`. It has no `Label` and no `Version` field.
    - The key `15058500A0235D97F5D10063B188E2B695BD4743` signs it. This check had no copy of that key, so it did not verify the signature.
    - dpkg sorts the Sury `8.4.28` builds above the installed `8.4.24` builds, so apt sees them as upgrades. dpkg also sorts the Sury `php-common` above the installed one.
    - dpkg sorts each Sury `8.4.28` build below the PPA's own `8.4.28` build. So an image with the PPA's `8.4.28` keeps it until a newer PHP release.
  - The Ubuntu 24.04 archive:
    - Its Release files have good signatures from the Ubuntu archive key.
    - The checked stable indexes have no `php8.4-*` package. Its 12 `php8.3-*` counterparts are at `8.3.6-0ubuntu0.24.04.14` in `noble-updates` and `noble-security`, and at `8.3.6-0maysync1` in `noble`.
    - dpkg sorts Ubuntu's `php-common` below the installed one, so a switch to it is a downgrade.
    - Ubuntu's `composer` depends on `php-cli` and on PHP library packages of Ubuntu. It has no newer version in `noble-updates` or `noble-security`.
  - The package comparison, for amd64:

    | Package | Installed here | Ubuntu 24.04, same name | Ubuntu 24.04, PHP 8.3 counterpart | Sury archive, same name |
    | --- | --- | --- | --- | --- |
    | `php-common` | `2:101~+ubuntu24.04.1+deb.sury.org+1` | `2:93ubuntu2`, `noble` main | The same-name package serves every PHP version | `2:101+debsuryorg24.04.1+php+1` |
    | `php8.4-bcmath` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-bcmath` `8.3.6-0ubuntu0.24.04.14`, universe | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-cli` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-cli` `8.3.6-0ubuntu0.24.04.14`, main | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-common` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-common` `8.3.6-0ubuntu0.24.04.14`, main | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-curl` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-curl` `8.3.6-0ubuntu0.24.04.14`, main | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-gd` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-gd` `8.3.6-0ubuntu0.24.04.14`, main | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-intl` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-intl` `8.3.6-0ubuntu0.24.04.14`, universe | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-mbstring` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-mbstring` `8.3.6-0ubuntu0.24.04.14`, main | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-mysql` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-mysql` `8.3.6-0ubuntu0.24.04.14`, main | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-opcache` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-opcache` `8.3.6-0ubuntu0.24.04.14`, main | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-readline` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-readline` `8.3.6-0ubuntu0.24.04.14`, main | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-xml` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-xml` `8.3.6-0ubuntu0.24.04.14`, main | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `php8.4-zip` | `8.4.24-1+ubuntu24.04.1+deb.sury.org+1` | None | `php8.3-zip` `8.3.6-0ubuntu0.24.04.14`, universe | `8.4.28-2+debsuryorg24.04.1+php+1` |
    | `composer` | Composer 2.10.2, in the PHAR file `/usr/local/bin/composer`, which no package owns | `2.7.1-2`, `noble` universe | Not a package of one PHP version | None |

    - "Installed here" comes from dpkg and the read-only Composer PHAR check in this sandbox. "None" means that no index below has a package of that name.
    - Ubuntu `noble`: `http://archive.ubuntu.com/ubuntu/dists/noble/InRelease`, dated 2024-04-25 15:10:33 UTC, with `http://archive.ubuntu.com/ubuntu/dists/noble/main/binary-amd64/Packages.xz` and `http://archive.ubuntu.com/ubuntu/dists/noble/universe/binary-amd64/Packages.xz`.
    - Ubuntu `noble-updates`: `http://archive.ubuntu.com/ubuntu/dists/noble-updates/InRelease`, dated 2026-11-20 12:12:33 UTC, with `http://archive.ubuntu.com/ubuntu/dists/noble-updates/main/binary-amd64/Packages.xz` and `http://archive.ubuntu.com/ubuntu/dists/noble-updates/universe/binary-amd64/Packages.xz`.
    - Ubuntu `noble-security`: `http://archive.ubuntu.com/ubuntu/dists/noble-security/InRelease`, dated 2026-11-20 15:31:16 UTC, with `http://archive.ubuntu.com/ubuntu/dists/noble-security/main/binary-amd64/Packages.xz` and `http://archive.ubuntu.com/ubuntu/dists/noble-security/universe/binary-amd64/Packages.xz`.
    - Ubuntu `noble-backports`: `https://archive.ubuntu.com/ubuntu/dists/noble-backports/InRelease`, dated 2026-11-20 07:22:51 UTC. Its `https://archive.ubuntu.com/ubuntu/dists/noble-backports/main/binary-amd64/Packages.xz` and `https://archive.ubuntu.com/ubuntu/dists/noble-backports/universe/binary-amd64/Packages.xz` contain no PHP or Composer package. Its signature and both index digests passed verification. Checked on 2026-11-20.
    - Sury archive: `https://packages.sury.org/php/dists/noble/InRelease`, dated 2026-11-20 10:15:58 UTC, with `https://packages.sury.org/php/dists/noble/main/binary-amd64/Packages.xz`.
    - PPA: `https://ppa.launchpadcontent.net/ondrej/php/ubuntu/dists/noble/InRelease`, dated 2026-11-20 16:41:28 UTC, with `https://ppa.launchpadcontent.net/ondrej/php/ubuntu/dists/noble/main/binary-amd64/Packages.xz`.
    - Each package index matched the SHA256 sum in its Release file.
  - Support and updates, checked on 2026-11-20:
    - The PHP project: `https://www.php.net/supported-versions.php` says that active support for PHP 8.3 ended on 2025-12-31. Its security support ends on 2027-12-31.
    - For PHP 8.4, the same page gives 2026-12-31 as the end of active support and 2028-12-31 as the end of security support.
    - Ubuntu as the vendor: `https://ubuntu.com/about/release-cycle` gives Ubuntu 24.04 standard security maintenance until May 2029 for the packages in Main.
    - The security coverage of Universe has separate Ubuntu Pro terms. `php8.3-bcmath`, `php8.3-intl`, `php8.3-zip`, and `composer` are in Universe. So the Main coverage does not apply to every row of the table.
    - Nobody checked whether the sandboxes have an Ubuntu Pro entitlement.
    - Source availability is a separate fact. On 2026-11-20, `noble-security` held all 12 `php8.3-*` counterparts, also the three in Universe.
    - An installed update is a separate fact too. A source can offer a fixed build, but an image gets it only when a step installs it.
    - Composer: `https://getcomposer.org/doc/00-intro.md#system-requirements` says that current Composer needs PHP 7.2.5 to run. PHP 8.3 and PHP 8.4 both meet that minimum. That is not a project test or a migration test.
  - The Boat workspace sandbox of this investigation:
    - It runs Ubuntu 24.04.4 LTS with apt 2.8.3.
    - Its PPA source file `/etc/apt/sources.list.d/ondrej-ubuntu-php-noble.sources` is dated 2026-07-31 17:19:21 UTC. Six other third-party source files date from 17:19 to 17:26 UTC that day.
    - The dpkg file lists of the 13 PHP packages in `/var/lib/dpkg/info/` are dated 2026-07-31 17:23:45 and 17:23:46 UTC. Those of `docker-ce` and `nodejs` are dated 17:20:45 and 17:23:44 UTC.
    - `php-common` is at `2:101~+ubuntu24.04.1+deb.sury.org+1`, from the source `php-defaults`. It is a shared package, not the PHP runtime.
    - The PHP runtime is the 12 `php8.4-*` packages at `8.4.24-1+ubuntu24.04.1+deb.sury.org+1`: `bcmath`, `cli`, `common`, `curl`, `gd`, `intl`, `mbstring`, `mysql`, `opcache`, `readline`, `xml`, and `zip`. `/usr/bin/php` points to `/usr/bin/php8.4`.
    - `/usr/local/bin/composer` is a file of 3,639,279 bytes, owned by `user`. It was created at 17:26:26 UTC and last changed at 17:26:28 UTC on 2026-07-31. dpkg finds no package that owns it.
    - That file is the Composer PHAR, not an apt package. It holds `public const VERSION = '2.10.2'` and `RELEASE_DATE = '2026-07-01 11:24:45'`. Its SHA256 matches `https://getcomposer.org/download/2.10.2/composer.phar.sha256sum`.
    - The cached PPA Release file still holds `Label: PPA for PHP`, with `Date: Thu, 30 Jul 2026 19:09:34 UTC`. So a plain `apt-get update` in this sandbox meets the error above. The investigation did not run one.
    - `apt-cache policy` reads only the cached lists. It shows the installed PHP as the candidate, because the cached PPA index is from 2026-07-30. It is not a current view of any archive.
  - Boat's public docs:
    - `https://docs.boat.dev/machines/tools` says: "Every sandbox starts from the same base image: Ubuntu 24.04 LTS, Linux 6.8, x86_64." It lists `php` / `composer` as "PHP 8.4.24".
    - That page says that Boat measured the versions on a new sandbox on 2026-10-13. It tells users to install more with `sudo apt-get install -y <package>`.
    - The Wine guide `https://docs.boat.dev/windows-apps/install-wine` says: "The sandbox has a PHP repository." Its script runs `sudo apt-get update -qq`.
    - The FAQ `https://docs.boat.dev/faq` says that Boat has one image for all customers.
    - `https://docs.boat.dev/changelog` and `https://boat.dev/changelog` return HTTP 404. The docs index `https://docs.boat.dev/llms.txt` lists no changelog page.
    - The full docs text `https://docs.boat.dev/llms-full.txt` names no PPA and no plan to change the base image. This does not show that Boat has no plan.
  - This repository and production:
    - A search of the 7,331 tracked files found PHP only as a process name in `crates/cnd-runner/src/ports/metadata.rs:8`. It found the PPA only in `image/install.md` and this item.
    - The search found no tracked installer, template, or script that adds PHP, Composer, or the PPA. It found no command that runs PHP or Composer. The process-name match is the one PHP reference in code.
    - Org install scripts and startup scripts live in production D1, in `settings.install_script` and `settings.startup_script`. Each build job copies its install script into `image_build_jobs.install_script`. This investigation could not read them.
  - Shared assumptions of all options:
    - Boat owns its base image, and the app can change only what its builds run on that image. Source: Boat's tools page and its FAQ.
    - The app keeps PHP available until an inventory rules out org dependencies. Sources: the production compatibility rule in `AGENTS.md` and Boat's published tools list. The common software list in `src/shared/base-image.ts` names no PHP version.
    - The apt part gets its packages from apt, after an `apt-get update`. Source: the code at `worker/terminal/service.ts:18`. **Left out** gives the approaches that drop it.
  - Not known:
    - When the PPA stops serving its files, if ever.
    - Whether Boat plans to change its base image. Whether a new base image changes existing org images.
    - Whether an org script uses the PPA, PHP, Composer, or a plain `apt-get update`. An authorized, read-only inventory of production D1 can tell.
    - That inventory reads the install scripts and startup scripts of each org. It reports only the orgs that contain `ondrej`, `ppa:`, `launchpadcontent`, `sury`, `php`, `composer`, `apt-get update`, or `apt update`. It prints no script text, because a script can hold a secret.
    - Whether any org project needs PHP 8.4, or a PHP package that only the PPA has.
    - Whether Composer and the projects of orgs work with PHP from another source. The version facts above are not a test.
- **Problem:** The Boat base image, and each image built from it, reads a PHP apt source that its maintainer has frozen and marked as deprecated. The base image holds PHP 8.4.24 from it, and new PHP builds for Ubuntu now go to the Sury archive. The apt part still reads the PPA, so a further change of the PPA can fail builds again.
- **Impact if no action:** A removal of the PPA, or a change that the Label option does not accept, fails each build and deploy that runs the apt part. The PHP of Boat images gets no more fixes from its source.
- **Root question:** How do Boat images keep working builds, and PHP that can get fixes, now that the PHP PPA is frozen?
- **Options:**
  - **A.** Change nothing more. Keep the Label option and the PPA. It costs nothing now. The PPA gets no more PHP fixes, so the images keep PHP 8.4.24 unless an org script upgrades it. A removal of the PPA, or a change of its `Origin` or `Codename`, fails each build and deploy again, with no warning. Effort: Small.
  - **B.** Disable the PPA in the apt part before `apt-get update`. Builds then never read it, and later plain apt commands in the same image do not read it either. The PPA is frozen, so B loses no future PHP release. But orgs lose the newer PPA builds up to 8.4.28, and an org script that installs a PHP package from the PPA fails. Members see this change. A source change in image builds does not change the disks of existing workspaces. A workspace made before the change can still hold the PPA and meet the same error in a plain `apt-get update`. B also adds a package-source policy that `docs/protocol/sandbox-software.md` does not state. The branch that builds B must state that policy there. Before it changes behaviour, it must also assess the matching words of the legal pages and the public guides. Effort: Medium, with that doc work.
  - **C.** Ask Boat to move its base image off the PPA, for example to the Sury archive, or to drop the PPA. Boat installs this PHP, so the fix lands at its owner. The app controls neither the answer nor its date. Boat's change can also change or remove PHP that orgs use. A new base image reaches the software image at the next deploy. Nobody knows whether it reaches existing org images. This investigation did not contact Boat. Effort: Small.
  - **E.** Replace the PPA in the apt part with a supported source, and disable the PPA. The app then owns the PHP source of every Boat image. A new source makes packages available, but it installs nothing. The apt part installs only `ttyd`, `tmux`, and `gh`, so the installed PHP stays until a step changes it. To promise current PHP fixes, E needs its own plan that changes the installed PHP and tests Composer and org projects. E does not change Composer. A source change in image builds does not change the disks of existing workspaces. A workspace made before the change can still hold the PPA and meet the same error in a plain `apt-get update`. E also adds a package-source policy that `docs/protocol/sandbox-software.md` does not state. The branch that builds E must state that policy there. Before it changes behaviour, it must also assess the matching words of the legal pages and the public guides. Two sources exist, and a choice of E also picks one:
    - **With the Sury archive,** the source that the maintainer names. The archive has all 13 package names. Its 12 versioned packages supply PHP 8.4.28. So this variant keeps PHP 8.4 and its package names. The maintainer's route installs `debsuryorg-repository-php` and its dependency `debsuryorg-archive-keyring` from the old PPA index, so it reads the PPA once. The manual route of `https://packages.sury.org/php/README.txt` gets the key package from `https://packages.sury.org/debsuryorg-archive-keyring.deb`. Its source entry uses `Signed-By: /usr/share/keyrings/debsuryorg-archive-keyring.gpg`. A manual entry must use that same key file, or the image must hold only one entry for this archive. apt refuses to read its sources when two entries for one archive name different `Signed-By` key files, as the script of the migration package notes. That package creates no entry when another source already enables the archive. The variant adds a third-party source and key, and a change of that source can fail the apt part in the same way. Effort: Medium, with the doc work and without the PHP upgrade.
    - **With the PHP of Ubuntu 24.04 itself.** The Ubuntu archive is already in every image, and Ubuntu signs it, so this variant adds no source or key. Ubuntu 24.04 has no PHP 8.4. A complete move replaces the 12 `php8.4-*` packages with their `php8.3-*` counterparts and downgrades `php-common`. That moves every Boat image from PHP 8.4 to PHP 8.3. A project that needs PHP 8.4 then fails, and nobody knows yet whether such a project exists. Ubuntu's standard maintenance covers the nine counterparts in Main. The three in Universe fall under separate Ubuntu Pro terms. Effort: Medium, with the doc work and without project tests.
  - **F.** Limit the apt part to the sources that `ttyd`, `tmux`, and `gh` need. On Boat, these are the Ubuntu archive and the GitHub CLI source. On E2B, it is only the Ubuntu archive. The step must find these entries by a stable property, such as the archive or its signing key, or write its own explicit entries. It must not depend on one current mirror address. It must keep the cached lists of the other sources, for example with a private source list and a private list folder. A change in any other source, such as this PPA, Docker, or Node.js, then cannot fail the apt part. F protects only the apt commands of the app. It gives PHP no fixes. It does not protect plain apt commands in org scripts, startup scripts, or agent commands. If F also stops the refresh of the other sources, an image that caches the old PPA `Label` keeps it. A plain `apt-get update` there then keeps failing. A second update of all sources that only warns on failure keeps today's refresh. Effort: Medium.
- **Left out:**
  - Accept every changed release field with `--allow-releaseinfo-change`. It differs from A only in a detail. It also accepts a changed `Origin` or `Codename`, which can mean that a source now serves another archive.
  - Turn on the Label option for every apt command, with a global apt setting. It covers only `Label` changes. A removal of the archive, or a change of its `Origin` or `Codename`, still fails. It also loosens the check for every apt command that members and agents run.
  - Remove PHP from each Boat image. It fails the goal for orgs that use PHP. Only the production inventory above can show whether any org uses it.
  - A base image of the app's own on Boat, like the E2B template. Boat's FAQ says that all customers get one image. B or E also gives the same result for this source at a lower cost.
  - Let the apt part warn and continue when `apt-get update` fails. It breaks a requirement that stays. `docs/protocol/sandbox-software.md:209-213` says that a change of the apt part still upgrades the packages. After a failed update that only warns, the step can record the change but leave `tmux` or `gh` old.
  - Ship `ttyd`, `tmux`, and `gh` in the app's release, and drop apt from builds. It breaks a requirement that stays. `docs/protocol/sandbox-software.md:206-208` says that the software step installs these packages with apt.
  - Drop `apt-get update` from the apt part. It fails the goal, because the cached lists get old, and the install then fails on removed package files.
- **Wider fix:** F. It stops a change in any apt source that the app's packages do not need from failing the apt part. It does not cover PHP fixes or plain apt commands in org scripts.
- **Previous examples:**
  - In this repository: the failure that commit `bc36e1849` fixed on 2026-11-20, with deploy run 44776951476. The Git history has no earlier case.
- **Related:**
  - `plans/follow-ups/org-image-clean-builds.md`: the same image path. Its option starts each build from the clean base image. A change of the Boat base image, as in C, then reaches each org image at its next build.
  - `plans/follow-ups/image-download-retries.md`: the same code. Its apt retry options and F both change `terminalPackagesCommand`, so one branch can do both.
  - `plans/follow-ups/gh-package-source-claims.md`: the same apt part. It corrects the claim that Ubuntu owns `gh`. F depends on that fact, because on Boat `gh` comes from the GitHub CLI source.
- **Recommendation:** F. No other option stops each apt source that the app does not need, this frozen PPA included, from failing the app's apt part. Under F, org scripts can still fail their own `apt-get update`. Apart from F, C can go with any option at small cost, because Boat installs this PHP. No PHP source is clearly best before org requirements are known. If Cal wants the app to own PHP 8.4 and its current updates, E with the Sury archive is the path. That path needs its own upgrade and test plan.
- **Action:** ask the user, because no package-source option is clearly best before org script requirements are known. B and E can change the packages that org scripts and users get.
