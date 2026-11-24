//! Native Podman arguments, process input, and typed failures.

#![expect(
    clippy::unwrap_used,
    reason = "Invalid stub process fixtures must fail the test."
)]

use std::env;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;
use std::process::Command;
use std::sync::Arc;

use cnd_computer::engine::error::EngineError;
use cnd_computer::engine::podman::Podman;
use cnd_computer::engine::ports::Engine;
use cnd_computer::process::NativeProcess;
use cnd_runner_interface::computer::operations::ComputerRelease;
use cnd_runner_interface::computer::results::ContainerState;

const FOLDER: &str = "CND_PODMAN_FIXTURE";
const SECRET: &[u8] = b"export 'NAME=private body'\n";
const IMAGE: &str = "localhost/conductive/org-image";
const TEST: &str = "native_engine_uses_fixed_arguments_and_sends_the_env_on_stdin";
const STUB: &str = r#"#!/bin/sh
set -eu
{
    printf '%s\0' "$#"
    printf '%s\0' "$@"
} >> "$CND_PODMAN_FIXTURE/args"
case "$1 $2" in
    'container inspect')
        case "$3" in
            conductive-absent) echo 'Error: no such container' >&2; exit 125 ;;
            conductive-paused) printf '[{"State":{"Status":"paused","Running":true}}]' ;;
            *) printf '[{"State":{"Status":"running","Running":true}}]' ;;
        esac
        ;;
    'image exists')
        if [ "$3" = localhost/conductive/org-absent ]; then exit 1; fi
        ;;
    'start conductive-full') echo 'no space left on device: private path' >&2; exit 125 ;;
    'start conductive-taken') echo 'the container name is already in use' >&2; exit 125 ;;
    'start conductive-failed') echo 'some other private error' >&2; exit 125 ;;
    'exec --interactive')
        case "$8" in
            *env.sh*) cat > "$CND_PODMAN_FIXTURE/env-input" ;;
            *'.conductive.XXXXXX'*) cat > "$CND_PODMAN_FIXTURE/program-input" ;;
        esac
        ;;
    'load --input') printf 'Loaded image: localhost/signed-image:fixture\n' ;;
    'image inspect') printf '%064d\n' 0 ;;
esac
"#;

#[tokio::test]
async fn native_engine_uses_fixed_arguments_and_sends_the_env_on_stdin() {
    if let Some(path) = env::var_os(FOLDER) {
        check_native(Path::new(&path)).await;
        return;
    }
    let folder = tempfile::tempdir().unwrap();
    let stub = folder.path().join("podman");
    fs::write(&stub, STUB).unwrap();
    fs::set_permissions(&stub, fs::Permissions::from_mode(0o700)).unwrap();
    let output = Command::new(env::current_exe().unwrap())
        .args(["--exact", TEST, "--nocapture"])
        .env(FOLDER, folder.path())
        .env("PATH", format!("{}:/usr/bin:/bin", folder.path().display()))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
    );
}

