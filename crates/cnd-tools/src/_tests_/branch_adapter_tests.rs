//! Branch defaults stay with the Worker and adapter replies retain their shapes.

#![expect(
    clippy::unwrap_used,
    reason = "Invalid test fixtures must fail the test"
)]

use serde_json::{Value, json};

use crate::ports::HttpResponse;

use super::branch_adapter_support::{created, input, mcp_result, run, success};

#[tokio::test]
async fn workspace_branch_options_preserve_each_default_in_both_adapters() {
    for mcp in [true, false] {
        for branches in [
            json!({}),
            json!({"startBranch":"develop"}),
            json!({"baseBranch":"develop"}),
            json!({"startBranch":"develop", "baseBranch":"main"}),
        ] {
            let fields = input(branches);
            let output = run(mcp, fields.clone(), Some(success())).await;
            assert_eq!(output.requests, vec![fields], "mcp: {mcp}");
            assert_eq!(output.status, 0);
            assert_eq!(output.stderr, Vec::<String>::new());
            let (actual, expected) = if mcp {
                let mut result = mcp_result(&output);
                result["content"][0]["text"] =
                    serde_json::from_str(result["content"][0]["text"].as_str().unwrap()).unwrap();
                (
                    result,
                    json!({
                        "isError":false, "structuredContent":created(),
                        "content":[{"type":"text", "text":created()}]
                    }),
                )
            } else {
                (
                    serde_json::from_str::<Value>(&output.stdout[0]).unwrap(),
                    created(),
                )
            };
            assert_eq!(output.stdout.len(), 1 + usize::from(mcp));
            assert_eq!(actual, expected);
        }
    }
}

#[tokio::test]
async fn workspace_branch_strings_reach_worker_unchanged_on_replay() {
    for mcp in [true, false] {
        for branches in [
            json!({"startBranch":"develop", "baseBranch":"release/next"}),
            json!({"startBranch":"", "baseBranch":"*"}),
            json!({"startBranch":"  develop  ", "baseBranch":"feature/it's-$(touch${IFS}injected)"}),
        ] {
            let fields = input(branches);
            let output = run(mcp, fields.clone(), Some(success())).await;
            assert_eq!(output.requests, vec![fields], "mcp: {mcp}");
            assert_eq!(output.status, 0);
            let value = if mcp {
                mcp_result(&output)["structuredContent"].clone()
            } else {
                serde_json::from_str::<Value>(&output.stdout[0]).unwrap()
            };
            assert_eq!(value, created());
        }
    }
}

#[tokio::test]
async fn missing_workspace_branch_preserves_worker_refusal_in_both_adapters() {
    let message = "branch_not_found: The branch `gone` is no longer on GitHub.";
    for mcp in [true, false] {
        let fields = input(json!({"startBranch":"gone"}));
        let response = HttpResponse {
            status: 404,
            body: json!({"error":{"code":"branch_not_found", "message":"The branch `gone` is no longer on GitHub."}}).to_string(),
        };
        let output = run(mcp, fields.clone(), Some(response)).await;
        assert_eq!(output.requests, vec![fields]);
        assert_eq!(output.status, u8::from(!mcp));
        let expected_errors = if mcp {
            vec![]
        } else {
            vec![format!("{message}\n")]
        };
        assert_eq!(output.stderr, expected_errors);
        let (actual, expected) = if mcp {
            (
                mcp_result(&output),
                json!({
                    "isError":true, "content":[{"type":"text", "text":message}]
                }),
            )
        } else {
            (json!(output.stdout), json!([]))
        };
        assert_eq!(actual, expected);
    }
}

#[tokio::test]
async fn non_string_workspace_branches_never_reach_worker() {
    for key in ["startBranch", "baseBranch"] {
        for value in [Value::Null, json!(false), json!(7), json!([]), json!({})] {
            let mut fields = input(json!({}));
            fields[key] = value;
            let output = run(true, fields, None).await;
            assert_eq!(output.status, 0);
            assert_eq!(output.requests, Vec::<Value>::new());
            assert_eq!(
                mcp_result(&output),
                json!({
                    "isError":true,
                    "content":[{"type":"text", "text":"Use a Git branch name for each branch."}]
                })
            );
        }
    }
}
