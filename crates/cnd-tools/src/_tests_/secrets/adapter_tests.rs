//! Both adapters preserve metadata, execute only grants, and keep refusal details.

use std::collections::BTreeMap;

use serde_json::{Value, json};
use unimock::{MockFn, Unimock, matching};

use crate::error::{ErrorResultExt, Result};
use crate::ports::{HttpMock, HttpResponse};
use crate::process::{CommandInput, CommandResult, ProcessMock};

use super::support::{Adapter, allowed, http, run};

#[tokio::test]
async fn secret_list_in_both_adapters_removes_values_and_unknown_fields() -> Result<()> {
    for mcp in [false, true] {
        let raw = json!({"secrets":[{"name":"TOKEN","description":"Deploy","available":true,"value":"never-return-this"}],"values":{"TOKEN":"never-return-this"}});
        let observed = run(
            if mcp {
                Adapter::Mcp
            } else {
                Adapter::CliOutput
            },
            &["secrets", "list"],
            "list_secrets",
            json!({}),
            http(raw),
            Unimock::new(()),
        )
        .await?;
        assert_eq!(observed.status, 0);
        assert_eq!(observed.stderr, "");
        assert!(!observed.stdout.contains("never-return-this"));
        let result = observed.result()?;
        let expected =
            json!({"secrets":[{"name":"TOKEN","description":"Deploy","available":true}]});
        let expected = if mcp {
            json!({"content":[{"type":"text","text":expected.clone()}],"structuredContent":expected,"isError":false})
        } else {
            expected
        };
        assert_eq!(result, expected);
    }
    Ok(())
}

#[tokio::test]
async fn allowed_runs_send_context_and_put_values_only_in_the_process_environment() -> Result<()> {
    for (mcp, exit_code) in [(false, 0), (false, 7), (true, 0), (true, 7)] {
        let http = Unimock::new(HttpMock::send.some_call(matching!(_)).answers(&|_, request| {
            assert_eq!(request.url, "https://machine.test/v1/tools/secrets/run");
            assert_eq!(request.token, "workspace-token");
            assert_eq!(request.turn_id.as_deref(), Some("active-turn"));
            assert_eq!(request.body.as_deref().map(serde_json::from_str::<Value>).transpose().internal()?,
                Some(json!({"names":["TOKEN","KEY"],"command":"printf %s '$TOKEN'","reason":"  Deploy\nnow  "})));
            Ok(HttpResponse { status: 200, body: allowed().to_string() })
        }));
        let process = Unimock::new(ProcessMock::run.some_call(matching!(_, _)).answers_arc(
            std::sync::Arc::new(move |_, command, values| {
                assert_eq!(
                    values,
                    BTreeMap::from([
                        ("TOKEN".into(), "child-value".into()),
                        ("KEY".into(), "second-value".into())
                    ])
                );
                let (captured, arguments) = match command {
                    CommandInput::Capture(text) => (true, vec![text]),
                    CommandInput::Inherit(arguments) => (false, arguments),
                };
                let expected = if mcp {
                    vec!["printf %s '$TOKEN'".into()]
                } else {
                    vec!["printf".into(), "%s".into(), "$TOKEN".into()]
                };
                assert_eq!((captured, arguments), (mcp, expected));
                Ok(CommandResult {
                    stdout: "[redacted]".into(),
                    stderr: "safe error".into(),
                    exit_code,
                })
            }),
        ));
        let observed = run(if mcp { Adapter::Mcp } else { Adapter::CliSilent },
            &["secrets","run","--secret","TOKEN","--secret=KEY","--reason","  Deploy\nnow  ","--","printf","%s","$TOKEN"],
            "run_with_secrets", json!({"names":["TOKEN","KEY"],"command":"printf %s '$TOKEN'","reason":"  Deploy\nnow  "}), http, process).await?;
        assert_eq!(observed.stderr, "");
        assert!(!observed.stdout.contains("child-value"));
        assert!(!observed.stdout.contains("second-value"));
        assert_eq!(observed.status, if mcp { 0 } else { exit_code });
        let result = if mcp { observed.result()? } else { Value::Null };
        let completed = json!({"status":"completed","stdout":"[redacted]","stderr":"safe error","exitCode":exit_code});
        let expected = if mcp {
            json!({"content":[{"type":"text","text":completed.clone()}],"structuredContent":completed,"isError":exit_code != 0})
        } else {
            Value::Null
        };
        assert_eq!(result, expected);
        assert!(mcp || observed.stdout.is_empty());
    }
    Ok(())
}

#[tokio::test]
async fn every_non_allowed_status_keeps_its_message_and_never_runs_a_command() -> Result<()> {
    for status in ["pending", "denied", "not-answered"] {
        for mcp in [false, true] {
            let response = json!({"status":status,"requestId":"request","message":"The command did not run.","values":{"TOKEN":"never-return-this"}});
            let observed = run(
                if mcp { Adapter::Mcp } else { Adapter::CliError },
                &["secrets", "run", "--secret", "TOKEN", "--", "true"],
                "run_with_secrets",
                json!({"names":["TOKEN"],"command":"true"}),
                http(response),
                Unimock::new(()),
            )
            .await?;
            assert!(!observed.stdout.contains("never-return-this"));
            let result = if mcp { observed.result()? } else { Value::Null };
            let payload =
                json!({"status":status,"requestId":"request","message":"The command did not run."});
            let expected = if mcp {
                json!({"content":[{"type":"text","text":payload.clone()}],"structuredContent":payload,"isError":true})
            } else {
                Value::Null
            };
            assert_eq!(result, expected);
            assert_eq!(observed.status, if mcp { 0 } else { 1 });
            assert_eq!(
                observed.stderr,
                if mcp {
                    ""
                } else {
                    "The command did not run.\n"
                }
            );
            assert!(mcp || observed.stdout.is_empty());
        }
    }
    Ok(())
}

#[tokio::test]
async fn secret_refusals_keep_worker_codes_and_messages_in_both_adapters() -> Result<()> {
    for mcp in [false, true] {
        let http = Unimock::new(HttpMock::send.some_call(matching!(_)).returns(Ok(HttpResponse {
            status: 403, body: json!({"error":{"code":"calling_turn_required","message":"Start this request from an active agent turn."}}).to_string(),
        })));
        let observed = run(
            if mcp { Adapter::Mcp } else { Adapter::CliError },
            &["secrets", "run", "--secret", "TOKEN", "--", "true"],
            "run_with_secrets",
            json!({"names":["TOKEN"],"command":"true"}),
            http,
            Unimock::new(()),
        )
        .await?;
        let message = "calling_turn_required: Start this request from an active agent turn.";
        let result = if mcp { observed.result()? } else { Value::Null };
        let expected = if mcp {
            json!({"isError":true,"content":[{"type":"text","text":message}]})
        } else {
            Value::Null
        };
        assert_eq!(result, expected);
        assert_eq!(observed.status, if mcp { 0 } else { 1 });
        assert_eq!(
            observed.stderr,
            if mcp {
                String::new()
            } else {
                format!("{message}\n")
            }
        );
    }
    Ok(())
}
