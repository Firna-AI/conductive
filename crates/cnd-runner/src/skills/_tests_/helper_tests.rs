//! Each scan names the configured org skills and leases their current copy.

use std::path::PathBuf;
use std::sync::Arc;

use cnd_runner_interface::sdk_helper::{HelperOutput, HelperRequest};
use cnd_runner_interface::sdk_helper_options::OrgSkills as HelperOrgSkills;
use cnd_runner_interface::skills::HelperSkillLists;
use tokio::sync::Notify;
use unimock::{MockFn, Unimock, matching};

use crate::filter::service::CredentialFilter;
use crate::helper::boundary::{HelperPort, HelperPortMock, HelperPortsMock};
use crate::skills::boundary::{OrgSkillsMock, SkillScanner};
use crate::skills::helper::{NodeSkillScanner, ScannedOrgSkills};
use crate::skills::lease::SkillsLease;

fn scan_request(directory: Option<&str>) -> HelperRequest {
    HelperRequest::Skills {
        request_id: "skills".into(),
        repository: "/repo".into(),
        home: "/home/user".into(),
        reload: true,
        org_skills: Some(HelperOrgSkills {
            repository: "acme/skills".into(),
            trusted_repository: None,
            directory: directory.map(Into::into),
        }),
    }
}

fn scanner(expected: HelperRequest, current: Option<PathBuf>) -> NodeSkillScanner {
    let port: Arc<dyn HelperPort> = Arc::new(Unimock::new((
        HelperPortMock::write
            .next_call(matching!(_))
            .answers_arc(Arc::new(move |_, request| {
                assert_eq!(request, expected);
                Ok(())
            })),
        HelperPortMock::read
            .next_call(matching!())
            .returns(Ok(Some(HelperOutput::Skills {
                request_id: "skills".into(),
                skills: HelperSkillLists::default(),
            }))),
    )));
    let released = Arc::new(Notify::new());
    let copy = Unimock::new(
        OrgSkillsMock::current
            .next_call(matching!())
            .returns(current.map(|path| SkillsLease::new(path, released.clone()))),
    );
    NodeSkillScanner::new(
        Arc::new(Unimock::new(
            HelperPortsMock::port
                .next_call(matching!())
                .returns(Ok(port)),
        )),
        Arc::new(CredentialFilter::default()),
        "/repo".into(),
        "/home/user".into(),
    )
    .with_org_skills(ScannedOrgSkills {
        copy: Arc::new(copy),
        repository: "acme/skills".into(),
        trusted_repository: None,
    })
}

#[tokio::test]
async fn a_scan_names_the_current_org_skills_copy() -> crate::error::Result<()> {
    let copy = "/home/user/.conductive/skills/repositories/acme/skills/commits/abc/skills";
    let lists = scanner(scan_request(Some(copy)), Some(copy.into()))
        .scan(true)
        .await?;
    assert_eq!(lists, HelperSkillLists::default());
    Ok(())
}

#[tokio::test]
async fn a_scan_before_the_first_copy_names_the_org_skills_without_a_folder()
-> crate::error::Result<()> {
    scanner(scan_request(None), None).scan(true).await?;
    Ok(())
}
