//! Complete-source display filtering leaves operational identities and file data intact.

use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_files::RunnerFileResponse;
use serde_json::json;

use crate::filter::service::{CredentialFilter, Credentials};
use crate::reports::prepare::ReportFilter;

type TestResult = Result<(), Box<dyn std::error::Error>>;

#[test]
fn filters_reports_tools_errors_and_labels_without_changing_metadata() -> TestResult {
    let filter = CredentialFilter::default();
    filter.add("secret".into())?;
    filter.add("head-abcdefghijklmnopqrstuvwxyz-tail".into())?;
    let sources = [
        json!({"type":"workspace.title","name":"abcdefghijklmnopqrstu title secret"}),
        json!({"type":"start.updated","start":{"kind":"create","startedAt":90,"steps":[{"id":"secret-id","label":"secret step bcdefghijklmnopqrstuv","state":"failed","startedAt":90,"completedAt":100}]}}),
        json!({"type":"ports.updated","ports":[{"port":3000,"name":"secret app","folder":"secret folder"}]}),
        json!({"type":"tool.updated","sessionId":"secret-session","turnId":"secret-turn","tool":{"id":"secret-tool","kind":"read","target":"secret.txt","detail":"secret body","omittedDetailBytes":12,"state":"done"}}),
        json!({"type":"turn.failed","sessionId":"secret-session","turnId":"secret-turn","error":{"code":"secret-code","message":"secret error"},"retryMessageId":"secret-message","durationMs":125}),
        json!({"type":"files.snapshot","tree":{"revision":1,"partNumber":1,"partCount":1,"entries":[{"path":"secret-abcdefghijklmnopqrstu.txt","name":"secret-abcdefghijklmnopqrstu.txt","kind":"file","change":"untracked"}]}}),
        json!({"type":"changes.changed","delta":{"revision":2,"baseBranch":"secret-base","summary":{"files":1,"added":0,"removed":0},"omitted":{"files":0,"added":0,"removed":0},"removes":["gone-secret.txt"],"upserts":[{"index":0,"file":{"path":"secret.txt","previousPath":"old-secret.txt","change":"renamed","added":0,"removed":0,"uncommitted":true}}]}}),
    ];
    let mut expected = sources.clone();
    expected[0]["name"] = json!("[redacted] title [redacted]");
    expected[1]["start"]["steps"][0]["label"] = json!("[redacted] step [redacted]");
    expected[2]["ports"][0]["name"] = json!("[redacted] app");
    expected[2]["ports"][0]["folder"] = json!("[redacted] folder");
    expected[3]["tool"]["target"] = json!("[redacted].txt");
    expected[3]["tool"]["detail"] = json!("[redacted] body");
    expected[4]["error"]["message"] = json!("[redacted] error");
    expected[5]["tree"]["entries"][0]["displayPath"] = json!("[redacted][redacted].txt");
    expected[5]["tree"]["entries"][0]["name"] = json!("[redacted][redacted].txt");
    expected[6]["delta"]["displayBaseBranch"] = json!("[redacted]-base");
    expected[6]["delta"]["upserts"][0]["file"]["displayPath"] = json!("[redacted].txt");
    expected[6]["delta"]["upserts"][0]["file"]["previousDisplayPath"] = json!("old-[redacted].txt");
    for (source, expected) in sources.iter().zip(&expected) {
        let event: RunnerEvent = serde_json::from_value(source.clone())?;
        assert_eq!(&serde_json::to_value(filter.report(event)?)?, expected);
    }
    assert_eq!(
        serde_json::to_value(filter.file_report(serde_json::from_value(sources[5].clone())?)?)?,
        expected[5]
    );
    Ok(())
}

#[test]
fn filters_file_and_diff_labels_without_rewriting_contents_paths_or_branches() -> TestResult {
    let filter = CredentialFilter::default();
    filter.add("secret".into())?;
    filter.add("head-abcdefghijklmnopqrstuvwxyz-tail".into())?;
    let source = json!({"type":"file.read.result","requestId":"read","result":{"ok":true,"file":{"path":"secret.txt","content":"secret bytes","encoding":"utf-8","sizeBytes":12,"mediaType":"text/plain"}}});
    let response: RunnerFileResponse = serde_json::from_value(source.clone())?;
    let mut expected = source;
    expected["result"]["file"]["displayPath"] = json!("[redacted].txt");
    assert_eq!(serde_json::to_value(filter.response(response)?)?, expected);
    let source = json!({"type":"file.diff.result","requestId":"diff","result":{"ok":true,"diff":{"path":"abcdefghijklmnopqrstu.txt","baseBranch":"secret-bcdefghijklmnopqrstuv","oldContent":"secret abcdefghijklmnopqrstu","newContent":"bcdefghijklmnopqrstuv","patch":"secret abcdefghijklmnopqrstu","binary":false}}});
    let response: RunnerFileResponse = serde_json::from_value(source.clone())?;
    let mut expected = source;
    expected["result"]["diff"]["displayPath"] = json!("[redacted].txt");
    expected["result"]["diff"]["displayBaseBranch"] = json!("[redacted]-[redacted]");
    assert_eq!(serde_json::to_value(filter.response(response)?)?, expected);
    Ok(())
}
