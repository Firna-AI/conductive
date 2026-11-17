//! The removal time of a workspace reply, which is required and nullable.

use serde_json::{Map, Value, json};

use crate::call::Name;
use crate::client::Dispatch;
use crate::error::{Error, ErrorResultExt, Result};
use crate::input;

use super::fixtures::{client, response, workspace};

/// A get_workspace reply for an archived workspace, with `removed_at` as
/// its removal time, or with no removal time when it is `None`.
fn detail(removed_at: Option<Value>) -> Value {
    let mut item = workspace();
    item["state"] = json!("archived");
    item["parentId"] = Value::Null;
    item["parent"] = Value::Null;
    item["depth"] = json!(0);
    item["children"] = json!([]);
    item["owner"] = json!({"id":"owner", "githubLogin":"owner-login", "displayName":null});
    item["repository"] =
        json!({"id":"repo", "fullName":"example/repository", "defaultBranch":"main"});
    item["baseBranch"] = json!("main");
    item["section"] = json!({"id":"general", "name":"General"});
    item["createdAt"] = json!(0);
    item["lastActivityAt"] = json!(0);
    item["archivedAt"] = json!(0);
    item["restoreUntil"] = Value::Null;
    if let Some(value) = removed_at {
        item["removedAt"] = value;
    }
    json!({"workspace":item})
}

#[tokio::test]
async fn reads_nullable_removal_times_and_rejects_malformed_ones() -> Result<()> {
    for removed_at in [Value::Null, json!(1_209_600_000)] {
        let raw = detail(Some(removed_at.clone()));
        let call = input::parse(Name::GetWorkspace, &Map::new(), "retry").internal()?;
        let reply = client(Ok(response(raw.clone())))?.execute(call).await?;
        assert_eq!(serde_json::to_value(reply).internal()?, raw, "{removed_at}");
    }
    for removed_at in [None, Some(json!("1209600000")), Some(json!(false))] {
        let call = input::parse(Name::GetWorkspace, &Map::new(), "retry").internal()?;
        let result = client(Ok(response(detail(removed_at.clone()))))?
            .execute(call)
            .await;
        assert!(
            matches!(result, Err(Error::Reply { mac: false })),
            "{removed_at:?}"
        );
    }
    Ok(())
}
