//! Environment values are quoted, and a non-shell name cannot stop later exports.

use cnd_runner_interface::computer::operations::ContainerEnvVar;

use super::render;

#[test]
fn renders_shell_assignments_and_counts_skipped_names() {
    let vars = [
        ContainerEnvVar {
            name: "APP_CONFIG".into(),
            value: "'\n$(id)".into(),
        },
        ContainerEnvVar {
            name: "APP.CONFIG".into(),
            value: "ignored".into(),
        },
        ContainerEnvVar {
            name: "_LAST_2".into(),
            value: "".into(),
        },
    ];
    let (text, omitted) = render(&vars);
    assert_eq!(omitted, 1);
    assert_eq!(
        text,
        b"export 'APP_CONFIG='\"'\"'\n$(id)'\nexport '_LAST_2='\n"
    );
}
