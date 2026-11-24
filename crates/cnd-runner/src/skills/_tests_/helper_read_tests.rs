//! A saved scan can name an org skill after the copy job replaces that scan's folder.

#![expect(
    clippy::unwrap_used,
    reason = "The test stops on failed setup or results."
)]

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::runner_skills::SkillReadOutcome;
use cnd_runner_interface::sdk_helper::{HelperOutput, HelperRequest, HelperSkillSource};
use cnd_runner_interface::sdk_helper_options::OrgSkills as HelperOrgSkills;
use cnd_runner_interface::skills::{AgentSkill, HelperSkillLists, SkillEntry};
use cnd_runner_interface::wire::WireTrue;
use unimock::{MockFn, Unimock, matching};

use crate::emitter::EventEmitterMock;
use crate::filter::service::CredentialFilter;
use crate::helper::boundary::{HelperPort, HelperPortMock, HelperPortsMock};
use crate::skills::boundary::{OrgSkills, SkillReports, SkillsStorageMock};
use crate::skills::helper::{NodeSkillScanner, ScannedOrgSkills};
use crate::skills::lease::SkillsLease;
use crate::skills::reporter::SkillReporter;
use crate::skills::service::SkillsCopy;

const OLD: &str = "/private/old/skills";
const NEW: &str = "/private/new/skills";

#[tokio::test(start_paused = true)]
async fn org_skill_read_uses_the_newly_published_copy() {
    let copy = Arc::new(SkillsCopy::new(
        Some("acme/skills".into()),
        Arc::new(Unimock::new((
            SkillsStorageMock::prepare
                .some_call(matching!(Some("acme/skills")))
                .returns(Ok(Some(PathBuf::from(OLD)))),
            SkillsStorageMock::update.stub(|each| {
                each.call(matching!("acme/skills"))
                    .answers(&|_, _| Ok(Some(PathBuf::from(OLD))))
                    .once()
                    .then()
                    .answers(&|_, _| Ok(Some(PathBuf::from(NEW))));
            }),
            SkillsStorageMock::sweep
                .each_call(matching!("acme/skills", _))
                .answers(&|_, _, _| Ok(())),
        ))),
    ));
    let mut published = copy.changes();
    copy.start().await;
    published
        .wait_for(|copy| copy.as_ref().map(SkillsLease::path) == Some(Path::new(OLD)))
        .await
        .unwrap();
    let requests = Arc::new(Mutex::new(Vec::new()));
    let capture = requests.clone();
    let received = requests.clone();
    let port: Arc<dyn HelperPort> = Arc::new(Unimock::new((
        HelperPortMock::write
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, request| {
                capture.lock().unwrap().push(request);
                Ok(())
            })),
        HelperPortMock::read
            .each_call(matching!())
            .answers_arc(Arc::new(move |_| {
                Ok(match received.lock().unwrap().last() {
                    Some(HelperRequest::Skills { request_id, .. }) => Some(HelperOutput::Skills {
                        request_id: request_id.clone(),
                        skills: HelperSkillLists {
                            claude: vec![SkillEntry {
                                skill: AgentSkill {
                                    name: "review".into(),
                                    description: "Review a change.".into(),
                                    manual_only: None,
                                },
                                path: format!("{OLD}/review/SKILL.md"),
                                org: Some(WireTrue),
                            }],
                            codex: vec![],
                        },
                    }),
                    Some(HelperRequest::SkillRead {
                        request_id, source, ..
                    }) => {
                        let text = match source {
                            HelperSkillSource::Org { org_skills, .. }
                                if org_skills.directory.as_deref() == Some(NEW) =>
                            {
                                "New copy."
                            }
                            _ => "Old copy.",
                        };
                        Some(HelperOutput::SkillRead {
                            request_id: request_id.clone(),
                            result: SkillReadOutcome::Success {
                                ok: WireTrue,
                                text: text.into(),
                            },
                        })
                    }
                    _ => None,
                })
            })),
        HelperPortMock::terminate
            .some_call(matching!())
            .returns(Ok(())),
    )));
    let filter = Arc::new(CredentialFilter::default());
    let scanner = Arc::new(
        NodeSkillScanner::new(
            Arc::new(Unimock::new(
                HelperPortsMock::port
                    .some_call(matching!())
                    .returns(Ok(port)),
            )),
            filter.clone(),
            "/repo".into(),
            "/home/user".into(),
        )
        .with_org_skills(ScannedOrgSkills {
            copy: copy.clone(),
            repository: "acme/skills".into(),
            trusted_repository: Some("acme/skills".into()),
        }),
    );
    let reporter = SkillReporter::new(
        scanner,
        Arc::new(Unimock::new(
            EventEmitterMock::emit
                .some_call(matching!(_, None))
                .returns(Ok(())),
        )),
        filter,
    );
    reporter.refresh(true, None).await.unwrap();
    published
        .wait_for(|copy| copy.as_ref().map(SkillsLease::path) == Some(Path::new(NEW)))
        .await
        .unwrap();

    assert_eq!(
        reporter
            .read(Agent::Claude, "review".into(), 1_048_576)
            .await,
        SkillReadOutcome::Success {
            ok: WireTrue,
            text: "New copy.".into()
        }
    );
    assert_eq!(
        requests.lock().unwrap().last(),
        Some(&HelperRequest::SkillRead {
            request_id: "skill.read".into(),
            max_bytes: 1_048_576,
            source: HelperSkillSource::Org {
                repository: "/repo".into(),
                org_skills: HelperOrgSkills {
                    repository: "acme/skills".into(),
                    trusted_repository: Some("acme/skills".into()),
                    directory: Some(NEW.into()),
                },
                agent: Agent::Claude,
                name: "review".into(),
            },
        })
    );
    reporter.close().await;
    copy.close().await;
}
