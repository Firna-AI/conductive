//! Run the own computer installer with a fake system and release server.

use std::error::Error;
use std::fs;
use std::os::unix::fs::{PermissionsExt, symlink};
use std::path::Path;
use std::process::{Command, Output};

use cnd_release::files::{DiskReleaseFiles, ReleaseFiles};
use cnd_release::manifest::program_archive_key;
use cnd_release::parts::PartsList;
use cnd_release::signature::ReleaseSigner;
use cnd_release::version::TARGET;

const CODE: &str = "ABCD-EFGH-JKMN-PQRS";
const VERSION: &str = "0.0.17";
const DROP_IN: &str = "[Service]\nDelegate=cpu cpuset io memory pids\n";

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
    if [ "$1 $2" = 'computer enroll' ]; then
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

struct Server {
    root: tempfile::TempDir,
    digest: String,
}

impl Server {
    fn new() -> Result<Self, Box<dyn Error>> {
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
                        sudo systemctl tar test uname useradd usermod";
        for name in commands.split_whitespace() {
            symlink(&stub, base.join("bin").join(name))?;
        }
        let program = base.join("conductive");
        fs::write(&program, STUB)?;
        let signer = ReleaseSigner::from_pem(include_str!(
            "../../cnd-release/tests/fixtures/rfc8032-test-key.pem"
        ))?;
        let release =
            DiskReleaseFiles.package(VERSION, &program, &PartsList::new(vec![])?, base, &signer)?;
        let digest = release.sha256.ok_or("missing archive SHA-256 digest")?;
        Ok(Self { root, digest })
    }

