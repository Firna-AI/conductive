//! A fake system and release server for the own computer installer tests.

use std::error::Error;
use std::fs;
use std::os::unix::fs::{PermissionsExt, symlink};
use std::path::Path;
use std::process::{Command, Output};

use cnd_release::files::{DiskReleaseFiles, ReleaseFiles};
use cnd_release::parts::PartsList;
use cnd_release::signature::ReleaseSigner;
use cnd_release::version::TARGET;

pub(crate) const CODE: &str = "ABCD-EFGH-JKMN-PQRS";
pub(crate) const VERSION: &str = "0.0.17";
pub(crate) const NEXT_VERSION: &str = "0.0.18";
pub(crate) const DROP_IN: &str = "[Service]\nDelegate=cpu cpuset io memory pids\n";

const STUB: &str = r#"#!/bin/sh
set -eu
log() { printf '%s%s\n' "${CALL_PREFIX-}" "$*" >> "$FIXTURE/calls"; }
case "$*" in *"$ENROLLMENT_CODE"*) log "Enrollment code in ${0##*/} arguments"; exit 99;; esac
case "${0##*/}" in
  uname)
    case "$1" in -s) echo Linux;; -m) echo "$ARCH";; *) exit 99;; esac
    ;;
  id) test "$*" = -u; echo "$INSTALLER_UID";;
  getent) test "$*" = 'passwd conductive'; test -f "$FIXTURE/user" || exit 2
    printf 'conductive:x:942:942::%s/home:/usr/sbin/nologin\n' "$FIXTURE"
    ;;
  test)
    case "$*" in
      '-d /run/systemd/system') exit 0;;
      '-S /run/user/942/bus')
        test "$INSTALLER_UID" = 0 || test "${CALL_PREFIX-}" = 'sudo '
        test -f "$FIXTURE/bus"
        ;;
      '-e /etc/subuid'|'-e /etc/subgid') test -f "$FIXTURE/${2##*/}";;
      *) exit 99;;
    esac
    ;;
  stat) test "$*" = '-f -c %T /sys/fs/cgroup'; echo cgroup2fs;;
  podman) test "$*" = --version; echo 'podman version 4.9.3';;
  newuidmap|newgidmap) exit 99;;
  cat)
    case "${1-}" in
      /etc/subuid|/etc/subgid) exec /usr/bin/cat "$FIXTURE/${1##*/}";;
      *) exec /usr/bin/cat "$@";;
    esac
    ;;
  useradd) log "useradd $*"; : > "$FIXTURE/user";;
  usermod) log "usermod $*";;
  cmp) exec /usr/bin/cmp "$1" "$2" "$FIXTURE/drop-in";;
  install)
    case "$*" in
      '-d -m 0755 /etc/systemd/system/user@942.service.d') log "install $*";;
      '-m 0644 '*'/etc/systemd/system/user@942.service.d/conductive-delegate.conf')
        log "install drop-in $4"
        cp "$3" "$FIXTURE/drop-in"
        ;;
      *) exit 99;;
    esac
    ;;
  systemctl) log "systemctl $*";;
  loginctl) log "loginctl $*"; : > "$FIXTURE/bus";;
  sleep) exit 99;;
  sudo|runuser)
    if [ "${0##*/}" = sudo ]; then
      test "$INSTALLER_UID" != 0
      if [ "$1" = -- ]; then
        shift
        CALL_PREFIX='sudo ' exec "$@"
      fi
    else
      test "$INSTALLER_UID" = 0
    fi
    test "$1 $2 $3" = '-u conductive --'
    test "$(pwd)" = /
    shift 3
    test "$1 $2 $3 $4" = "env HOME=$FIXTURE/home XDG_RUNTIME_DIR=/run/user/942 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/942/bus"
    CALL_PREFIX="${0##*/} -u conductive " exec "$@"
    ;;
  curl)
    while [ "$1" != --output ]; do
      if [ "$1" = --proto ]; then protocol=$2; shift; fi
      shift
    done
    test "$3" = --
    log "curl $protocol $4"
    case "$4" in
      */releases/latest/conductive/*|*/releases/download/conductive/*)
        cp "$FIXTURE/releases/${4##*/releases/}" "$2"
        ;;
      *) exit 99;;
    esac
    ;;
  conductive)
    log "$*"
    if [ "$*" = --version ]; then
      executable="$(/usr/bin/readlink -f "$0")"
      version_dir="${executable%/*}"
      printf 'conductive %s\n' "${version_dir##*/}"
    elif [ "$1 $2" = 'computer enroll' ]; then
      IFS= read -r received_code
      test "$received_code" = "$ENROLLMENT_CODE"
      if [ -f "$FIXTURE/enroll-error" ]; then
        cat "$FIXTURE/enroll-error" >&2
        exit 1
      fi
    fi
    ;;
  *) exec "/usr/bin/${0##*/}" "$@";;
