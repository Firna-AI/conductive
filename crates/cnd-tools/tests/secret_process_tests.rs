//! Native child execution verifies environment isolation and filtered command results.

use std::collections::BTreeMap;

use cnd_tools::error::Result;
use cnd_tools::process::{CommandInput, NativeProcess, Process};

#[tokio::test]
async fn child_gets_values_only_in_its_environment_and_returns_filtered_streams() -> Result<()> {
    let inherited_path = std::env::var_os("PATH");
    let name = "CND_TOOLS_SECRET_PROCESS_TEST_VALUE";
    assert_eq!(std::env::var_os(name), None);
    let process: Box<dyn Process> = Box::new(NativeProcess);
    let result = process
        .run(
            CommandInput::Capture(
                "test \"$PATH\" = \"$CND_TOOLS_SECRET_PROCESS_TEST_VALUE\" || exit 92; case \"$0 $*\" in *\"$CND_TOOLS_SECRET_PROCESS_TEST_VALUE\"*) exit 91;; esac\n\
             printf 'out:%s\\n' \"$CND_TOOLS_SECRET_PROCESS_TEST_VALUE\"\n\
             printf 'err:%s\\n' \"$CND_TOOLS_SECRET_PROCESS_TEST_VALUE\" >&2\n\
             exit 7"
                    .into(),
            ),
            BTreeMap::from([(name.into(), "value-only-in-child-482".into()), ("PATH".into(), "value-only-in-child-482".into())]),
        )
        .await?;
    assert_eq!(result.stdout, "out:[redacted]\n");
    assert_eq!(result.stderr, "err:[redacted]\n");
    assert_eq!(result.exit_code, 7);
    assert_eq!(std::env::var_os("PATH"), inherited_path);
    assert_eq!(std::env::var_os(name), None);
    Ok(())
}

#[tokio::test]
async fn child_signal_becomes_a_shell_exit_status() -> Result<()> {
    let process: Box<dyn Process> = Box::new(NativeProcess);
    let result = process
        .run(
            CommandInput::Capture("kill -TERM $$".into()),
            BTreeMap::new(),
        )
        .await?;
    assert_eq!(
        (
            result.exit_code,
            result.stdout.as_str(),
            result.stderr.as_str()
        ),
        (143, "", "")
    );
    Ok(())
}
