//! A real POSIX shell loads the rendered env file and preserves literal values.

#![expect(
    clippy::unwrap_used,
    reason = "Shell fixture failures must fail the test."
)]

use std::io::Write;
use std::process::Command;

use cnd_computer::operations::environment::render;
use cnd_runner_interface::computer::operations::ContainerEnvVar;

#[test]
fn sourcing_preserves_quotes_newlines_and_command_substitution_text() {
    let sample = "two 'quotes' and \"double quotes\"\n\n$(printf transformed)\n";
    let env = [
        ContainerEnvVar {
            name: "SAMPLE".into(),
            value: sample.into(),
        },
        ContainerEnvVar {
            name: "APP.CONFIG".into(),
            value: "bad name".into(),
        },
        ContainerEnvVar {
            name: "NEXT".into(),
            value: "after".into(),
        },
    ];
    let (contents, _) = render(&env);
    let mut file = tempfile::NamedTempFile::new().unwrap();
    file.write_all(&contents).unwrap();
    let output = Command::new("/bin/sh")
        .env_clear()
        .args([
            "-ec",
            r#". "$1"; printf '%s\0' "$SAMPLE" "$NEXT""#,
            "load-env",
        ])
        .arg(file.path())
        .output()
        .unwrap();
    assert!(output.status.success(), "{:?}", output.stderr);
    assert_eq!(output.stdout, format!("{sample}\0after\0").as_bytes());
}
