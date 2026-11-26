//! Skill reports filter whole sources and keep repair receipts and private paths.

#![expect(
    clippy::unwrap_used,
    clippy::panic,
    reason = "Tests stop on setup failures and unexpected report variants."
)]

use std::sync::{Arc, Mutex};

use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::skills::{
    AgentSkill, HelperSkillLists, RunnerSkillsUpdated, SkillEntry, SkillInput,
};
use unimock::{MockFn, Unimock, matching};

use crate::emitter::{EventEmitter, EventEmitterMock};
use crate::error::Error;
use crate::filter::service::{CredentialFilter, Credentials};
use crate::skills::boundary::{SkillInputs, SkillReports, SkillScanner, SkillScannerMock};
use crate::skills::reporter::SkillReporter;

type Events = Arc<Mutex<Vec<(RunnerEvent, Option<String>)>>>;

struct Fixture {
    source: Arc<Mutex<Option<HelperSkillLists>>>,
    events: Events,
    reporter: SkillReporter,
}

fn entry(name: &str, description: &str) -> SkillEntry {
    SkillEntry {
        skill: AgentSkill {
            name: name.into(),
            description: description.into(),
            manual_only: None,
        },
        path: format!("/skills/{name}/SKILL.md"),
        org: None,
    }
}

impl Fixture {
    fn new(source: HelperSkillLists) -> Self {
        let source = Arc::new(Mutex::new(Some(source)));
        let events: Events = Arc::new(Mutex::new(vec![]));
        let read = source.clone();
        let write = events.clone();
        let scanner: Arc<dyn SkillScanner> = Arc::new(Unimock::new((
            SkillScannerMock::scan
                .each_call(matching!(_))
                .answers_arc(Arc::new(move |_, _| {
                    read.lock().unwrap().clone().ok_or(Error::HelperExited)
                })),
            SkillScannerMock::close.each_call(matching!()).returns(()),
        )));
        let emitter: Arc<dyn EventEmitter> = Arc::new(Unimock::new(
            EventEmitterMock::emit
                .each_call(matching!(_, _))
                .answers_arc(Arc::new(move |_, events, receipt| {
                    write
                        .lock()
                        .unwrap()
                        .extend(events.into_iter().map(|event| (event, receipt.clone())));
                    Ok(())
                })),
        ));
        let filter = Arc::new(CredentialFilter::default());
        filter.add("workspace-secret".into()).unwrap();
        Self {
            source,
            events,
            reporter: SkillReporter::new(scanner, emitter, filter),
        }
    }
}

#[tokio::test]
async fn filters_credentials_before_limits_and_preserves_first_unique_paths_and_manual_metadata() {
    let mut manual = entry("plans", "Write plans.");
    manual.skill.manual_only = Some(true);
    let h = Fixture::new(HelperSkillLists {
        claude: vec![
            entry("workspace-secret", "Private name."),
            entry("has space", "Unusable."),
            entry("deploy", &format!("{}workspace-secret", "x".repeat(4080))),
            manual,
        ],
        codex: vec![
            entry("review", "First description."),
            entry("review", "Later description."),
        ],
    });
    h.reporter.refresh(true, None).await.unwrap();
    {
        let events = h.events.lock().unwrap();
        let RunnerEvent::RunnerSkillsUpdated(RunnerSkillsUpdated::SkillsUpdated { claude, codex }) =
            &events[0].0
        else {
            panic!("wrong report");
        };
        assert_eq!(
            claude,
            &vec![
                AgentSkill {
                    name: "deploy".into(),
                    description: format!("{}[redacted]", "x".repeat(4080)),
                    manual_only: None,
                },
                AgentSkill {
                    name: "plans".into(),
                    description: "Write plans.".into(),
                    manual_only: Some(true)
                }
            ]
        );
        assert_eq!(codex, &vec![entry("review", "First description.").skill]);
        assert_eq!(
            h.reporter.current().unwrap(),
            vec![SkillInput {
                name: "review".into(),
                path: "/skills/review/SKILL.md".into()
            }]
        );
    }
    h.reporter.close().await;
}

#[tokio::test]
async fn sends_changed_lists_and_full_refreshes_with_receipts_and_keeps_last_list_on_scan_failure()
{
    let h = Fixture::new(HelperSkillLists::default());
    h.reporter.refresh(true, None).await.unwrap();
    h.reporter.refresh(false, None).await.unwrap();
    *h.source.lock().unwrap() = Some(HelperSkillLists {
        claude: vec![entry("plans", "Added.")],
        codex: vec![],
    });
    h.reporter.refresh(false, None).await.unwrap();
    *h.source.lock().unwrap() = None;
    h.reporter
        .refresh(true, Some("repair".into()))
        .await
        .unwrap();
    {
        let events = h.events.lock().unwrap();
        assert_eq!(events.len(), 3);
        assert_eq!(events[1].0, events[2].0);
        assert_eq!(events[2].1.as_deref(), Some("repair"));
    }
    h.reporter.close().await;
    h.reporter.refresh(true, None).await.unwrap();
    assert_eq!(h.events.lock().unwrap().len(), 3);
}

#[tokio::test]
async fn keeps_200_sorted_skills_and_whole_descriptions_within_the_report_budget() {
    let mut claude: Vec<_> = (0..205)
        .rev()
        .map(|index| entry(&format!("skill-{index:03}"), &"é".repeat(4096)))
        .collect();
    claude[0].skill.description = "x".repeat(4097);
    let h = Fixture::new(HelperSkillLists {
        claude,
        codex: vec![entry("long", &"x".repeat(4097))],
    });
    h.reporter.refresh(true, None).await.unwrap();
    {
        let events = h.events.lock().unwrap();
        let RunnerEvent::RunnerSkillsUpdated(report) = &events[0].0 else {
            panic!("wrong report");
        };
        let RunnerSkillsUpdated::SkillsUpdated { claude, codex } = report;
        assert_eq!(claude.len(), 200);
        assert_eq!(claude[0].name, "skill-000");
        assert_eq!(claude[199].name, "skill-199");
        assert_eq!(claude[0].description, "é".repeat(4096));
        assert!(claude.iter().any(|entry| entry.description.is_empty()));
        assert!(
            claude
                .iter()
                .all(|entry| entry.description.is_empty() || entry.description == "é".repeat(4096))
        );
        assert_eq!(codex[0].description, "");
        assert!(serde_json::to_vec(report).unwrap().len() <= 524_288);
    }
    h.reporter.close().await;
}
