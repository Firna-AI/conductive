//! Agent preview replies stay readable by older `conductive` programs.

use cnd_runner_interface::api::Timestamp;
use cnd_runner_interface::tools::previews::{AgentPreview, Preview};

#[test]
fn older_programs_read_an_agent_preview_as_a_preview_with_the_app_page() -> serde_json::Result<()> {
    let link = "https://app.conductive.build/orgs/o/workspaces/w/preview/p".to_string();
    let reply = AgentPreview {
        id: "p".into(),
        port: 4310,
        link: link.clone(),
        url: link.clone(),
        expires_at: Timestamp(1_794_922_296_815),
    };
    let value = serde_json::to_value(&reply)?;
    // Before `AgentPreview`, the agent replies used `Preview`, so an older
    // program reads each reply preview with that type.
    let older: Preview = serde_json::from_value(value)?;
    assert_eq!(older.id, "p");
    assert_eq!(older.port, 4310);
    assert_eq!(older.url, link);
    assert_eq!(older.expires_at, Timestamp(1_794_922_296_815));
    Ok(())
}
