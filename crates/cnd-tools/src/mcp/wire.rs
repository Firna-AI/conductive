//! JSON-RPC envelopes and typed MCP result bodies.

use serde::{Deserialize, Serialize};
use serde_json::Number;

use crate::reply::Reply;
use crate::schema::Descriptor;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub(super) enum Id {
    Text(String),
    Number(Number),
}

#[derive(Serialize)]
pub(crate) struct Response {
    jsonrpc: &'static str,
    id: Option<Id>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Success>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<RpcError>,
}

#[derive(Serialize)]
struct RpcError {
    code: i32,
    message: &'static str,
}

#[derive(Serialize)]
#[serde(untagged)]
pub(super) enum Success {
    Initialize(Initialized),
    Empty(Empty),
    Tools { tools: Vec<Descriptor> },
    Tool(Box<ToolResult>),
}
#[derive(Serialize)]
pub(super) struct Empty {}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Initialized {
    pub(super) protocol_version: &'static str,
    pub(super) capabilities: Capabilities,
    pub(super) server_info: Info,
}
#[derive(Serialize)]
pub(super) struct Capabilities {
    pub(super) tools: Empty,
}
#[derive(Serialize)]
pub(super) struct Info {
    pub(super) name: &'static str,
    pub(super) version: &'static str,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ToolResult {
    content: Vec<Text>,
    #[serde(skip_serializing_if = "Option::is_none")]
    structured_content: Option<Reply>,
    is_error: bool,
}
#[derive(Serialize)]
struct Text {
    #[serde(rename = "type")]
    kind: &'static str,
    text: String,
}

impl Response {
    pub(super) fn error(id: Option<Id>, code: i32, message: &'static str) -> Self {
        Self {
            jsonrpc: "2.0",
            id,
            result: None,
            error: Some(RpcError { code, message }),
        }
    }
    pub(super) fn success(id: Id, result: Success) -> Self {
        Self {
            jsonrpc: "2.0",
            id: Some(id),
            result: Some(result),
            error: None,
        }
    }
    pub(crate) fn tool(id: Id, reply: Reply) -> Self {
        let text = match serde_json::to_string(&reply) {
            Ok(text) => text,
            Err(_) => return Self::error(Some(id), -32603, "The request failed."),
        };
        Self::success(
            id,
            Success::Tool(Box::new(ToolResult {
                content: vec![Text { kind: "text", text }],
                is_error: reply.failed(),
                structured_content: Some(reply),
            })),
        )
    }
    pub(crate) fn tool_error(id: Id, message: String) -> Self {
        Self::success(
            id,
            Success::Tool(Box::new(ToolResult {
                content: vec![Text {
                    kind: "text",
                    text: message,
                }],
                structured_content: None,
                is_error: true,
            })),
        )
    }
}
