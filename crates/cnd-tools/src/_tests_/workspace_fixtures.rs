//! Parent-aware workspace replies used through both real tool adapters.

#![allow(clippy::unwrap_used)]

use serde_json::{Value, json};

pub(super) struct Case {
    pub(super) name: &'static str,
    pub(super) cli: Vec<&'static str>,
    pub(super) fields: Value,
    pub(super) reply: Value,
    pub(super) path: &'static str,
    pub(super) body: Option<Value>,
}

fn entry(id: &str, parent: Value) -> Value {
    json!({
        "id":id, "number":1, "link":format!("https://app.test/orgs/org/workspaces/{id}"),
        "name":"Task", "branch":"member/task", "state":"ready", "parentId":parent,
        "owner":{"id":"member", "githubLogin":"member", "displayName":null}
    })
}

fn detail() -> Value {
    let mut detail = entry("workspace", json!("parent"));
    let fields = detail.as_object_mut().unwrap();
    fields.extend(
        json!({
            "parent":entry("parent", Value::Null), "depth":1,
            "children":[entry("child", json!("workspace"))],
            "repository":{"id":"repo", "fullName":"org/repo", "defaultBranch":"main"},
            "baseBranch":"main", "section":{"id":"section", "name":"General"},
            "createdAt":1, "lastActivityAt":2, "archivedAt":null, "restoreUntil":null
        })
        .as_object()
        .unwrap()
        .clone(),
    );
    detail
}

fn created() -> Value {
    json!({
        "workspace":{
            "id":"workspace", "number":1, "link":"https://app.test/orgs/org/workspaces/workspace",
            "orgId":"org", "repositoryId":"repo", "sectionId":"section", "parentId":"parent",
            "owner":{"id":"member", "githubLogin":"member", "displayName":null, "avatarUrl":null},
            "name":"Task", "branch":"member/task", "choice":{"agent":"codex", "model":"model", "effort":"high", "fast":false},
            "state":"ready", "github":null, "createdAt":1, "updatedAt":2, "archivedAt":null, "restoreUntil":null
        },
        "sessionId":"session", "sessionLink":"https://app.test/orgs/org/workspaces/workspace/sessions/session",
        "notice":"The workspace joined the section of its parent."
    })
}

pub(super) fn cases() -> Vec<Case> {
    let mut detached = detail();
    detached["parentId"] = Value::Null;
    detached["parent"] = Value::Null;
    detached["depth"] = json!(0);
    vec![
        Case {
            name: "create_workspace",
            cli: vec![
                "workspaces",
                "create",
                "--repository",
                "repo",
                "--message",
                "Work",
                "--parent",
                "parent",
                "--section",
                "section",
            ],
            fields: json!({"repositoryId":"repo", "firstMessage":"Work", "parentId":"parent", "sectionId":"section"}),
            reply: created(),
            path: "/v1/tools/workspaces",
            body: Some(
                json!({"repositoryId":"repo", "firstMessage":"Work", "parentId":"parent", "sectionId":"section", "requestId":"retry"}),
            ),
        },
        Case {
            name: "list_workspaces",
            cli: vec!["workspaces", "list", "--parent=parent", "--owner", "member"],
            fields: json!({"parentId":"parent", "ownerId":"member"}),
            reply: json!({"workspaces":[entry("workspace", json!("parent"))]}),
            path: "/v1/tools/workspaces?ownerId=member&parentId=parent",
            body: None,
        },
        Case {
            name: "get_workspace",
            cli: vec!["workspaces", "get"],
            fields: json!({}),
            reply: json!({"workspace":detail()}),
            path: "/v1/tools/workspaces/current",
            body: None,
        },
        Case {
            name: "move_workspace",
            cli: vec!["workspaces", "move", "--section", "section"],
            fields: json!({"sectionId":"section"}),
            reply: json!({"workspace":detail(), "notice":"Move W-1 instead."}),
            path: "/v1/tools/workspaces/current/move",
            body: Some(json!({"sectionId":"section"})),
        },
        Case {
            name: "move_workspace",
            cli: vec![
                "workspaces",
                "move",
                "--parent",
                "parent",
                "--section",
                "section",
            ],
            fields: json!({"parentId":"parent", "sectionId":"section"}),
            reply: json!({"workspace":detail(), "notice":"The workspace joined the section of its parent."}),
            path: "/v1/tools/workspaces/current/move",
            body: Some(json!({"parentId":"parent", "sectionId":"section"})),
        },
        Case {
            name: "move_workspace",
            cli: vec![
                "workspaces",
                "move",
                "--workspace",
                "workspace",
                "--top-level",
            ],
            fields: json!({"workspaceId":"workspace", "topLevel":true}),
            reply: json!({"workspace":detached}),
            path: "/v1/tools/workspaces/workspace/move",
            body: Some(json!({"topLevel":true})),
        },
    ]
}