esac
"#;

pub(crate) struct Server {
    pub(crate) root: tempfile::TempDir,
    pub(crate) digest: String,
}

impl Server {
    pub(crate) fn new() -> Result<Self, Box<dyn Error>> {
        let root = tempfile::tempdir()?;
        let base = root.path();
        fs::create_dir(base.join("bin"))?;
        fs::create_dir(base.join("tmp"))?;
        fs::create_dir(base.join("home"))?;
        fs::write(base.join("subuid"), "user:100000:65536\n")?;
        fs::write(base.join("subgid"), "other:350000:5000\n")?;
        let stub = base.join("stub");
        fs::write(&stub, STUB)?;
        fs::set_permissions(&stub, fs::Permissions::from_mode(0o755))?;
        let commands = "awk cat chmod cmp cp curl env getent grep gzip id install ln loginctl mkdir
                        mktemp mv newgidmap newuidmap podman rm runuser sha256sum sh sleep stat
                        sudo systemctl tar test timeout uname useradd usermod";
        for name in commands.split_whitespace() {
            symlink(&stub, base.join("bin").join(name))?;
        }
        let digest = Self::publish(base, VERSION)?;
        Ok(Self { root, digest })
    }

    pub(crate) fn publish(base: &Path, version: &str) -> Result<String, Box<dyn Error>> {
        let signer = ReleaseSigner::from_pem(include_str!(
            "../../../cnd-release/tests/fixtures/rfc8032-test-key.pem"
        ))?;
        let release = DiskReleaseFiles.package(
            version,
            &base.join("stub"),
            &PartsList::new(vec![])?,
            base,
            &signer,
        )?;
        Ok(release.sha256.ok_or("missing archive SHA-256 digest")?)
    }

    pub(crate) fn install(&self, uid: &str, arch: &str, args: &[&str]) -> std::io::Result<Output> {
        let base = self.root.path();
        let script = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../image/computer/install.sh");
        fs::write(base.join("calls"), "")?;
        Command::new("/bin/sh")
            .args(["-s", "--"])
            .args(args)
            .stdin(fs::File::open(script)?)
            .env_clear()
            .env("PATH", base.join("bin"))
            .env("FIXTURE", base)
            .env("TMPDIR", base.join("tmp"))
            .envs([("LC_ALL", "C"), ("TZ", "UTC")])
            .env("ENROLLMENT_CODE", args.get(1).copied().unwrap_or(CODE))
            .env("INSTALLER_UID", uid)
            .env("ARCH", arch)
            .output()
    }

    pub(crate) fn calls(&self) -> std::io::Result<String> {
        fs::read_to_string(self.root.path().join("calls"))
    }

    pub(crate) fn refusal(
        &self,
        arch: &str,
        args: &[&str],
    ) -> Result<(Option<i32>, String), Box<dyn Error>> {
        let output = self.install("1000", arch, args)?;
        assert_eq!(self.calls()?, "");
        Ok((output.status.code(), String::from_utf8(output.stderr)?))
    }

    pub(crate) fn download_calls(&self, server: &str, protocol: &str) -> String {
        format!(
            "curl {protocol} {server}/releases/latest/conductive/{TARGET}\n\
             curl {protocol} {server}/releases/download/conductive/{VERSION}/{}/conductive-{VERSION}-{TARGET}.tar.gz\n",
            self.digest
        )
    }
}
