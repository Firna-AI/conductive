//! Workspace tool commands and the stdio MCP server.

mod call;
pub mod cli;
mod cli_parse;
mod cli_secrets;
pub mod client;
pub mod environment;
pub mod error;
mod input;
mod lazy_client;
pub mod mcp;
pub mod ports;
pub mod process;
mod reply;
mod reply_validation;
mod request;
pub mod runtime;
mod schema;
mod secrets;
pub mod services;
