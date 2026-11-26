//! Remote credentials are resolved only when an authenticated tool is called.

use std::sync::Arc;

use async_trait::async_trait;

use crate::call::Call;
use crate::client::{Client, Dispatch};
use crate::environment::Environment;
use crate::error::Result;
use crate::ports::{Http, Runtime};
use crate::process::Process;
use crate::reply::Reply;

pub(crate) struct EnvironmentClient {
    pub(crate) environment: Arc<dyn Environment>,
    pub(crate) http: Arc<dyn Http>,
    pub(crate) runtime: Arc<dyn Runtime>,
    pub(crate) process: Arc<dyn Process>,
}

#[async_trait]
impl Dispatch for EnvironmentClient {
    async fn execute(&self, call: Call) -> Result<Reply> {
        let client: Arc<dyn Dispatch> = Arc::new(Client::new(
            self.environment.configuration()?,
            self.http.clone(),
            self.runtime.clone(),
            self.process.clone(),
        ));
        client.execute(call).await
    }
}
