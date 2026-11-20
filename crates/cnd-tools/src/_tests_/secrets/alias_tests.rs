//! Public tool execution checks alias ownership before requesting any values.

use std::collections::BTreeMap;

use serde_json::json;
use unimock::{MockFn, Unimock, matching};

use cnd_runner_interface::tools::secret_results::CommandResult;

use crate::error::{ErrorResultExt, Result};
use crate::process::ProcessMock;

use super::support::{Adapter, http, run};

#[tokio::test]
async fn aliases_and_representable_original_names_share_one_checked_environment() -> Result<()> {
    let values = json!({"Cloudflare (read-only)":"cloud-value","aMixed":"case-value","9key":"digit-value","A=B":"equals-value","A\0C":"nul-value"});
    let process = Unimock::new(ProcessMock::run.some_call(matching!(_, _)).answers(
        &|_, _, values| {
            assert_eq!(
                values,
                BTreeMap::from([
                    ("Cloudflare (read-only)".into(), "cloud-value".into()),
                    ("CLOUDFLARE_READ_ONLY".into(), "cloud-value".into()),
                    ("aMixed".into(), "case-value".into()),
                    ("9key".into(), "digit-value".into()),
                    ("_9KEY".into(), "digit-value".into()),
                    ("A_B".into(), "equals-value".into()),
                    ("A_C".into(), "nul-value".into()),
                ])
            );
            Ok(CommandResult {
                stdout: String::new(),
                stderr: String::new(),
                exit_code: 0,
            })
        },
    ));
    let observed = run(Adapter::Mcp, &[], "run_with_secrets",
        json!({"names":["Cloudflare (read-only)","aMixed","9key","A=B","A\0C"],"command":"true"}),
        http(json!({"status":"allowed","values":values,"grants":[
            {"name":"Cloudflare (read-only)","grant":"session"}, {"name":"aMixed","grant":"session"},
            {"name":"9key","grant":"15-minutes"}, {"name":"A=B","grant":"workspace-value"},
            {"name":"A\0C","grant":"workspace-value"}
        ]})), process).await?;
    assert_eq!(
        observed.result()?["structuredContent"]["environmentVariables"],
        json!({"Cloudflare (read-only)":"CLOUDFLARE_READ_ONLY","aMixed":"aMixed","9key":"_9KEY","A=B":"A_B","A\0C":"A_C"})
    );
    let process = Unimock::new(ProcessMock::run.some_call(matching!(_, _)).answers(
        &|_, _, values| {
            assert_eq!(
                values,
                BTreeMap::from([
                    ("A\nD".into(), "newline-value".into()),
                    ("A_D".into(), "newline-value".into()),
                ])
            );
            Ok(CommandResult {
                stdout: String::new(),
                stderr: String::new(),
                exit_code: 0,
            })
        },
    ));
    let observed = run(
        Adapter::CliError,
        &["secrets", "run", "--secret", "A\nD", "--", "true"],
        "run_with_secrets", json!({}),
        http(json!({"status":"allowed","values":{"A\nD":"newline-value"},"grants":[{"name":"A\nD","grant":"workspace-value"}]})),
        process,
    ).await?;
    assert_eq!(observed.status, 0);
    assert_eq!(observed.stdout, "");
    assert_eq!(
        observed.stderr,
        "environmentVariables: {\"A\\nD\":\"A_D\"}\n"
    );
    Ok(())
}

#[tokio::test]
async fn conflicting_names_are_escaped_and_refused_before_http_or_execution() -> Result<()> {
    for (names, variable) in [
        (["A-B", "A_B"], "A_B"),
        (["9key", "9KEY"], "_9KEY"),
        (["9key", "_9KEY"], "_9KEY"),
        (["...", "全"], "SECRET"),
        (["A\nB", "A_B"], "A_B"),
    ] {
        for mcp in [true, false] {
            let observed = run(
                if mcp { Adapter::Mcp } else { Adapter::CliError },
                &[
                    "secrets", "run", "--secret", names[0], "--secret", names[1], "--", "true",
                ],
                "run_with_secrets",
                json!({"names":names,"command":"true"}),
                Unimock::new(()),
                Unimock::new(()),
            )
            .await?;
            let message = format!(
                "Secrets {} and {} need the same variable \"{variable}\". Run them separately.",
                serde_json::to_string(names[0]).internal()?,
                serde_json::to_string(names[1]).internal()?
            );
            let actual = if mcp {
                observed.result()?
            } else {
                json!({"status":observed.status,"stdout":observed.stdout,"stderr":observed.stderr})
            };
            let expected = if mcp {
                json!({"isError":true,"content":[{"type":"text","text":message}]})
            } else {
                json!({"status":1,"stdout":"","stderr":format!("{message}\n")})
            };
            assert_eq!(actual, expected);
        }
    }
    Ok(())
}