    fn install(&self, uid: &str, arch: &str, args: &[&str]) -> std::io::Result<Output> {
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

    fn calls(&self) -> std::io::Result<String> {
        fs::read_to_string(self.root.path().join("calls"))
    }

    fn refusal(&self, arch: &str, args: &[&str]) -> Result<(Option<i32>, String), Box<dyn Error>> {
        let output = self.install("1000", arch, args)?;
        assert_eq!(self.calls()?, "");
        Ok((output.status.code(), String::from_utf8(output.stderr)?))
    }

    fn download_calls(&self, server: &str, protocol: &str) -> String {
        format!(
            "curl {protocol} {server}/releases/latest/conductive/{TARGET}\n\
             curl {protocol} {server}/releases/download/conductive/{VERSION}/{}/conductive-{VERSION}-{TARGET}.tar.gz\n",
            self.digest
        )
    }
}

#[test]
fn installs_a_release_and_enrolls_a_new_user_in_order() -> Result<(), Box<dyn Error>> {
    let server = Server::new()?;
    let output = server.install("1000", "x86_64", &["--code", CODE])?;
    let downloads = server.download_calls("https://runner.conductive.build", "=https");
    let expected = format!(
        "sudo useradd --create-home --home-dir /home/conductive --shell /usr/sbin/nologin --user-group conductive\n\
         sudo usermod --add-subuids 355000-420535 --add-subgids 355000-420535 conductive\n\
         sudo install -d -m 0755 /etc/systemd/system/user@942.service.d\n\
         sudo install drop-in /etc/systemd/system/user@942.service.d/conductive-delegate.conf\n\
         sudo systemctl daemon-reload\n\
         sudo loginctl enable-linger conductive\n\
         {downloads}sudo -u conductive computer check\n\
         sudo -u conductive computer enroll --origin https://api.conductive.build --release-server https://runner.conductive.build\n\
         sudo -u conductive computer service\n"
    );
    assert_eq!(server.calls()?, expected);
    assert_eq!(output.status.code(), Some(0), "{output:?}");
    let root = server.root.path();
    assert_eq!(fs::read_to_string(root.join("drop-in"))?, DROP_IN);
    let store = root.join("home/.local/share/conductive");
    let current = fs::read_link(store.join("current"))?;
    assert_eq!(current, Path::new("versions/0.0.17"));
    let installed = fs::metadata(store.join("versions/0.0.17/conductive"))?;
    assert_eq!(installed.permissions().mode() & 0o777, 0o755);
    assert_eq!(fs::read_dir(root.join("tmp"))?.count(), 0);
    Ok(())
}

#[test]
fn reruns_as_root_without_recreating_the_account_ranges_or_drop_in() -> Result<(), Box<dyn Error>> {
    let server = Server::new()?;
    let root = server.root.path();
    fs::write(root.join("user"), "")?;
    fs::write(root.join("subuid"), "942:355000:65536\n")?;
    fs::write(root.join("subgid"), "conductive:355000:65536\n")?;
    fs::write(root.join("drop-in"), DROP_IN)?;
    let origin = "http://127.0.0.1:8787";
    let release_server = "http://[::1]:8000/dev/";
    let args = [
        "--code",
        "0123-4567-89AB-CDEF",
        "--origin",
        origin,
        "--release-server",
        release_server,
    ];
    let output = server.install("0", "x86_64", &args)?;
    let downloads = server.download_calls("http://[::1]:8000/dev", "=http,https");
    let expected = format!(
        "systemctl daemon-reload\n\
         loginctl enable-linger conductive\n\
         {downloads}runuser -u conductive computer check\n\
         runuser -u conductive computer enroll --origin {origin} --release-server {release_server}\n\
         runuser -u conductive computer service\n"
    );
    assert_eq!(server.calls()?, expected);
    assert_eq!(output.status.code(), Some(0), "{output:?}");
    Ok(())
}

#[test]
fn refuses_bad_options_before_any_change() -> Result<(), Box<dyn Error>> {
    let server = Server::new()?;
    let bad_code = server.refusal("x86_64", &["--code", "ABCD-EFGH-JKMN-PQRI"])?;
    let deceptive_url = "http://localhost@remote.test";
    let bad_server = ["--code", CODE, "--release-server", deceptive_url];
    let bad_url = server.refusal("x86_64", &bad_server)?;
    let url_message = "Use HTTPS for --release-server, or HTTP with a loopback host.\n";
    assert_eq!(bad_code, (Some(2), "Enter the code from the app.\n".into()));
    assert_eq!(bad_url, (Some(2), url_message.into()));
    Ok(())
}

#[test]
fn refuses_unsupported_hosts_before_any_change() -> Result<(), Box<dyn Error>> {
    let server = Server::new()?;
    let args = ["--code", CODE];
    let other_arch = server.refusal("aarch64", &args)?;
    fs::remove_file(server.root.path().join("bin/podman"))?;
    let no_podman = server.refusal("x86_64", &args)?;
    assert_eq!(other_arch, (Some(1), "Use an x86_64 server.\n".into()));
    assert_eq!(no_podman, (Some(1), "Install Podman 4 or later.\n".into()));
    Ok(())
}

#[test]
fn refuses_a_wrong_archive_digest_before_installing_the_program() -> Result<(), Box<dyn Error>> {
    let server = Server::new()?;
    let root = server.root.path();
    let archive = program_archive_key(VERSION, &server.digest)?;
    fs::write(root.join(archive), b"unexpected archive bytes")?;
    let output = server.install("1000", "x86_64", &["--code", CODE])?;
    assert_eq!(output.status.code(), Some(1), "{output:?}");
    assert_eq!(
        output.stderr,
        b"The release archive did not match its SHA-256 digest.\n"
    );
    assert!(!root.join("home/.local/share/conductive").exists());
    assert_eq!(fs::read_dir(root.join("tmp"))?.count(), 0);
    Ok(())
}

#[test]
fn reports_the_enrollment_failure_without_starting_the_service() -> Result<(), Box<dyn Error>> {
    let reason = "Could not reach the Worker.\n";
    let server = Server::new()?;
    fs::write(server.root.path().join("enroll-error"), reason)?;
    let output = server.install("1000", "x86_64", &["--code", CODE])?;
    let message = "The own computer could not exchange its code. Read the message above.\n";
    assert_eq!(output.stderr, [reason, message].concat().as_bytes());
    assert_eq!(output.status.code(), Some(1));
    assert!(!server.calls()?.contains("computer service"));
    Ok(())
}
