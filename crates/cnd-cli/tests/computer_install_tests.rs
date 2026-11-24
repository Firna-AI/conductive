//! Run the own computer installer with a fake system and release server.

use std::error::Error;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use cnd_release::manifest::program_archive_key;

#[path = "computer_install/harness.rs"]
mod harness;

use harness::{CODE, DROP_IN, NEXT_VERSION, Server, VERSION};

#[test]
fn installs_a_release_in_order_and_reuses_it_on_a_rerun() -> Result<(), Box<dyn Error>> {
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

    Server::publish(root, NEXT_VERSION)?;
    let rerun = server.install("1000", "x86_64", &["--code", CODE])?;
    assert_eq!(fs::read_link(store.join("current"))?, current);
    assert_eq!(rerun.status.code(), Some(0), "{rerun:?}");
    let calls = server.calls()?;
    assert!(!calls.contains("curl "), "{calls}");
    let setup = "sudo -u conductive --version\n\
                 sudo -u conductive computer check\n\
                 sudo -u conductive computer enroll --origin https://api.conductive.build --release-server https://runner.conductive.build\n\
                 sudo -u conductive computer service\n";
    assert!(calls.ends_with(setup), "{calls}");
    Ok(())
}

#[test]
fn warns_and_installs_on_a_root_rerun_with_a_missing_program() -> Result<(), Box<dyn Error>> {
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
    assert_eq!(
        output.stderr,
        b"The Conductive program is missing or cannot run. Installing the newest release.\n"
    );
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
fn keeps_the_current_release_when_enrollment_fails_on_a_rerun() -> Result<(), Box<dyn Error>> {
    let reason = "Could not reach the Worker.\n";
    let server = Server::new()?;
    let initial = server.install("1000", "x86_64", &["--code", CODE])?;
    assert_eq!(initial.status.code(), Some(0), "{initial:?}");
    let root = server.root.path();
    Server::publish(root, NEXT_VERSION)?;
    fs::write(root.join("enroll-error"), reason)?;
    let output = server.install("1000", "x86_64", &["--code", CODE])?;
    let message = "The own computer could not exchange its code. Read the message above.\n";
    assert_eq!(output.stderr, [reason, message].concat().as_bytes());
    assert_eq!(output.status.code(), Some(1));
    assert!(!server.calls()?.contains("computer service"));
    let current = fs::read_link(root.join("home/.local/share/conductive/current"))?;
    assert_eq!(current, Path::new("versions/0.0.17"));
    Ok(())
}
