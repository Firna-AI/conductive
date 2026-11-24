//! Debug output of computer operations.

use super::{ComputerOperation, ContainerEnvVar};

#[test]
fn operation_debug_redacts_environment_values() {
    let value = "private-fixture-value";
    let operation = ComputerOperation::ContainerStart {
        container: "workspace-1".into(),
        env: vec![ContainerEnvVar {
            name: "WORKSPACE_TOKEN".into(),
            value: value.into(),
        }],
    };

    let debug = format!("{operation:?}");
    assert!(debug.contains("WORKSPACE_TOKEN"));
    assert!(
        !debug.contains(value),
        "debug output exposed a container environment value"
    );
    assert!(debug.contains("<redacted>"));
}
