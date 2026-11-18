//! Invalid granted payloads never reach a child or expose raw Worker data.

use serde_json::{Value, json};
use unimock::Unimock;

use crate::error::Result;

use super::support::{Adapter, allowed, http, run};

#[tokio::test]
async fn malformed_secret_replies_never_run_or_expose_the_worker_body() -> Result<()> {
    let mut missing_value = allowed();
    missing_value["values"] = json!({"TOKEN":"child-value"});
    let mut extra_value = allowed();
    extra_value["values"]["UNREQUESTED"] = json!("child-value");
    let mut missing_grant = allowed();
    missing_grant["grants"] = json!([]);
    let mut invalid_grant = allowed();
    invalid_grant["grants"][0]["grant"] = json!("unknown");
    let mut nonstring_value = allowed();
    nonstring_value["values"]["TOKEN"] = json!(7);
    for body in [
        missing_value,
        extra_value,
        missing_grant,
        invalid_grant,
        nonstring_value,
        json!({"status":"other","values":{"TOKEN":"child-value"}}),
        json!({"status":"pending","requestId":"request"}),
    ] {
        let observed = run(
            Adapter::Mcp,
            &[],
            "run_with_secrets",
            json!({"names":["TOKEN","KEY"],"command":"true"}),
            http(body),
            Unimock::new(()),
        )
        .await?;
        assert_eq!(
            observed.result()?,
            json!({"isError":true,"content":[{"type":"text","text":"The workspace reply is not valid. Try again."}]})
        );
        assert!(!observed.stdout.contains("child-value"));
    }
    for body in [
        json!({"secrets":[{"name":"TOKEN","description":""}]}),
        json!({"secrets":[{"name":"TOKEN","description":"","available":"yes"}]}),
    ] {
        let observed = run(
            Adapter::CliError,
            &["secrets", "list"],
            "list_secrets",
            Value::Null,
            http(body),
            Unimock::new(()),
        )
        .await?;
        assert_eq!(
            (
                observed.status,
                observed.stdout.as_str(),
                observed.stderr.as_str()
            ),
            (1, "", "The workspace reply is not valid. Try again.\n")
        );
    }
    Ok(())
}