async fn check_native(folder: &Path) {
    let engine = Podman::new(Arc::new(NativeProcess));
    assert_eq!(
        engine.inspect("box").await.unwrap(),
        ContainerState::Running
    );
    assert_eq!(
        engine.inspect("paused").await.unwrap(),
        ContainerState::Stopped
    );
    assert_eq!(
        engine.inspect("absent").await.unwrap(),
        ContainerState::Missing
    );
    assert!(engine.image_exists(IMAGE).await.unwrap());
    assert!(
        !engine
            .image_exists("localhost/conductive/org-absent")
            .await
            .unwrap()
    );
    engine.create("box", IMAGE, 2, 8192).await.unwrap();
    engine.start("box").await.unwrap();
    engine
        .write_environment("box", SECRET.to_vec())
        .await
        .unwrap();
    engine.stop("box").await.unwrap();
    engine.remove("box").await.unwrap();
    engine.save("box", IMAGE).await.unwrap();
    assert!(matches!(
        engine.start("full").await,
        Err(EngineError::NoSpace)
    ));
    assert!(matches!(
        engine.start("taken").await,
        Err(EngineError::AlreadyExists)
    ));
    let failure = engine.start("failed").await.unwrap_err().to_string();
    assert!(!failure.contains("private error"));

    let archive = folder.join("image archive.tar");
    let tag = "localhost/conductive/base:0.0.42";
    let id = format!("sha256:{}", "0".repeat(64));
    engine.load(&archive, &id, tag).await.unwrap();
    let wrong = format!("sha256:{}", "1".repeat(64));
    assert!(matches!(
        engine.load(&archive, &wrong, tag).await,
        Err(EngineError::ImageIdMismatch)
    ));

    let program = folder.join("conductive");
    fs::write(&program, b"checked program").unwrap();
    let release = ComputerRelease {
        version: "0.0.42".into(),
        digest: "1".repeat(64),
    };
    let server = "http://127.0.0.1:4666/mock".parse().unwrap();
    engine
        .bootstrap("box", &program, &release, &server)
        .await
        .unwrap();

    let trace = fs::read_to_string(folder.join("args")).unwrap();
    let mut arguments = trace.trim_end_matches('\0').split('\0');
    let mut calls = Vec::new();
    while let Some(count) = arguments.next() {
        calls.push(
            arguments
                .by_ref()
                .take(count.parse::<usize>().unwrap())
                .collect::<Vec<_>>(),
        );
    }
    assert_eq!(calls[0], ["container", "inspect", "conductive-box"]);
    assert_eq!(calls[3], ["image", "exists", IMAGE]);
    assert_eq!(
        calls[5],
        [
            "create",
            "--name",
            "conductive-box",
            "--label",
            "build.conductive.container=box",
            "--systemd=always",
            "--cpus",
            "2",
            "--memory",
            "8192",
            "--memory-swap",
            "8192",
            "--volume",
            "/tmp",
            IMAGE
        ]
    );
    assert_eq!(calls[6], ["start", "conductive-box"]);
    assert_eq!(
        &calls[7][..7],
        [
            "exec",
            "--interactive",
            "--user",
            "root",
            "conductive-box",
            "/bin/sh",
            "-c"
        ]
    );
    assert_eq!(calls[7].len(), 8);
    assert!(calls[7][7].contains("/run/ascii-secrets/env.sh"));
    assert_eq!(calls[8], ["stop", "--time", "30", "conductive-box"]);
    assert_eq!(
        calls[9],
        ["rm", "--force", "--volumes", "--ignore", "conductive-box"]
    );
    assert_eq!(
        calls[10],
        ["commit", "--pause=true", "conductive-box", IMAGE]
    );
    assert_eq!(calls[14], ["load", "--input", archive.to_str().unwrap()]);
    assert_eq!(
        calls[15],
        [
            "image",
            "inspect",
            "--format",
            "{{.Id}}",
            "--",
            "localhost/signed-image:fixture"
        ]
    );
    assert_eq!(calls[16], ["tag", "localhost/signed-image:fixture", tag]);
    assert_eq!(calls[17], calls[14]);
    assert_eq!(calls[18], calls[15]);
    for call in &calls[19..] {
        assert_eq!(
            &call[..7],
            [
                "exec",
                "--interactive",
                "--user",
                "root",
                "conductive-box",
                "/bin/sh",
                "-c"
            ]
        );
    }
    assert_eq!(calls[19].len(), 8);
    assert!(calls[19][7].contains("/run/conductive-bootstrap/conductive"));
    assert_eq!(
        &calls[20][8..],
        [
            "conductive-bootstrap",
            &release.version,
            &release.digest,
            server.as_str()
        ]
    );
    assert!(
        calls[20][7]
            .contains(r#"update check --bootstrap --release "$1" --digest "$2" --server "$3""#)
    );
    assert!(calls[20][7].contains(r#""$program" update apply"#));
    assert!(calls[20][7].contains(
        r#"if [ "$(readlink -f /opt/conductive/current)" != "/opt/conductive/versions/$1" ]; then"#
    ));
    assert!(calls[20][7].contains("current/conductive update started"));
    assert!(calls[20][7].contains("systemctl restart conductive-host.service"));
    assert_eq!(
        fs::read(folder.join("program-input")).unwrap(),
        b"checked program"
    );
    assert!(!trace.contains("private body"));
    assert!(!trace.contains("NAME=private"));
    assert_eq!(fs::read(folder.join("env-input")).unwrap(), SECRET);
}
