# Changelog

## [0.38.0](https://github.com/Firna-AI/conductive/compare/v0.37.0...v0.38.0) (2026-11-27)


### Features

* **sandbox:** hold disk space so a workspace can always resume ([#704](https://github.com/Firna-AI/conductive/issues/704)) ([27d9595](https://github.com/Firna-AI/conductive/commit/27d9595fe1e2d3749e30f421d6087a8fcc3a29b3))


### Bug Fixes

* **runner:** keep the turn open while a parked subagent can wake ([#701](https://github.com/Firna-AI/conductive/issues/701)) ([3371d05](https://github.com/Firna-AI/conductive/commit/3371d05f22c984896056919ac7ab4b71034511a6))

## [0.37.0](https://github.com/Firna-AI/conductive/compare/v0.36.0...v0.37.0) (2026-11-27)


### Features

* **builds:** show the free storage after a build ([#692](https://github.com/Firna-AI/conductive/issues/692)) ([032953e](https://github.com/Firna-AI/conductive/commit/032953efaf3947fb146fef2c28c2417c9bae0dba))
* **chat:** colour code blocks by their language ([#699](https://github.com/Firna-AI/conductive/issues/699)) ([3592536](https://github.com/Firna-AI/conductive/commit/35925365ae15bca0f5e5bc1f9489a30f340ea693))
* **explain:** resize the Explain popover from its free edges ([#688](https://github.com/Firna-AI/conductive/issues/688)) ([e61b336](https://github.com/Firna-AI/conductive/commit/e61b33679c1e6a0286308b7e6076e060f146fbc6))
* **explain:** show the top of the answer in the popover ([#682](https://github.com/Firna-AI/conductive/issues/682)) ([0d2dc3d](https://github.com/Firna-AI/conductive/commit/0d2dc3db3c08765e4d18f97ba372282bf3ed483b))
* **list:** run the light of a starting mark only while a message waits ([#696](https://github.com/Firna-AI/conductive/issues/696)) ([2c723fa](https://github.com/Firna-AI/conductive/commit/2c723fa5d640888b23a12e795710c9a6cf64c512))
* open a skill chip as a skill tab ([#690](https://github.com/Firna-AI/conductive/issues/690)) ([f5933c3](https://github.com/Firna-AI/conductive/commit/f5933c3c41063a62e05849387914cfb863ee8715))
* **settings:** one Settings dialog for the account and the org ([#569](https://github.com/Firna-AI/conductive/issues/569)) ([0b04e4d](https://github.com/Firna-AI/conductive/commit/0b04e4d547583a7c237523ed7b6e899968794205))
* **worker:** warn when a session names a turn that does not run ([#691](https://github.com/Firna-AI/conductive/issues/691)) ([d39eadc](https://github.com/Firna-AI/conductive/commit/d39eadc9081c275defea833b0dd3e470435d1189))


### Bug Fixes

* **images:** start the build that Build computer asks for during a refresh ([#698](https://github.com/Firna-AI/conductive/issues/698)) ([56e8a86](https://github.com/Firna-AI/conductive/commit/56e8a86509e5d85e86491d92484e58d82fabc07a))
* **start:** create the workspace branch with no upstream ([#694](https://github.com/Firna-AI/conductive/issues/694)) ([54755dd](https://github.com/Firna-AI/conductive/commit/54755dd22b534d2ff00c0ddf521bc17cbc20b14d))

## [0.36.0](https://github.com/Firna-AI/conductive/compare/v0.35.0...v0.36.0) (2026-11-26)


### Features

* bound the workspace object memory of history and file reports ([#675](https://github.com/Firna-AI/conductive/issues/675)) ([45d1ce5](https://github.com/Firna-AI/conductive/commit/45d1ce51ee1c3b3bc0e0406bbdfaba0c004251ae))
* **chat:** close the Explain popover at a press outside it ([#664](https://github.com/Firna-AI/conductive/issues/664)) ([3d66bbb](https://github.com/Firna-AI/conductive/commit/3d66bbbf681f6f1532b589619e1caf8c45416ddd))
* **files:** read the bucketed projection layout ([#674](https://github.com/Firna-AI/conductive/issues/674)) ([aeaf623](https://github.com/Firna-AI/conductive/commit/aeaf6234d8fc27ee7c8ac9ddcc94c42dd4e04650))
* limit runner file reports to 50,000 entries and 1,000 changes ([d0801de](https://github.com/Firna-AI/conductive/commit/d0801ded86ee04e85fb811b08a5bd0e66965a98b))
* **list:** run the light of the list mark while a workspace starts ([#667](https://github.com/Firna-AI/conductive/issues/667)) ([459af2a](https://github.com/Firna-AI/conductive/commit/459af2a78d055277d3eab04c8e7f3c6dbfdfc9b8))
* **list:** show the open workspace under its collapsed section ([#684](https://github.com/Firna-AI/conductive/issues/684)) ([04b251e](https://github.com/Firna-AI/conductive/commit/04b251e8a3d9e030b1c15624dd112c6232736c4b))
* **merge-queue:** add a merge queue that lands pull requests as one stack ([#681](https://github.com/Firna-AI/conductive/issues/681)) ([a89df57](https://github.com/Firna-AI/conductive/commit/a89df57e5dbb90acb0d1afb61499b5036883e70d))
* read workspace state for new tabs instead of replaying history ([4fdb5bc](https://github.com/Firna-AI/conductive/commit/4fdb5bc7dfefdc0cf966486af91be1dd283dca4b))
* **runner:** show agent pages with their sandbox files and fonts ([#670](https://github.com/Firna-AI/conductive/issues/670)) ([84d105f](https://github.com/Firna-AI/conductive/commit/84d105f0a95181a68330a9cc8a6cd6b3556c3dc6))
* **settings:** remove a repository from its row menu ([#689](https://github.com/Firna-AI/conductive/issues/689)) ([d4af787](https://github.com/Firna-AI/conductive/commit/d4af7873d282a35fdeb4074902bb1bb5f6686011))
* **settings:** show the cloud computer scripts as code ([#663](https://github.com/Firna-AI/conductive/issues/663)) ([48b8a3a](https://github.com/Firna-AI/conductive/commit/48b8a3a98ef7fe45f493060cec764cfbe7beda4d))
* tell agents the capabilities of their workspace ([#660](https://github.com/Firna-AI/conductive/issues/660)) ([aa1f344](https://github.com/Firna-AI/conductive/commit/aa1f344eed91b2b110a178e2400284a4b17bf4b1))
* **tools:** get_message also gives finished agent messages ([#665](https://github.com/Firna-AI/conductive/issues/665)) ([25ef1bb](https://github.com/Firna-AI/conductive/commit/25ef1bb7f257bf7524f7602d048332162c108786))


### Bug Fixes

* **files:** keep select all and copy inside the code of a file tab ([#668](https://github.com/Firna-AI/conductive/issues/668)) ([b2ff01c](https://github.com/Firna-AI/conductive/commit/b2ff01c55b556d22f1e31568909ce0ed4f0a9252))
* **images:** refresh renamed repositories and log why a repository load failed ([#687](https://github.com/Firna-AI/conductive/issues/687)) ([0e4153c](https://github.com/Firna-AI/conductive/commit/0e4153cddfe3b538c3a053c931e8f6c2fa2b3f77))
* **lifecycle:** start a resume that comes during a pending stop ([#680](https://github.com/Firna-AI/conductive/issues/680)) ([f73711a](https://github.com/Firna-AI/conductive/commit/f73711ae04fe931f48f138544b6a233e88e4a350))
* **runner:** name the tool and the skill on "Used" tool lines ([#662](https://github.com/Firna-AI/conductive/issues/662)) ([eb7bb9a](https://github.com/Firna-AI/conductive/commit/eb7bb9a24771570ce932737de7b58750b75bc920))

## [0.35.0](https://github.com/Firna-AI/conductive/compare/v0.34.0...v0.35.0) (2026-11-23)


### Features

* **chat:** move the efforts of the model menu into an Effort submenu ([#657](https://github.com/Firna-AI/conductive/issues/657)) ([b31d2ea](https://github.com/Firna-AI/conductive/commit/b31d2ea7319449169030951e50b4fb8c40d9b6da))
* **chat:** show a button to the bottom while the reader is scrolled up ([#653](https://github.com/Firna-AI/conductive/issues/653)) ([0c8fbc8](https://github.com/Firna-AI/conductive/commit/0c8fbc806b6afa8a1b83666d85d99f099ea4352b))
* **new-workspace:** simplify the header of the New workspace dialog ([#656](https://github.com/Firna-AI/conductive/issues/656)) ([edb0ab2](https://github.com/Firna-AI/conductive/commit/edb0ab22c995cafeecc0f7835acbe862ad7327fc))


### Bug Fixes

* **mac:** hide the Stopped notice of the workspace bar after 5 seconds ([#654](https://github.com/Firna-AI/conductive/issues/654)) ([a977146](https://github.com/Firna-AI/conductive/commit/a97714653e96c9f8b2a1634c7d55515d42c2a1da))
* **skills:** show org skills in the / skill list ([#659](https://github.com/Firna-AI/conductive/issues/659)) ([29e64a9](https://github.com/Firna-AI/conductive/commit/29e64a957a5a7916763c313f5f80b5a264de4f5e))

## [0.34.0](https://github.com/Firna-AI/conductive/compare/v0.33.0...v0.34.0) (2026-11-23)


### Features

* **models:** list model favourites first in every model picker ([#652](https://github.com/Firna-AI/conductive/issues/652)) ([302f963](https://github.com/Firna-AI/conductive/commit/302f96384628c69ceb8d04e7d4d74aaa3e5927b0))


### Bug Fixes

* **app:** keep the phone layout above the on-screen keyboard ([#645](https://github.com/Firna-AI/conductive/issues/645)) ([51b2467](https://github.com/Firna-AI/conductive/commit/51b2467d5029a90993e8e0677b6757246058a053))
* **app:** stop the iOS edge blur over the header of the Home Screen app ([#650](https://github.com/Firna-AI/conductive/issues/650)) ([c5616c6](https://github.com/Firna-AI/conductive/commit/c5616c6bf60139709dfa0656ebfd834f8360190e))
* **chat:** keep the follow-up field inside the Explain popover ([#651](https://github.com/Firna-AI/conductive/issues/651)) ([42c238a](https://github.com/Firna-AI/conductive/commit/42c238a0cb6a7641a48693490e9b8266bcb9ff57))

## [0.33.0](https://github.com/Firna-AI/conductive/compare/v0.32.0...v0.33.0) (2026-11-22)


### Features

* **skills:** share org skills with repository trust ([#426](https://github.com/Firna-AI/conductive/issues/426)) ([d3c1c5f](https://github.com/Firna-AI/conductive/commit/d3c1c5f178fe9b246ab53eab51a4b5d0f13e8c48))

## [0.32.0](https://github.com/Firna-AI/conductive/compare/v0.31.0...v0.32.0) (2026-11-22)


### Features

* **capabilities:** one Mac access switch that allows all commands ([#614](https://github.com/Firna-AI/conductive/issues/614)) ([69d60d0](https://github.com/Firna-AI/conductive/commit/69d60d0d03c147556b0dc849c270a973412a21a2))
* **chat:** explain selected chat text in a popover ([#619](https://github.com/Firna-AI/conductive/issues/619)) ([3359426](https://github.com/Firna-AI/conductive/commit/335942653330e7f8483f225da08d527711d0826c))
* **files:** zoom and expand pictures in the file tab ([#647](https://github.com/Firna-AI/conductive/issues/647)) ([a9e43b0](https://github.com/Firna-AI/conductive/commit/a9e43b05fdf4c69927790840a844a0c6c4d6535a))
* **services:** run servers outside agent turns ([#643](https://github.com/Firna-AI/conductive/issues/643)) ([cc6a38f](https://github.com/Firna-AI/conductive/commit/cc6a38f09919cd2e69c13e767434600fa12ff4d6))
* **sessions:** wake a session when a watched turn ends ([#627](https://github.com/Firna-AI/conductive/issues/627)) ([1c48caa](https://github.com/Firna-AI/conductive/commit/1c48caabb4d16a43d249ca9136a0e90a87f58451))


### Bug Fixes

* **chat:** bound each events replay and answer the socket first ([#477](https://github.com/Firna-AI/conductive/issues/477)) ([6408c95](https://github.com/Firna-AI/conductive/commit/6408c95234d97d5e4a0dd6bcfdd864edac5475b7))

## [0.31.0](https://github.com/Firna-AI/conductive/compare/v0.30.0...v0.31.0) (2026-11-22)


### Features

* **mockups:** register the shared mockup parts with Mokly ([#607](https://github.com/Firna-AI/conductive/issues/607)) ([061ec19](https://github.com/Firna-AI/conductive/commit/061ec1961fc66e3f5fb97ffe365cb8f128c1ee7c))
* **operator:** switch an org to another provider account ([#617](https://github.com/Firna-AI/conductive/issues/617)) ([d0f24d1](https://github.com/Firna-AI/conductive/commit/d0f24d1b3e120467850129a91915a546515e7d48))
* **workspaces:** start a workspace from another branch ([#644](https://github.com/Firna-AI/conductive/issues/644)) ([e482385](https://github.com/Firna-AI/conductive/commit/e482385ef0ffe019cd0e0e10418eecd4037c704b))


### Bug Fixes

* **chat:** keep runner connection state across a wake ([#640](https://github.com/Firna-AI/conductive/issues/640)) ([c0b8527](https://github.com/Firna-AI/conductive/commit/c0b852710dc486bf4169a9800c9a8d9bdbacc235))
* **chat:** prepare fresh labels in the shared event path ([#633](https://github.com/Firna-AI/conductive/issues/633)) ([1018485](https://github.com/Firna-AI/conductive/commit/10184854a4789ac58c248b8c89c13efc4fdad58d))
* **chat:** preserve saved tabs across paged replays ([#623](https://github.com/Firna-AI/conductive/issues/623)) ([878727a](https://github.com/Firna-AI/conductive/commit/878727a4294ee61406210cdf2ca1e8a2ce25eacc))
* **chat:** settle final session placement after replays ([#641](https://github.com/Firna-AI/conductive/issues/641)) ([87aef0a](https://github.com/Firna-AI/conductive/commit/87aef0ae0ef897bc11c204fff953c6390de5a20a))
* **chat:** wrap long words across the transcript ([#618](https://github.com/Firna-AI/conductive/issues/618)) ([91afc5c](https://github.com/Firna-AI/conductive/commit/91afc5c0269ae270146ce9a3c5c3b61011d0459f))
* **continue:** mask branch and file labels at browser boundaries ([#629](https://github.com/Firna-AI/conductive/issues/629)) ([0be683d](https://github.com/Firna-AI/conductive/commit/0be683d136f3e7a08f1f701139c29a75dd90f651))
* **continue:** store stop causes instead of guessing a clash ([#625](https://github.com/Firna-AI/conductive/issues/625)) ([e623b74](https://github.com/Firna-AI/conductive/commit/e623b74d89a45912173ab72ccc912856ba93f64f))
* **dialogs:** keep tall modal cards inside the window ([#626](https://github.com/Firna-AI/conductive/issues/626)) ([558838e](https://github.com/Firna-AI/conductive/commit/558838e09afce5f9ed459f4ddb3e7d6033d5d4f3))
* **dialogs:** make scrolling question text reachable by keyboard ([#636](https://github.com/Firna-AI/conductive/issues/636)) ([89ba041](https://github.com/Firna-AI/conductive/commit/89ba041a76fbc3409af1efe20cc425360b0b6971))
* **github:** mask branch names in workspace labels ([#621](https://github.com/Firna-AI/conductive/issues/621)) ([a0d399b](https://github.com/Firna-AI/conductive/commit/a0d399b742d878da51cb32006d0c5db646bccaf3))
* **menus:** recover focus when menu actions leave ([#631](https://github.com/Firna-AI/conductive/issues/631)) ([1be509b](https://github.com/Firna-AI/conductive/commit/1be509bef9ffe0130898515c1fa9169111c3ad52))
* **model-gateway:** end the Codex turn on a long upstream 429 wait ([#632](https://github.com/Firna-AI/conductive/issues/632)) ([bad6521](https://github.com/Firna-AI/conductive/commit/bad6521f12417244e5ae8a0472bad3d8cab4ca09))
* **new-workspace:** read readiness with repository choices ([#635](https://github.com/Firna-AI/conductive/issues/635)) ([2b74e9c](https://github.com/Firna-AI/conductive/commit/2b74e9cd6c137c0717401351a46605766aa06486))
* **repository:** mask branch and file labels at browser boundaries ([#637](https://github.com/Firna-AI/conductive/issues/637)) ([b3bba92](https://github.com/Firna-AI/conductive/commit/b3bba92fe45a2b582377f1264ab1d23adc8f9645))
* **runner:** keep a stuck runner from hiding waiting messages ([#622](https://github.com/Firna-AI/conductive/issues/622)) ([68342ce](https://github.com/Firna-AI/conductive/commit/68342ce4a67984d6d3f02b681c4e94fc36c3cac7))
* **update:** restore missing runner parts before the runner starts ([#628](https://github.com/Firna-AI/conductive/issues/628)) ([ef411eb](https://github.com/Firna-AI/conductive/commit/ef411eb43756cd38f7ed487bd8c89c0ab77f426a))
* **worker:** keep cron steps running after a failure ([#638](https://github.com/Firna-AI/conductive/issues/638)) ([d099954](https://github.com/Firna-AI/conductive/commit/d09995457dc5a5ddf6f578fb3474528ada11af49))
* **workspaces:** separate archived computer evidence from Restore ([#630](https://github.com/Firna-AI/conductive/issues/630)) ([1efe2db](https://github.com/Firna-AI/conductive/commit/1efe2db2a5a67b1fcc0b6b9d66099ecdd958bfb0))


### Performance Improvements

* **chat:** fold long sessions in indexed batches ([#639](https://github.com/Firna-AI/conductive/issues/639)) ([f87cfa7](https://github.com/Firna-AI/conductive/commit/f87cfa7831f6ab08f8bba716dc1965ff327f4e04))
* **lifecycle:** chain workspace start steps in one alarm run ([#620](https://github.com/Firna-AI/conductive/issues/620)) ([7bf72a8](https://github.com/Firna-AI/conductive/commit/7bf72a8f46c3d5e2947083511849457e6fd9ea5d))

## [0.30.0](https://github.com/Firna-AI/conductive/compare/v0.29.0...v0.30.0) (2026-11-20)


### Features

* **capabilities:** search secrets and hide descriptions behind an info icon ([#600](https://github.com/Firna-AI/conductive/issues/600)) ([b41a52e](https://github.com/Firna-AI/conductive/commit/b41a52e67cea7a7fec5a202de297ded1a755e7d5))
* **capabilities:** show the approvals of this session only ([#602](https://github.com/Firna-AI/conductive/issues/602)) ([3a774b3](https://github.com/Firna-AI/conductive/commit/3a774b38ef1245c0209f30cb4a2b47eda6634c80))
* **chat:** open a skill list with / in the composer ([#358](https://github.com/Firna-AI/conductive/issues/358)) ([045050c](https://github.com/Firna-AI/conductive/commit/045050c3becedbc416251bcccab34f6f41665bd7))
* **github:** record merged pull requests for the Stats tab ([#593](https://github.com/Firna-AI/conductive/issues/593)) ([43f7000](https://github.com/Firna-AI/conductive/commit/43f700070ba07f77eb29e28f269bb3e104a238a5))
* **lifecycle:** record the step times of builds and workspace starts ([#488](https://github.com/Firna-AI/conductive/issues/488)) ([83141ef](https://github.com/Firna-AI/conductive/commit/83141ef93462a89a2029a7b210ac43a53427b47f))


### Bug Fixes

* **automations:** keep chosen secret names after list read failures ([#612](https://github.com/Firna-AI/conductive/issues/612)) ([49e5d59](https://github.com/Firna-AI/conductive/commit/49e5d59c602b03e9c7d1b78f4df29e09bd1f5e7c))
* **chat:** link HTTP schemes in every letter case ([#596](https://github.com/Firna-AI/conductive/issues/596)) ([e8566c9](https://github.com/Firna-AI/conductive/commit/e8566c9a0719da0e0d5257e822b6742fff2a1e00))
* **chat:** preserve Markdown links with address labels ([#606](https://github.com/Firna-AI/conductive/issues/606)) ([b64f868](https://github.com/Firna-AI/conductive/commit/b64f86888f9e5cc005cbffb3a485782423ae28c3))
* **chat:** read escaped &lt; in Markdown angle addresses ([#605](https://github.com/Firna-AI/conductive/issues/605)) ([d161172](https://github.com/Firna-AI/conductive/commit/d161172e1a25815b92784904b922c3604e68afd4))
* **images:** accept apt release Label changes ([#603](https://github.com/Firna-AI/conductive/issues/603)) ([bc36e18](https://github.com/Firna-AI/conductive/commit/bc36e18499b8793f8f49d73c99c625da1ceed888))
* **mail:** use the deployment origin for approval emails ([#609](https://github.com/Firna-AI/conductive/issues/609)) ([b35867e](https://github.com/Firna-AI/conductive/commit/b35867e2c64b8cc7d6092a80e8fed93c5eabb980))
* **menus:** keep workspace menus usable after action changes ([#595](https://github.com/Firna-AI/conductive/issues/595)) ([f9fe7fa](https://github.com/Firna-AI/conductive/commit/f9fe7fa2fce0ae66576588ed5676beb4c076ecf6))
* **previews:** keep launch file paths exact ([#597](https://github.com/Firna-AI/conductive/issues/597)) ([359f052](https://github.com/Firna-AI/conductive/commit/359f05203efeae0e5ab56fe0c21003ef2d4c6a3e))
* **runner:** isolate Claude profiles and remove abandoned locks ([#613](https://github.com/Firna-AI/conductive/issues/613)) ([17f97ad](https://github.com/Firna-AI/conductive/commit/17f97adda754d450a3f2760079885b6c3baffbde))


### Performance Improvements

* **runner:** connect without a warm-up and scan files in parallel ([#458](https://github.com/Firna-AI/conductive/issues/458)) ([5f513c0](https://github.com/Firna-AI/conductive/commit/5f513c06dd0a444ed39f47d7ccbb8c9a6c76a8ed))

## [0.29.0](https://github.com/Firna-AI/conductive/compare/v0.28.0...v0.29.0) (2026-11-20)


### Features

* **chat:** report runner work that an object reset interrupts ([#585](https://github.com/Firna-AI/conductive/issues/585)) ([b54c756](https://github.com/Firna-AI/conductive/commit/b54c756b4ad8952d255ed7d9cbda75ce76983d63))
* **files:** close the shown temporary tab with Escape ([#578](https://github.com/Firna-AI/conductive/issues/578)) ([924df6d](https://github.com/Firna-AI/conductive/commit/924df6da6a351319a63f59aed9fbd6a35114e6c1))
* **markdown:** read the chat and the file preview with one markdown-it parser ([#563](https://github.com/Firna-AI/conductive/issues/563)) ([1f2f6fe](https://github.com/Firna-AI/conductive/commit/1f2f6fe79b685293803284c211bb268d4bb8032a))
* **operator:** let the operator set the idle stop time ([#586](https://github.com/Firna-AI/conductive/issues/586)) ([e1b027a](https://github.com/Firna-AI/conductive/commit/e1b027a79b3e7775af17ff04f363deda286b94ca))
* **previews:** expand a preview into a large window ([#580](https://github.com/Firna-AI/conductive/issues/580)) ([462bde9](https://github.com/Firna-AI/conductive/commit/462bde910adba12c15e40131228cdaa5f3a3f50e))
* **terms:** compute the Terms revision from the Terms text ([#571](https://github.com/Firna-AI/conductive/issues/571)) ([4b643cd](https://github.com/Firna-AI/conductive/commit/4b643cda07aab64131efab4fe6d8fdfb28ff8f20))


### Bug Fixes

* **account:** order login requests and sign-in completion ([#577](https://github.com/Firna-AI/conductive/issues/577)) ([3f11e2e](https://github.com/Firna-AI/conductive/commit/3f11e2e001c99bc17df84d733c6db7a4952efb1a))
* **chat:** keep open message controls named ([#564](https://github.com/Firna-AI/conductive/issues/564)) ([458bd46](https://github.com/Firna-AI/conductive/commit/458bd46de386ccbccb8550ecc328799fbb3cde43))
* **chat:** keep refused workspace reports out of sessions ([#570](https://github.com/Firna-AI/conductive/issues/570)) ([b1af8df](https://github.com/Firna-AI/conductive/commit/b1af8df6fa53c6cf4fd67c545edaea4bbecad86b))
* **chat:** keep typed Markdown address escapes ([#589](https://github.com/Firna-AI/conductive/issues/589)) ([def5bb3](https://github.com/Firna-AI/conductive/commit/def5bb3c1a4556a98b1013a7834f789db1ab0e1c))
* **chat:** share rendered-word checks for blank images ([#592](https://github.com/Firna-AI/conductive/issues/592)) ([dfd4372](https://github.com/Firna-AI/conductive/commit/dfd43720dd9a057c44d0cbe71f89e8165f41427c))
* **chat:** use saved context for refused tool parts ([#583](https://github.com/Firna-AI/conductive/issues/583)) ([cd417f0](https://github.com/Firna-AI/conductive/commit/cd417f08b5223f3d9dce75dbce428125625d5dc2))
* **desktop:** use the configured app origin for shared links ([#562](https://github.com/Firna-AI/conductive/issues/562)) ([e7d4891](https://github.com/Firna-AI/conductive/commit/e7d4891911b43dcbee001da39f3f419aecde7a64))
* **files:** keep saved HTML page labels after failed reads ([#579](https://github.com/Firna-AI/conductive/issues/579)) ([3a26a72](https://github.com/Firna-AI/conductive/commit/3a26a72f3dbba4ec959d057297e0b6dd2fad8177))
* **files:** wait for confirmed Ready before HTML preview ([#591](https://github.com/Firna-AI/conductive/issues/591)) ([4e428a3](https://github.com/Firna-AI/conductive/commit/4e428a369185ce7295fdfc27f5efb53eaa8049ec))
* **orgs:** share the active org source ([#566](https://github.com/Firna-AI/conductive/issues/566)) ([6828e1a](https://github.com/Firna-AI/conductive/commit/6828e1a64af76bb2cee3abe51ee2eb6296b0c0ba))
* **repositories:** reply with saved choices without another GitHub read ([#587](https://github.com/Firna-AI/conductive/issues/587)) ([f681c8a](https://github.com/Firna-AI/conductive/commit/f681c8a6cc6c175eaaf7e1d09c3d7d594ddb79f9))
* **runner:** refresh file previews after same-second rewrites ([#588](https://github.com/Firna-AI/conductive/issues/588)) ([908da17](https://github.com/Firna-AI/conductive/commit/908da17da20f72d5b2c08450122fabf55ebb0abf))
* **settings:** remove the Repositories tab description ([#576](https://github.com/Firna-AI/conductive/issues/576)) ([b7b7615](https://github.com/Firna-AI/conductive/commit/b7b76150c2534e1df9901fa26d8625d4be8a8561))
* **shortcuts:** preserve Plus in key chips and spoken names ([#575](https://github.com/Firna-AI/conductive/issues/575)) ([1f3bbbe](https://github.com/Firna-AI/conductive/commit/1f3bbbe643e6fd07708d33ce908494102514575e))
* **shortcuts:** stop held keys after focus changes ([#561](https://github.com/Firna-AI/conductive/issues/561)) ([2085de0](https://github.com/Firna-AI/conductive/commit/2085de0933ed3a4acb3a71f64aa485e757ea0f89))
* **terminal:** discard queued colours on a theme change ([#574](https://github.com/Firna-AI/conductive/issues/574)) ([590e4fd](https://github.com/Firna-AI/conductive/commit/590e4fd6bae14050dc43930b28ab4577a22ffdec))
* **warnings:** log the Boat code of a failed start ([#582](https://github.com/Firna-AI/conductive/issues/582)) ([a8c31a5](https://github.com/Firna-AI/conductive/commit/a8c31a53cc2fe4f74eecfaf1e65decaba2148493))
* **workspaces:** show Starting while requests wait ([#581](https://github.com/Firna-AI/conductive/issues/581)) ([a3cb5f4](https://github.com/Firna-AI/conductive/commit/a3cb5f4575277b9b616b3e9886a2ac0b0efb4290))


### Performance Improvements

* **chat:** index session history events ([#572](https://github.com/Firna-AI/conductive/issues/572)) ([0660702](https://github.com/Firna-AI/conductive/commit/0660702f1c79dbb81bb6f94b454c483cd901de33))

## [0.28.0](https://github.com/Firna-AI/conductive/compare/v0.27.0...v0.28.0) (2026-11-20)


### Features

* **automations:** choose secrets for automation runs ([#540](https://github.com/Firna-AI/conductive/issues/540)) ([d8489eb](https://github.com/Firna-AI/conductive/commit/d8489ebe7ee82ee0cd1c9cd1b5efdf248c6304ae))
* **files:** preview HTML files in their tab ([#552](https://github.com/Firna-AI/conductive/issues/552)) ([7552f6e](https://github.com/Firna-AI/conductive/commit/7552f6e33f06d7a5df9f542b269d2e1f8d92fca8))
* **repositories:** order the repositories of an org ([#506](https://github.com/Firna-AI/conductive/issues/506)) ([da4e09a](https://github.com/Firna-AI/conductive/commit/da4e09a584aa5579a9121fce17564e54249c841b))
* **repositories:** save repository edits and start one build at Done ([#556](https://github.com/Firna-AI/conductive/issues/556)) ([39bc62a](https://github.com/Firna-AI/conductive/commit/39bc62a3a04b960f6c64d75619f9fa69cfae6027))


### Bug Fixes

* **chat:** hide headings with formatting marks alone ([#555](https://github.com/Firna-AI/conductive/issues/555)) ([e54cbbd](https://github.com/Firna-AI/conductive/commit/e54cbbd00b4a268ffcdd4e0e67bdbd4ab420829d))
* **chat:** keep long tool call details inside the chat ([#549](https://github.com/Firna-AI/conductive/issues/549)) ([17051a2](https://github.com/Firna-AI/conductive/commit/17051a2de448fd3dfd8c9392c1debdf1e11bff21))
* **chat:** preserve saved tabs after a failed view read ([#544](https://github.com/Firna-AI/conductive/issues/544)) ([634a337](https://github.com/Firna-AI/conductive/commit/634a3379e08fd557032e0f65736a4ee7e81f5447))
* **chat:** scan Markdown link labels once ([#558](https://github.com/Firna-AI/conductive/issues/558)) ([e6a0c91](https://github.com/Firna-AI/conductive/commit/e6a0c9114617884d83ced80511802f237b6866e6))
* **dev:** serve built pages through the Worker ([#557](https://github.com/Firna-AI/conductive/issues/557)) ([25ffc4d](https://github.com/Firna-AI/conductive/commit/25ffc4de99c7bea5c470415adf683794ffbf3f09))
* **files:** keep only the shown HTML page while the computer starts ([7552f6e](https://github.com/Firna-AI/conductive/commit/7552f6e33f06d7a5df9f542b269d2e1f8d92fca8))
* **files:** keep retained diffs on their reported base ([#554](https://github.com/Firna-AI/conductive/issues/554)) ([c41f628](https://github.com/Firna-AI/conductive/commit/c41f628253e78ca8c7d7affaa110d0c12a193706))
* **lifecycle:** honor saved archive retry waits ([#545](https://github.com/Firna-AI/conductive/issues/545)) ([87805e3](https://github.com/Firna-AI/conductive/commit/87805e31d82a47cea9975a930594923253aa2120))
* **lifecycle:** retain cleanup after a scheduling failure ([#548](https://github.com/Firna-AI/conductive/issues/548)) ([f22adcc](https://github.com/Firna-AI/conductive/commit/f22adccf51e6cc93bee5412f213282d52382d649))
* **markdown:** share CommonMark line splitting in chat ([#543](https://github.com/Firna-AI/conductive/issues/543)) ([66682a1](https://github.com/Firna-AI/conductive/commit/66682a1679dbf3a208427591c9d88cea11fcca82))
* **palette:** keep the selected repository filter visible ([#551](https://github.com/Firna-AI/conductive/issues/551)) ([245953a](https://github.com/Firna-AI/conductive/commit/245953a4c1b6ae23e6db4ece5403d0444e119093))
* **sandbox:** classify provider body deadlines as unavailable ([#547](https://github.com/Firna-AI/conductive/issues/547)) ([fb85c4d](https://github.com/Firna-AI/conductive/commit/fb85c4d327e74f2e85c88203416d870a10bb5c95))
* **software-image:** retain the current image during cleanup ([#553](https://github.com/Firna-AI/conductive/issues/553)) ([340a45e](https://github.com/Firna-AI/conductive/commit/340a45e05f44cace6a642070ef0a7b21b39407f2))
* **terminal:** wait for completed command output in bridge tests ([#541](https://github.com/Firna-AI/conductive/issues/541)) ([a759350](https://github.com/Firna-AI/conductive/commit/a7593508f890a03edcac0a4b733597154fcf026a))
* **tests:** await runner receipt of late secret notices ([#546](https://github.com/Firna-AI/conductive/issues/546)) ([5be8744](https://github.com/Firna-AI/conductive/commit/5be87446ba01c9ef56f27d21a6c37882766c7c3f))

## [0.27.0](https://github.com/Firna-AI/conductive/compare/v0.26.0...v0.27.0) (2026-11-20)


### Features

* **chat:** show agent screenshots as pictures in answers ([#498](https://github.com/Firna-AI/conductive/issues/498)) ([1e81b0e](https://github.com/Firna-AI/conductive/commit/1e81b0ec622e3a9ddfd089885cfe4e4e97c32e6c))
* **models:** offer GPT-6.2 Sol and Astra on Codex 0.170.0 ([#499](https://github.com/Firna-AI/conductive/issues/499)) ([6f58a0e](https://github.com/Firna-AI/conductive/commit/6f58a0e4216a6dc02d222e223756dcf30426884e))
* **sandbox:** add E2B accounts and weighted org assignment ([#193](https://github.com/Firna-AI/conductive/issues/193)) ([507ee23](https://github.com/Firna-AI/conductive/commit/507ee23f618b5f11674f140ce0004b8800b2b3c7))


### Bug Fixes

* **account:** keep login status and defaults current ([#475](https://github.com/Firna-AI/conductive/issues/475)) ([c3bae7b](https://github.com/Firna-AI/conductive/commit/c3bae7b438ddafc66f0ca6bb24b0b3da46e62812))
* **chat-dev:** store both parts before out-of-order delivery ([#534](https://github.com/Firna-AI/conductive/issues/534)) ([3c4082b](https://github.com/Firna-AI/conductive/commit/3c4082b965c13927a34d49d5be63113b698d1d0a))
* **chat:** activate symbolic answer state ([#528](https://github.com/Firna-AI/conductive/issues/528)) ([8d6a955](https://github.com/Firna-AI/conductive/commit/8d6a955ad4b4ee6ef2f8c132efb799bb1a0b65f0))
* **chat:** compare fast mode on repeated model moves ([#537](https://github.com/Firna-AI/conductive/issues/537)) ([ba9eb8d](https://github.com/Firna-AI/conductive/commit/ba9eb8dd127634f5a89db0da4744c1f8c08f9437))
* **chat:** count reported files in stopped-turn summaries ([#494](https://github.com/Firna-AI/conductive/issues/494)) ([b8712bd](https://github.com/Firna-AI/conductive/commit/b8712bd9a05551f12f4455a1f543736828fa59c0))
* **chat:** drop the failed-send notice when the message arrives ([#489](https://github.com/Firna-AI/conductive/issues/489)) ([ebf9474](https://github.com/Firna-AI/conductive/commit/ebf9474d2beb33ee85ef199431739d74169643ae))
* **chat:** filter complete tool details before display cuts ([#507](https://github.com/Firna-AI/conductive/issues/507)) ([35bcbc2](https://github.com/Firna-AI/conductive/commit/35bcbc2b136dce487c75b7320ca2128844388b3d))
* **chat:** keep anchored menus above clipping containers ([#508](https://github.com/Firna-AI/conductive/issues/508)) ([664462e](https://github.com/Firna-AI/conductive/commit/664462e438f31e6834fd7b4bb88806c689949c4f))
* **chat:** keep balanced square brackets in bare addresses ([#514](https://github.com/Firna-AI/conductive/issues/514)) ([530812a](https://github.com/Firna-AI/conductive/commit/530812aff7c64ccc6cbca7148e368e1a0ae4bb04))
* **chat:** keep chosen tabs after a failed close ([#531](https://github.com/Firna-AI/conductive/issues/531)) ([3ba2d21](https://github.com/Firna-AI/conductive/commit/3ba2d2135caaee2082aaac2a07dbcadfd2eed89e))
* **chat:** keep chosen tabs after linked replies ([#522](https://github.com/Firna-AI/conductive/issues/522)) ([0787320](https://github.com/Firna-AI/conductive/commit/0787320ddf49c812844936f7909afd328b1ba84e))
* **chat:** keep Preview selected after delayed model replies ([#517](https://github.com/Firna-AI/conductive/issues/517)) ([b0efec2](https://github.com/Firna-AI/conductive/commit/b0efec267b265a27259223f8a617567f0e629801))
* **chat:** reopen read-only sessions in local close order ([#538](https://github.com/Firna-AI/conductive/issues/538)) ([ca1c64e](https://github.com/Firna-AI/conductive/commit/ca1c64e36feb97c24a669efb0023bbab7b5a7d3b))
* **chat:** retain pending bar prompts across workspace visits ([#511](https://github.com/Firna-AI/conductive/issues/511)) ([e4aeef4](https://github.com/Firna-AI/conductive/commit/e4aeef4786bd8fa52e5f6574550151353bac556d))
* **chat:** retry an unanswered file transfer and log copy failures ([#505](https://github.com/Firna-AI/conductive/issues/505)) ([6fa9e75](https://github.com/Firna-AI/conductive/commit/6fa9e75c70f26df8d279521e54ab0f8feab54454))
* **chat:** stage symbolic answer filter state ([#519](https://github.com/Firna-AI/conductive/issues/519)) ([884f614](https://github.com/Firna-AI/conductive/commit/884f6142970b38852c163dff4fa033d17622f533))
* **feedback:** limit each person to ten sends per hour ([#485](https://github.com/Firna-AI/conductive/issues/485)) ([85c955a](https://github.com/Firna-AI/conductive/commit/85c955ab9fce298b8c7389d2f22e8b06b429c040))
* **github:** check repository values before branch routing ([#515](https://github.com/Firna-AI/conductive/issues/515)) ([244b942](https://github.com/Firna-AI/conductive/commit/244b942770677b9eb8cbe7eb956594743a51366d))
* **github:** follow a repository that moves to another owner ([#500](https://github.com/Firna-AI/conductive/issues/500)) ([ae69454](https://github.com/Firna-AI/conductive/commit/ae69454243900561d173cd496b53633d63c09371))
* **github:** keep the chosen page after a late prompt failure ([#504](https://github.com/Firna-AI/conductive/issues/504)) ([221df8c](https://github.com/Firna-AI/conductive/commit/221df8ca0cb129ba863a32fc7080ab160986a47c))
* **lifecycle:** back off failed archive steps ([#539](https://github.com/Firna-AI/conductive/issues/539)) ([1f63112](https://github.com/Firna-AI/conductive/commit/1f6311268f79a0fc277a4ad3149315d1669feb0a))
* **lifecycle:** keep only the failure that ends an image build ([#521](https://github.com/Firna-AI/conductive/issues/521)) ([131bd7f](https://github.com/Firna-AI/conductive/commit/131bd7f03d941675d942cf55b714b8d38fd0707b))
* **lifecycle:** keep the archive wait module private ([1f63112](https://github.com/Firna-AI/conductive/commit/1f6311268f79a0fc277a4ad3149315d1669feb0a))
* **lifecycle:** preserve the first end of an image build ([#530](https://github.com/Firna-AI/conductive/issues/530)) ([5e23fb5](https://github.com/Firna-AI/conductive/commit/5e23fb5658a6195ab243404f56fcbf0c2079485b))
* **mac:** offer Applications move for read-only copies ([#473](https://github.com/Firna-AI/conductive/issues/473)) ([be4add0](https://github.com/Firna-AI/conductive/commit/be4add08c2735c0fdcc2d80eb4a94ecdb3849711))
* **mail:** log safe reasons for failed email delivery ([#502](https://github.com/Firna-AI/conductive/issues/502)) ([8b2eaa1](https://github.com/Firna-AI/conductive/commit/8b2eaa15c9150016d3746ecc438863ceb12fb35c))
* **markdown:** end empty list items before later blocks ([#518](https://github.com/Firna-AI/conductive/issues/518)) ([78a6d65](https://github.com/Firna-AI/conductive/commit/78a6d6510fbf0879f70e13a15f1c645727a92fe3))
* **marketing:** keep site test output on the checkout mount ([#480](https://github.com/Firna-AI/conductive/issues/480)) ([f851106](https://github.com/Firna-AI/conductive/commit/f851106849e5ee1693b3d47f6793bc73cb9228d9))
* **marketing:** restore the picture capture command ([#486](https://github.com/Firna-AI/conductive/issues/486)) ([ebba9ff](https://github.com/Firna-AI/conductive/commit/ebba9ff0fb7fbfadb0263b5e5afbf37fa389e0df))
* **members:** isolate deleted-org cleanup steps ([#501](https://github.com/Firna-AI/conductive/issues/501)) ([cb2e9f9](https://github.com/Firna-AI/conductive/commit/cb2e9f9b054c6b541bb38a5d0351cd6161c28a27))
* **model-gateway:** enable production disconnect signals ([#479](https://github.com/Firna-AI/conductive/issues/479)) ([4d1535a](https://github.com/Firna-AI/conductive/commit/4d1535a75edd49e43e48e9dd891b5162c3225a3b))
* **operator:** retain focus after provider weight saves ([507ee23](https://github.com/Firna-AI/conductive/commit/507ee23f618b5f11674f140ce0004b8800b2b3c7))
* **orgs:** preserve fields during overlapping saves ([#535](https://github.com/Firna-AI/conductive/issues/535)) ([9dcdcf5](https://github.com/Firna-AI/conductive/commit/9dcdcf5213adf3e07c3318c868295c7d9b21347a))
* **orgs:** send overlapping org moves in call order ([#513](https://github.com/Firna-AI/conductive/issues/513)) ([92c23ed](https://github.com/Firna-AI/conductive/commit/92c23ed97f52232e26424c85103fcf18aa8648c6))
* **runner:** filter credential fragments from output ([#483](https://github.com/Firna-AI/conductive/issues/483)) ([70545b5](https://github.com/Firna-AI/conductive/commit/70545b5aca465d0ed8f92a2a12649fffb4bf3557))
* **runner:** fork a Codex conversation whose saved provider changed ([6f58a0e](https://github.com/Firna-AI/conductive/commit/6f58a0e4216a6dc02d222e223756dcf30426884e))
* **runner:** keep Codex output lines whole at U+2028 and U+2029 ([#474](https://github.com/Firna-AI/conductive/issues/474)) ([a1465da](https://github.com/Firna-AI/conductive/commit/a1465dac80d9b26975f1070e46a340a944e1ebc5))
* **runner:** keep the runner running after an out-of-memory kill ([#484](https://github.com/Firna-AI/conductive/issues/484)) ([c3fcfa0](https://github.com/Firna-AI/conductive/commit/c3fcfa040416ac8a0edac0d1d593d482bcedbb7e))
* **secrets:** name the session login in late recovery ([#527](https://github.com/Firna-AI/conductive/issues/527)) ([169b815](https://github.com/Firna-AI/conductive/commit/169b81515a06b7ead31d5a4f91dd913b6abe7dfb))
* **shell:** keep questions open while their writes run ([#497](https://github.com/Firna-AI/conductive/issues/497)) ([fe605f8](https://github.com/Firna-AI/conductive/commit/fe605f834f21d2bdd5f69c489db3596175a77d4b))
* **shortcuts:** leave keypad and address keys to browsers ([#512](https://github.com/Firna-AI/conductive/issues/512)) ([8a0a992](https://github.com/Firna-AI/conductive/commit/8a0a9920cf07a0fb2adce3a0f17d958047ab5a08))
* **software-image:** bound deploy poll responses ([#503](https://github.com/Firna-AI/conductive/issues/503)) ([bb0be18](https://github.com/Firna-AI/conductive/commit/bb0be18a6b87d01101bba4da1283087a0b9ea6b9))
* **terminal:** keep colours sent before the first show ([#533](https://github.com/Firna-AI/conductive/issues/533)) ([5f209e9](https://github.com/Firna-AI/conductive/commit/5f209e9fb4f55011331c9611265e134a855699a6))
* **terminal:** open hidden screens after the host gets a size ([#523](https://github.com/Firna-AI/conductive/issues/523)) ([cf8f1a8](https://github.com/Firna-AI/conductive/commit/cf8f1a8104b0204696910deff9f5b7f692d2dbc5))
* **tests:** drain runner input before attachment preparation ([#524](https://github.com/Firna-AI/conductive/issues/524)) ([acd683b](https://github.com/Firna-AI/conductive/commit/acd683be2936579556bd584f1c116f135645f168))
* **tests:** keep Worker fixtures outside the checkout ([#516](https://github.com/Firna-AI/conductive/issues/516)) ([e8f1270](https://github.com/Firna-AI/conductive/commit/e8f1270dbc4b9e975dbcc0150c0f420d0f10528e))
* **theme:** draw Mac key symbols in labels ([#482](https://github.com/Firna-AI/conductive/issues/482)) ([ad21e9e](https://github.com/Firna-AI/conductive/commit/ad21e9ed02452ba008c2f6d793605a89e8bbef4b))
* **workspaces:** preserve fields during partial list updates ([#490](https://github.com/Firna-AI/conductive/issues/490)) ([b99eb77](https://github.com/Firna-AI/conductive/commit/b99eb77a381f8023f8b47efa6a7abea6fdf165ce))


### Performance Improvements

* **chat:** persist released contexts by answer identity ([#536](https://github.com/Firna-AI/conductive/issues/536)) ([44e2443](https://github.com/Firna-AI/conductive/commit/44e24439e88e9eb4d748d95ca28bdd254e7e386d))
* **chat:** skip unchanged transcript rows ([#526](https://github.com/Firna-AI/conductive/issues/526)) ([0dd60af](https://github.com/Firna-AI/conductive/commit/0dd60af97cc3e328c29084a098ebbcb1112d1261))

## [0.26.0](https://github.com/Firna-AI/conductive/compare/v0.25.0...v0.26.0) (2026-11-18)


### Features

* **builds:** log the snapshot step in the build log ([#446](https://github.com/Firna-AI/conductive/issues/446)) ([989adcb](https://github.com/Firna-AI/conductive/commit/989adcb9319497507f9f6ab007ffdd3c094b1762))
* change the repository of a workspace ([#423](https://github.com/Firna-AI/conductive/issues/423)) ([424bf73](https://github.com/Firna-AI/conductive/commit/424bf736d1353631ca57e425a8140eb89aa1091d))
* **chat:** cut long Mac command output with a fade and Show all ([#450](https://github.com/Firna-AI/conductive/issues/450)) ([4f73d20](https://github.com/Firna-AI/conductive/commit/4f73d20d4cec6066c57ddb9083f5bc5e2091225c))
* **github:** follow repository renames and default branch changes ([#463](https://github.com/Firna-AI/conductive/issues/463)) ([9983ba5](https://github.com/Firna-AI/conductive/commit/9983ba58be06f4a082bc34a806d507b5853c73a0))
* **list:** pulse the workspace mark in blue while it needs input ([#460](https://github.com/Firna-AI/conductive/issues/460)) ([3d3a8b7](https://github.com/Firna-AI/conductive/commit/3d3a8b70b7850def94107f55eaa398b72447de3b))
* **palette:** add Merge latest to merge the target branch ([#442](https://github.com/Firna-AI/conductive/issues/442)) ([367ecff](https://github.com/Firna-AI/conductive/commit/367ecffa2027a17cf03694706923b772bb68b18b))
* remove archived workspaces from the list after 14 days ([#420](https://github.com/Firna-AI/conductive/issues/420)) ([1909ae3](https://github.com/Firna-AI/conductive/commit/1909ae3516107d18346b30be3dc7886aa09adb04))
* **runner:** identify runner program starts in safe warnings ([#448](https://github.com/Firna-AI/conductive/issues/448)) ([6b82c51](https://github.com/Firna-AI/conductive/commit/6b82c51767573920cea704b6587687aea1ffb757))
* **secrets:** let one Allow settle the requests that its grant covers ([#456](https://github.com/Firna-AI/conductive/issues/456)) ([2a0818f](https://github.com/Firna-AI/conductive/commit/2a0818f3d0d945b61b21c677c6e2008764a1cc50))
* **settings:** list chosen repositories with Edit for admins ([#452](https://github.com/Firna-AI/conductive/issues/452)) ([ac3825d](https://github.com/Firna-AI/conductive/commit/ac3825d69408fe4f356cd7ad402f07fd175509a8))
* **workspace:** open the workspace menu from the header name ([#462](https://github.com/Firna-AI/conductive/issues/462)) ([2d9335a](https://github.com/Firna-AI/conductive/commit/2d9335a67dafe6b6cff3e544d997c3ff14d39156))
* **workspaces:** move workspaces into or out of a parent ([#444](https://github.com/Firna-AI/conductive/issues/444)) ([aedaaec](https://github.com/Firna-AI/conductive/commit/aedaaec18507026c2294b67ed9577f28752f4121))


### Bug Fixes

* answer Durable Object restarts as 503, reconnect a dropped terminal once, and log unexpected errors safely ([#445](https://github.com/Firna-AI/conductive/issues/445)) ([8ae7c26](https://github.com/Firna-AI/conductive/commit/8ae7c26d1af951bdaf5fc1bb8b21e16e86f10852))
* **list:** show the bar's GitHub state in the list mark at once ([#455](https://github.com/Firna-AI/conductive/issues/455)) ([9cac31c](https://github.com/Firna-AI/conductive/commit/9cac31cda1d4c3d7ce69ac9051f176178074fbf6))
* **new-workspace:** align the dialog footer with the chat composer bar ([#443](https://github.com/Firna-AI/conductive/issues/443)) ([70baf6c](https://github.com/Firna-AI/conductive/commit/70baf6cd20c08f49ac02ca125deba3eeda0dc143))
* **secrets:** expose valid environment names and validate new names ([#453](https://github.com/Firna-AI/conductive/issues/453)) ([4ff3a95](https://github.com/Firna-AI/conductive/commit/4ff3a95a2b229c81c3e90f4ebc59cce19a93daa1))
* **titles:** try the workspace title request again when the model is slow ([#454](https://github.com/Firna-AI/conductive/issues/454)) ([01ffe33](https://github.com/Firna-AI/conductive/commit/01ffe33d2b4ccc12596acfe8e91bb42c572d21f2))
* **worker:** keep a failed automation report out of chat writes ([#449](https://github.com/Firna-AI/conductive/issues/449)) ([661dc48](https://github.com/Firna-AI/conductive/commit/661dc48be3ae54b9b03a41ec79add17175ff12b8))
* **workspace:** show the last tab again at a return to a workspace ([#459](https://github.com/Firna-AI/conductive/issues/459)) ([a179c07](https://github.com/Firna-AI/conductive/commit/a179c07a881608fe79f0d8468c960add86dceac3))

## [0.25.0](https://github.com/Firna-AI/conductive/compare/v0.24.0...v0.25.0) (2026-11-17)


### Features

* **agents:** tell agents when to nest a workspace ([#440](https://github.com/Firna-AI/conductive/issues/440)) ([4f09002](https://github.com/Firna-AI/conductive/commit/4f09002875bbb964e4179eac57360953a62de280))
* **capabilities:** pre-load the Capabilities of a workspace ([#433](https://github.com/Firna-AI/conductive/issues/433)) ([b82d8a0](https://github.com/Firna-AI/conductive/commit/b82d8a06f8adee9be630282e1178587aa470eccb))
* **capabilities:** start Mac access off in each workspace ([#435](https://github.com/Firna-AI/conductive/issues/435)) ([3638161](https://github.com/Firna-AI/conductive/commit/36381614a8b018add1a55399f5f0cfbb348dbfcc))
* **chat:** add runner connection and turn-end diagnostics ([#439](https://github.com/Firna-AI/conductive/issues/439)) ([273582d](https://github.com/Firna-AI/conductive/commit/273582d8a46fe4fc8ea108fa379324da1ac922d6))
* **github:** mark a draft pull request ready for review from the bar ([#437](https://github.com/Firna-AI/conductive/issues/437)) ([eed5a2f](https://github.com/Firna-AI/conductive/commit/eed5a2fd181753e7450a2028ef434ba408cd186e))
* **org-logins:** let admins share an org API key or endpoint ([#427](https://github.com/Firna-AI/conductive/issues/427)) ([9f1a392](https://github.com/Firna-AI/conductive/commit/9f1a3928321e9eeb7fd3698175f3f31801c9fa3f))
* **orgs:** let an admin pick a preset colour for each org ([#438](https://github.com/Firna-AI/conductive/issues/438)) ([94924b6](https://github.com/Firna-AI/conductive/commit/94924b6d59c57d5a230eb2350e84f2869c653c19))
* **terminal:** add shared terminal tabs to the Terminal tool ([#441](https://github.com/Firna-AI/conductive/issues/441)) ([6c93671](https://github.com/Firna-AI/conductive/commit/6c93671fd1bb7466dd63fa375a173f867f61f952))

## [0.24.0](https://github.com/Firna-AI/conductive/compare/v0.23.0...v0.24.0) (2026-11-17)


### Features

* **image-builds:** name the repository in the copy build log line ([#432](https://github.com/Firna-AI/conductive/issues/432)) ([6a8a2cd](https://github.com/Firna-AI/conductive/commit/6a8a2cd59422adae8b3d1600ff5726fd4db3ce18))
* **workspaces:** nest workspaces under a parent workspace ([#425](https://github.com/Firna-AI/conductive/issues/425)) ([eaf5e45](https://github.com/Firna-AI/conductive/commit/eaf5e458f6663a191b11722d20a51a5aedf1c875))


### Bug Fixes

* **runner:** ignore Codex subagent threads when tracking the active turn ([#430](https://github.com/Firna-AI/conductive/issues/430)) ([d12f7a2](https://github.com/Firna-AI/conductive/commit/d12f7a25dc768d81d5217d54f4c689c6cec80f74))

## [0.23.0](https://github.com/Firna-AI/conductive/compare/v0.22.0...v0.23.0) (2026-11-17)


### Features

* **chat:** add Close other tabs to the tab menu ([#424](https://github.com/Firna-AI/conductive/issues/424)) ([17d4b86](https://github.com/Firna-AI/conductive/commit/17d4b860da097bae6780bdcd0e3a49b8bab27f5a))
* **files:** add a menu with Add to chat and Copy path to Files rows ([#419](https://github.com/Firna-AI/conductive/issues/419)) ([8a0db96](https://github.com/Firna-AI/conductive/commit/8a0db96045c1109eab532e021c22a068593d8592))
* **previews:** show each previewed port in its own centre tab ([#421](https://github.com/Firna-AI/conductive/issues/421)) ([1e01de2](https://github.com/Firna-AI/conductive/commit/1e01de21fbab61769ee18dcd0b2386c4fcd27b9d))
* **secrets:** add agent secrets and Capabilities (milestones 1-3) ([#379](https://github.com/Firna-AI/conductive/issues/379)) ([a54fe39](https://github.com/Firna-AI/conductive/commit/a54fe39818b2bd5913c08d002800c48684fa1f93))
* **terminal:** focus the terminal after its tab or Go to Terminal ([#418](https://github.com/Firna-AI/conductive/issues/418)) ([e12c3cb](https://github.com/Firna-AI/conductive/commit/e12c3cb3de92764f865a67937801089caaad5bfe))

## [0.22.0](https://github.com/Firna-AI/conductive/compare/v0.21.0...v0.22.0) (2026-11-16)


### Features

* **account:** add a Stats tab with the person's own counts ([#405](https://github.com/Firna-AI/conductive/issues/405)) ([570ce50](https://github.com/Firna-AI/conductive/commit/570ce506be07327e02687744ce7bd45f40003407))
* **chat:** show file chips for paths in agent answers ([#361](https://github.com/Firna-AI/conductive/issues/361)) ([8781e0f](https://github.com/Firna-AI/conductive/commit/8781e0f14cd2ca3ceab4d797233c28bad015991c))
* **image-sources:** copy the repositories of an image job in parallel ([#399](https://github.com/Firna-AI/conductive/issues/399)) ([9d2f5ef](https://github.com/Firna-AI/conductive/commit/9d2f5ef0e8c7f79c4e870170b6fb2d2903acaa71))
* **previews:** give the preview opening page the app design ([#410](https://github.com/Firna-AI/conductive/issues/410)) ([07b13ec](https://github.com/Firna-AI/conductive/commit/07b13ec6c142f6af76d11e9345e95eeab64d3177))
* **runner:** install sandbox updates in place when the workspace is idle ([#408](https://github.com/Firna-AI/conductive/issues/408)) ([6ba9849](https://github.com/Firna-AI/conductive/commit/6ba984926a24a1e4a5f85e1269accd5658bca968))
* **shell:** open the workspace list as a popover of the org tile ([#416](https://github.com/Firna-AI/conductive/issues/416)) ([71188a5](https://github.com/Firna-AI/conductive/commit/71188a5223883fa274e39864c57bd812ee2a1b02))
* **workspace:** restart the software from the header state ([#414](https://github.com/Firna-AI/conductive/issues/414)) ([93ae7fc](https://github.com/Firna-AI/conductive/commit/93ae7fc22724e9ff70c3d1d718b6c38c76ff72df))


### Bug Fixes

* **ci:** align Mac preview test with the shared failure copy ([#413](https://github.com/Firna-AI/conductive/issues/413)) ([99ac7d1](https://github.com/Firna-AI/conductive/commit/99ac7d1404090f8805944afeb9d7cc3652948c58))
* **github:** stop the pull request bar flickering while a workspace loads ([#412](https://github.com/Firna-AI/conductive/issues/412)) ([55a3c13](https://github.com/Firna-AI/conductive/commit/55a3c13b67c77e0284923f2f0ad60424df064d14))
* **model-gateway:** keep answers streaming through slow turn checks ([#409](https://github.com/Firna-AI/conductive/issues/409)) ([7db34a2](https://github.com/Firna-AI/conductive/commit/7db34a2cd53d7f035f0066a7ab8b2945d717a95c))
* **relay:** restart the preview relay when a release applies ([#406](https://github.com/Firna-AI/conductive/issues/406)) ([6990279](https://github.com/Firna-AI/conductive/commit/699027931e00f214ef4ba734cdfd0907093590a7))
* **runner:** end a Claude turn after a wake-up reply for ended work ([#417](https://github.com/Firna-AI/conductive/issues/417)) ([5fcf1df](https://github.com/Firna-AI/conductive/commit/5fcf1df4b0ef528b2f4b38462c51cf62332787bc))
* **terminal:** keep typed commands in the shell history after a stop ([#415](https://github.com/Firna-AI/conductive/issues/415)) ([e7f9be8](https://github.com/Firna-AI/conductive/commit/e7f9be877d81c66972cf9c51527a725f053b7080))


### Performance Improvements

* **attachments:** check a file download sooner after its start ([#411](https://github.com/Firna-AI/conductive/issues/411)) ([83585f0](https://github.com/Firna-AI/conductive/commit/83585f0073b5b5df60d49488e40c1fe153db5084))

## [0.21.0](https://github.com/Firna-AI/conductive/compare/v0.20.0...v0.21.0) (2026-11-16)


### Features

* **attachments:** attach files of up to 1 GB ([#377](https://github.com/Firna-AI/conductive/issues/377)) ([4dde5db](https://github.com/Firna-AI/conductive/commit/4dde5db604cb6a4f0627ea5688a4fbecf7f07261))
* **chat:** show a spinner on working session tabs ([#347](https://github.com/Firna-AI/conductive/issues/347)) ([b088ba2](https://github.com/Firna-AI/conductive/commit/b088ba2bc3caa339457bbddd5e22fe3d524ce1df))
* **operator:** show the longest cloud computer runs on the Overview ([#403](https://github.com/Firna-AI/conductive/issues/403)) ([e37cdd4](https://github.com/Firna-AI/conductive/commit/e37cdd409a69e5e58413336c34526cb3e802ff99))

## [0.20.0](https://github.com/Firna-AI/conductive/compare/v0.19.0...v0.20.0) (2026-11-16)


### ⚠ BREAKING CHANGES

* **automations:** the routes /orgs/<id>/routines and the API paths under .../routines are now .../automations. Old links stop working. A browser tab with the old app must reload after the deploy.

### Bug Fixes

* keep model answers alive when the stream drops ([#400](https://github.com/Firna-AI/conductive/issues/400)) ([7543119](https://github.com/Firna-AI/conductive/commit/75431197322d409ceff7b2916749e1f81c555ab4))


### Code Refactoring

* **automations:** rename routines to automations ([#397](https://github.com/Firna-AI/conductive/issues/397)) ([acac23f](https://github.com/Firna-AI/conductive/commit/acac23f1ee45003cca21731c2d3d9f885b16ee4e))

## [0.19.0](https://github.com/Firna-AI/conductive/compare/v0.18.0...v0.19.0) (2026-11-16)


### Features

* **marketing:** bring back the pricing page and the billing plans ([#389](https://github.com/Firna-AI/conductive/issues/389)) ([f9e7385](https://github.com/Firna-AI/conductive/commit/f9e7385e74a0f1c63336fc0fa1ad03551e4cadf3))
* **operator:** show the last active time of each user ([#398](https://github.com/Firna-AI/conductive/issues/398)) ([196da17](https://github.com/Firna-AI/conductive/commit/196da1706f4345ba1035f25189f404bd77f40803))
* **sections:** name a new section in a dialog, below its section ([#392](https://github.com/Firna-AI/conductive/issues/392)) ([078cd6d](https://github.com/Firna-AI/conductive/commit/078cd6d6374209e3c70c56ec197cbd8e83664a24))
* **terminal:** open terminal links with Cmd+click or a tap ([#366](https://github.com/Firna-AI/conductive/issues/366)) ([0cb4fca](https://github.com/Firna-AI/conductive/commit/0cb4fca25b1734b22a418151b5269cf86e855c6e))
* **workspaces:** name a new branch after its workspace title ([#396](https://github.com/Firna-AI/conductive/issues/396)) ([30e00d3](https://github.com/Firna-AI/conductive/commit/30e00d326143f388b0ba5195b4719b3035ebe108))


### Bug Fixes

* **chat:** leave attached image names out of titles ([#395](https://github.com/Firna-AI/conductive/issues/395)) ([e5ed12b](https://github.com/Firna-AI/conductive/commit/e5ed12bb0e824854d9a6f189ec748fd3f468eeb4))
* **relay:** keep the provider's connection open after each reply ([#394](https://github.com/Firna-AI/conductive/issues/394)) ([14bc9d6](https://github.com/Firna-AI/conductive/commit/14bc9d6b03166d9c5b576a4550ae9ef2429271a0))


### Performance Improvements

* **images:** skip the parts of the software step that the image holds ([#390](https://github.com/Firna-AI/conductive/issues/390)) ([4373e14](https://github.com/Firna-AI/conductive/commit/4373e1450b6d31cd09af2b44674c9a4d49dcb44d))

## [0.18.0](https://github.com/Firna-AI/conductive/compare/v0.17.0...v0.18.0) (2026-11-16)


### Features

* **account:** save a Codex own endpoint with its /v1 base ([#371](https://github.com/Firna-AI/conductive/issues/371)) ([54e6d29](https://github.com/Firna-AI/conductive/commit/54e6d298032ad31411ff73aa9ff47579d97bcf01))
* **chat:** add Close tabs to the right to the tab menu ([#384](https://github.com/Firna-AI/conductive/issues/384)) ([c6d3d59](https://github.com/Firna-AI/conductive/commit/c6d3d5949c3c41f9fdb7ef908e6e104352065350))
* **chat:** attach a large paste as a text file ([#385](https://github.com/Firna-AI/conductive/issues/385)) ([6b82e7e](https://github.com/Firna-AI/conductive/commit/6b82e7e6abe144c8f7d65a00e24c2f87cb15e3c1))
* **chat:** make web addresses in chat text pressable ([#386](https://github.com/Firna-AI/conductive/issues/386)) ([57e504d](https://github.com/Firna-AI/conductive/commit/57e504daad161303a8333e7456266b4675c720af))
* **files:** show the saved lists while a sandbox starts ([#364](https://github.com/Firna-AI/conductive/issues/364)) ([ed0fb94](https://github.com/Firna-AI/conductive/commit/ed0fb94946f08ffb3e538b96dc7354d6fed158f2))
* **marketing:** remove the Conductor comparison page ([#380](https://github.com/Firna-AI/conductive/issues/380)) ([8872e92](https://github.com/Firna-AI/conductive/commit/8872e9252811b3debbf6a610eaf4c26115451404))
* **operator:** show the email address on the page of a user ([#381](https://github.com/Firna-AI/conductive/issues/381)) ([eedd836](https://github.com/Firna-AI/conductive/commit/eedd836791eaf1793563a4fc4ad207398cdc60a1))
* Rust sandbox software that updates itself ([#342](https://github.com/Firna-AI/conductive/issues/342)) ([a20746b](https://github.com/Firna-AI/conductive/commit/a20746b99e043918ed36ab291e5d72d5f3f05980))
* **terminal:** keep the full output history with a control-mode bridge ([#369](https://github.com/Firna-AI/conductive/issues/369)) ([b7fc103](https://github.com/Firna-AI/conductive/commit/b7fc10313c1c5bf827c46aa5609dd714a1908fc0))


### Bug Fixes

* **chat:** close session tabs optimistically ([#388](https://github.com/Firna-AI/conductive/issues/388)) ([16f063e](https://github.com/Firna-AI/conductive/commit/16f063e3bd60f44ad3c63967c07808db6a37c836))
* **chat:** colour Mac commands ([#356](https://github.com/Firna-AI/conductive/issues/356)) ([a182c40](https://github.com/Firna-AI/conductive/commit/a182c40ed7a63fa1e0bb35e37215b17a1b3387a8))
* **chat:** hide +0 on turn file chips without line changes ([#362](https://github.com/Firna-AI/conductive/issues/362)) ([b56cb68](https://github.com/Firna-AI/conductive/commit/b56cb686c593f9166da66e519ea893afd5133ce6))
* **chat:** put the caret at the end of a kept draft on focus ([#357](https://github.com/Firna-AI/conductive/issues/357)) ([450a3eb](https://github.com/Firna-AI/conductive/commit/450a3eb8b35b45e8a3bd97e2a6592cc31579ced8))
* **chat:** reopen a closed session from its session link ([#373](https://github.com/Firna-AI/conductive/issues/373)) ([ce180c2](https://github.com/Firna-AI/conductive/commit/ce180c2c9eb8b27963f54bac58e6e0eb2bfeb74f))
* **marketing:** mark chat skill selection in progress ([#363](https://github.com/Firna-AI/conductive/issues/363)) ([b714557](https://github.com/Firna-AI/conductive/commit/b7145572b9a5f1fd879545ac33738ae7a0d911ec))
* **marketing:** reflect chat, terminal, and file startup progress ([#367](https://github.com/Firna-AI/conductive/issues/367)) ([7355693](https://github.com/Firna-AI/conductive/commit/7355693077577ba3d524b8a0aa54736ef38bd2fc))
* **marketing:** reflect larger attachment upload progress ([#372](https://github.com/Firna-AI/conductive/issues/372)) ([76172c6](https://github.com/Firna-AI/conductive/commit/76172c6d24a21ab3ebfa65a4bc437da246973461))
* **marketing:** reflect saved file lists during startup ([#370](https://github.com/Firna-AI/conductive/issues/370)) ([f5baad3](https://github.com/Firna-AI/conductive/commit/f5baad305be0886f0123ba81196aeb8625abe068))
* **marketing:** reflect session link and secret plans ([#375](https://github.com/Firna-AI/conductive/issues/375)) ([0fca3ff](https://github.com/Firna-AI/conductive/commit/0fca3ffa8b847d227ae193e075e7339e70dd4bff))
* **marketing:** reflect target branch selection progress ([#376](https://github.com/Firna-AI/conductive/issues/376)) ([09be0b3](https://github.com/Firna-AI/conductive/commit/09be0b3dfe0fa227b241709d6a5ea49ad8c79678))
* **marketing:** reflect terminal scrollback work ([#368](https://github.com/Firna-AI/conductive/issues/368)) ([a3b4072](https://github.com/Firna-AI/conductive/commit/a3b40728547676ce558fad6affb514b98248644a))
* open a workspace with one tap on a phone ([#383](https://github.com/Firna-AI/conductive/issues/383)) ([61a3afe](https://github.com/Firna-AI/conductive/commit/61a3afec5b2114e56182c24d5c1ce28153ef52b4))
* **phone:** stop the page scroll and thin the session tab row ([#374](https://github.com/Firna-AI/conductive/issues/374)) ([200cdbe](https://github.com/Firna-AI/conductive/commit/200cdbec0e2a164404c79569ff3d2642a27176da))
* **sidebar:** use a cog for org settings ([#360](https://github.com/Firna-AI/conductive/issues/360)) ([9db90d7](https://github.com/Firna-AI/conductive/commit/9db90d7b6a8ff51a1711040513a4a78060a05d01))


### Performance Improvements

* **lifecycle:** answer a workspace create sooner ([#365](https://github.com/Firna-AI/conductive/issues/365)) ([a86b8f4](https://github.com/Firna-AI/conductive/commit/a86b8f4845e8b1246de12b007c8e543b7352bfec))

## [0.17.0](https://github.com/Firna-AI/conductive/compare/v0.16.0...v0.17.0) (2026-11-13)


### ⚠ BREAKING CHANGES

* **runner:** remove protocol version 1 ([#339](https://github.com/Firna-AI/conductive/issues/339))

### Features

* **account:** move the agents to their own Account tab ([#333](https://github.com/Firna-AI/conductive/issues/333)) ([b52b9bb](https://github.com/Firna-AI/conductive/commit/b52b9bbdd3c12d443cea452e44d40f85b59d54d6))
* **desktop:** extend the 15 minutes of Allow all on the Mac ([#326](https://github.com/Firna-AI/conductive/issues/326)) ([36c32f3](https://github.com/Firna-AI/conductive/commit/36c32f3256120260181580bab871b92a71e072f7))
* **fast-mode:** add a Fast switch to the model menu ([#349](https://github.com/Firna-AI/conductive/issues/349)) ([e81823c](https://github.com/Firna-AI/conductive/commit/e81823c5c013e485e5c5254ffc579df0917bb596))
* **files:** open files in one temporary tab ([#345](https://github.com/Firna-AI/conductive/issues/345)) ([f935c84](https://github.com/Firna-AI/conductive/commit/f935c84c4b1f404450a49a1bc0f2e2d00ffc3d73))
* **github:** show Push when only unpushed commits are left ([#341](https://github.com/Firna-AI/conductive/issues/341)) ([e44c3e6](https://github.com/Firna-AI/conductive/commit/e44c3e69138f5bdaa24a32e7e7df521ffd98822e))
* **list:** reorder sections by drag and by the section menu ([#351](https://github.com/Firna-AI/conductive/issues/351)) ([f9c0804](https://github.com/Firna-AI/conductive/commit/f9c0804659fe06094bf398c47e1bb3bbd12b0c62))
* **mac:** move This Mac to its own tab and cut long commands short ([#337](https://github.com/Firna-AI/conductive/issues/337)) ([787a9a8](https://github.com/Firna-AI/conductive/commit/787a9a87999f44f814804acb82e0ddeddfdc980f))
* **marketing:** remove the pricing page and the billing plans ([#343](https://github.com/Firna-AI/conductive/issues/343)) ([c194159](https://github.com/Firna-AI/conductive/commit/c194159bf1b4410f74d3a37f1bf6b0b04e1a8c0d))
* **models:** offer Max and Ultra on Codex, Ultra and Extra high on Claude ([#344](https://github.com/Firna-AI/conductive/issues/344)) ([0692f4e](https://github.com/Firna-AI/conductive/commit/0692f4ef25bc16ebef04d055ac3a2a8be00f92bf))
* **orgs:** open the last workspace of each org ([#353](https://github.com/Firna-AI/conductive/issues/353)) ([4fb7633](https://github.com/Firna-AI/conductive/commit/4fb76331fdc4e2722d814f722767f7baf8af3714))
* **tabs:** keep the reader's place in each tab ([#350](https://github.com/Firna-AI/conductive/issues/350)) ([974690b](https://github.com/Firna-AI/conductive/commit/974690bf00719dbc018c0357fe854f874b4fe188))


### Bug Fixes

* **marketing:** reflect shipped tab and section controls ([#355](https://github.com/Firna-AI/conductive/issues/355)) ([e20d431](https://github.com/Firna-AI/conductive/commit/e20d431a352962063e3a3e9bc1348f4b13aa0f30))
* **marketing:** refresh Conductor feature progress ([#352](https://github.com/Firna-AI/conductive/issues/352)) ([6fed65e](https://github.com/Firna-AI/conductive/commit/6fed65e6f38c5e1b88f7c2e0cc32fa5f61d977d3))
* **shell:** show the rail org name on hover, not after a click ([#346](https://github.com/Firna-AI/conductive/issues/346)) ([ce9313b](https://github.com/Firna-AI/conductive/commit/ce9313bba01ce3ae9723d391566a6c55a82f7eb3))


### Code Refactoring

* **runner:** remove protocol version 1 ([#339](https://github.com/Firna-AI/conductive/issues/339)) ([b409ef7](https://github.com/Firna-AI/conductive/commit/b409ef7f2a63de3065ed756e66871a3a3491aa85))

## [0.16.0](https://github.com/Firna-AI/conductive/compare/v0.15.0...v0.16.0) (2026-11-13)


### Features

* **attachments:** raise the file limit to 100 MB ([#323](https://github.com/Firna-AI/conductive/issues/323)) ([e49fd5e](https://github.com/Firna-AI/conductive/commit/e49fd5e2e7c90484f2e0d06a3eeb3afe1fe6f629))
* **chat:** add a Copy code button to code blocks ([#309](https://github.com/Firna-AI/conductive/issues/309)) ([246e2d7](https://github.com/Firna-AI/conductive/commit/246e2d787025de390f0de633801a60172e00cfd2))
* **chat:** attach a dropped folder as a zip ([#324](https://github.com/Firna-AI/conductive/issues/324)) ([0d943b6](https://github.com/Firna-AI/conductive/commit/0d943b69cfaf52f15c164dc4711fe022543916c9))
* **chat:** keep the other agent in a session with no message ([#295](https://github.com/Firna-AI/conductive/issues/295)) ([979d760](https://github.com/Firna-AI/conductive/commit/979d7603480398320bdbe2e98087cb16a29eb60d))
* **chat:** limit the files at the end of a turn ([#331](https://github.com/Firna-AI/conductive/issues/331)) ([4a5702e](https://github.com/Firna-AI/conductive/commit/4a5702ea3450db4d98a3d32c739e252dcc24edde))
* **chat:** take a file drop anywhere on the chat column ([#332](https://github.com/Firna-AI/conductive/issues/332)) ([094beb9](https://github.com/Firna-AI/conductive/commit/094beb99e26a39cfa4810b44fc125243c4f39b4f))
* **list:** rename a workspace with a double click on its sidebar row ([#321](https://github.com/Firna-AI/conductive/issues/321)) ([403db36](https://github.com/Firna-AI/conductive/commit/403db364f2e353ee25efdce7f517a5c4b09757c8))
* **mac:** allow all Mac commands until Stop ([#325](https://github.com/Firna-AI/conductive/issues/325)) ([87dbb94](https://github.com/Firna-AI/conductive/commit/87dbb9469697e4513d2d7bcafa607070c0e57f22))
* **new-workspace:** open New workspace as the dialog for new accounts ([#330](https://github.com/Firna-AI/conductive/issues/330)) ([d800916](https://github.com/Firna-AI/conductive/commit/d800916aa3e14c631c1e43d6ebc4e135baf8296c))
* **new-workspace:** pick the section in the New workspace dialog ([#315](https://github.com/Firna-AI/conductive/issues/315)) ([dd0841c](https://github.com/Firna-AI/conductive/commit/dd0841c7812571be842c722f232de2b0faca25a1))
* **orgs:** let each person reorder the orgs in the rail ([#293](https://github.com/Firna-AI/conductive/issues/293)) ([731b107](https://github.com/Firna-AI/conductive/commit/731b1077b4955173de97b47b76b2d8287b4b3348))
* **previews:** show the Worker's step times in Server-Timing ([#301](https://github.com/Firna-AI/conductive/issues/301)) ([72b85ec](https://github.com/Firna-AI/conductive/commit/72b85ec8f03141767518aaf07cdd7cba8add6070))
* **runner:** raise the background work limit to 30 days ([#335](https://github.com/Firna-AI/conductive/issues/335)) ([de2df9f](https://github.com/Firna-AI/conductive/commit/de2df9fe05b8b9b441e2ff00def30bb2ef695746))


### Bug Fixes

* **agent-tools:** split the tool install into commands under 64 KiB ([#314](https://github.com/Firna-AI/conductive/issues/314)) ([379f606](https://github.com/Firna-AI/conductive/commit/379f60628a38f1840e2e58f70d3ad27b120e6eb3))
* **app:** draw Archive on the pull request bar as an outline button ([#322](https://github.com/Firna-AI/conductive/issues/322)) ([9d9571c](https://github.com/Firna-AI/conductive/commit/9d9571cd5d06d4cf84b1f2de2526f8567de2a8d8))
* **chat:** scroll to the bottom when the user sends a message ([#317](https://github.com/Firna-AI/conductive/issues/317)) ([0786b88](https://github.com/Firna-AI/conductive/commit/0786b8865875fa1edff515872feaedaccd411d4f))
* **github:** show the known pull request state at once ([#298](https://github.com/Firna-AI/conductive/issues/298)) ([85ca44e](https://github.com/Firna-AI/conductive/commit/85ca44e9690590e19f51253d876618d0b63f333d))
* **list:** show the pull request bar state in the list mark ([#334](https://github.com/Firna-AI/conductive/issues/334)) ([cc3ea64](https://github.com/Firna-AI/conductive/commit/cc3ea6470ca9fe25fb8f246be5643d7f522ceb6d))
* **mac:** make Stop on the 15 minutes bar an outline button ([#308](https://github.com/Firna-AI/conductive/issues/308)) ([caeaaf0](https://github.com/Firna-AI/conductive/commit/caeaaf0ed017f928c244fa68f97b0596a3a9676a))
* **marketing:** mark personal org order as available ([#306](https://github.com/Firna-AI/conductive/issues/306)) ([879ebd1](https://github.com/Firna-AI/conductive/commit/879ebd1f24b408f5ccbe3c89cb0e644e494fb4dc))
* **marketing:** mark the public changelog as in progress ([#329](https://github.com/Firna-AI/conductive/issues/329)) ([63b116a](https://github.com/Firna-AI/conductive/commit/63b116a3bda1b2d82df71416cd2fc562112d62c8))
* **marketing:** refresh comparison after recent feature work ([#328](https://github.com/Firna-AI/conductive/issues/328)) ([0eb698c](https://github.com/Firna-AI/conductive/commit/0eb698c6322797feae0404ae75737f7336e0c0f3))
* **marketing:** refresh pending comparison features ([#312](https://github.com/Firna-AI/conductive/issues/312)) ([c0b510e](https://github.com/Firna-AI/conductive/commit/c0b510e1f20aee1f9215742465bbc0470fb145b7))
* **marketing:** refresh shipped comparison features ([#336](https://github.com/Firna-AI/conductive/issues/336)) ([e46dd76](https://github.com/Firna-AI/conductive/commit/e46dd76ac653f85bddaa0b5271cc91ea6b53cfe9))
* **marketing:** track pending org order and agent switching ([#300](https://github.com/Firna-AI/conductive/issues/300)) ([8b5eee1](https://github.com/Firna-AI/conductive/commit/8b5eee17a9f5dc2c8247a8ae307710d13735d18a))
* **menus:** flip shell menus that would pass the window edge ([#316](https://github.com/Firna-AI/conductive/issues/316)) ([5b46e12](https://github.com/Firna-AI/conductive/commit/5b46e12d2bb00900633f66e135be3156c89c9c13))
* **software-image:** split the tools install under the argument limit ([#305](https://github.com/Firna-AI/conductive/issues/305)) ([0ab26e0](https://github.com/Firna-AI/conductive/commit/0ab26e0d441b0dbe770e11bf44755017fbd4d25f))
* **tools:** keep Preview mounted while another tool shows ([#320](https://github.com/Firna-AI/conductive/issues/320)) ([ae280d2](https://github.com/Firna-AI/conductive/commit/ae280d21422e2059f51b3c3c7ce36d8fcf97ee7b))


### Performance Improvements

* **image:** stop disk flushes in sandboxes ([#294](https://github.com/Firna-AI/conductive/issues/294)) ([4f9071d](https://github.com/Firna-AI/conductive/commit/4f9071df6ea15c9d224989d93018d357f70239cc))
* **previews:** check each preview viewer once a second ([#307](https://github.com/Firna-AI/conductive/issues/307)) ([b755f0b](https://github.com/Firna-AI/conductive/commit/b755f0bb54801c5156489043daa83cedf867c9bb))
* **workspace:** show an Archive at once, and undo it on failure ([#318](https://github.com/Firna-AI/conductive/issues/318)) ([3286994](https://github.com/Firna-AI/conductive/commit/3286994b6b6647a85add1b8f84fa2cf96b274e6b))

## [0.15.0](https://github.com/Firna-AI/conductive/compare/v0.14.0...v0.15.0) (2026-11-12)


### Features

* **chat:** load the newest chat history first ([#281](https://github.com/Firna-AI/conductive/issues/281)) ([f13c083](https://github.com/Firna-AI/conductive/commit/f13c083005b1bde6d6ebee12cccdf8214e38355d))
* **files:** list context folder files in All files ([#288](https://github.com/Firna-AI/conductive/issues/288)) ([ad6e2ba](https://github.com/Firna-AI/conductive/commit/ad6e2bad5352b4b1437e25c59b8dd1edb439c3da))
* **menus:** add Copy link to the workspace and session tab menus ([#292](https://github.com/Firna-AI/conductive/issues/292)) ([5bd05b4](https://github.com/Firna-AI/conductive/commit/5bd05b46c05312164ea67862b625f5286ef32196))
* **sidebar:** focus the message box after a click on a workspace ([#279](https://github.com/Firna-AI/conductive/issues/279)) ([2d0e217](https://github.com/Firna-AI/conductive/commit/2d0e2174d5687ba8c94e2dba20444621cef4b958))


### Bug Fixes

* **files:** name a file tab from its read when no list holds the file ([#289](https://github.com/Firna-AI/conductive/issues/289)) ([c710a30](https://github.com/Firna-AI/conductive/commit/c710a306c10ac331e23d89d9f4efde44b71e4130))
* **marketing:** refresh merged and pending comparison features ([#296](https://github.com/Firna-AI/conductive/issues/296)) ([82951d4](https://github.com/Firna-AI/conductive/commit/82951d42cc6c66cc8d6c017fb10f7a4a9876e30f))
* **workspace:** show Starting, not a Resume bar, while an open resumes ([#290](https://github.com/Firna-AI/conductive/issues/290)) ([8c49081](https://github.com/Firna-AI/conductive/commit/8c49081e304c1070a6e2e09a89c49e3a7e93cc97))


### Performance Improvements

* **chat:** show a sent message at once and clear the composer ([#285](https://github.com/Firna-AI/conductive/issues/285)) ([9457304](https://github.com/Firna-AI/conductive/commit/9457304f6c5b22379a1ccf53222596476cd2b925))

## [0.14.0](https://github.com/Firna-AI/conductive/compare/v0.13.0...v0.14.0) (2026-11-12)


### Features

* add own endpoint logins for Claude and Codex ([#263](https://github.com/Firna-AI/conductive/issues/263)) ([579ad69](https://github.com/Firna-AI/conductive/commit/579ad69850e002bbd4810f38f7ffa8cad86b7f2e))
* **files:** show syntax colours in diffs ([#276](https://github.com/Firna-AI/conductive/issues/276)) ([9b0bbcb](https://github.com/Firna-AI/conductive/commit/9b0bbcbb2f86d588940839d939e5d24032ef9acd))
* **model-gateway:** route ChatGPT through a Cloudflare Container ([#287](https://github.com/Firna-AI/conductive/issues/287)) ([1f1b54a](https://github.com/Firna-AI/conductive/commit/1f1b54aa4f97a524bb091db4cae2f721cff58121))
* **terminal:** plan terminal tabs and draw their mockups ([#280](https://github.com/Firna-AI/conductive/issues/280)) ([b1874ca](https://github.com/Firna-AI/conductive/commit/b1874ca947ae5d85671b7afda771ce4c81f24a74))
* **workspace:** resize the split between the files and the tools ([#283](https://github.com/Firna-AI/conductive/issues/283)) ([ade62e3](https://github.com/Firna-AI/conductive/commit/ade62e35e2abcde25199790116c47467f370df79))


### Bug Fixes

* **account:** follow background model list reads in an open tab ([579ad69](https://github.com/Firna-AI/conductive/commit/579ad69850e002bbd4810f38f7ffa8cad86b7f2e))
* **account:** keep the model list in the reply of a share change ([579ad69](https://github.com/Firna-AI/conductive/commit/579ad69850e002bbd4810f38f7ffa8cad86b7f2e))
* **chat:** name the model of the failed Codex message ([579ad69](https://github.com/Firna-AI/conductive/commit/579ad69850e002bbd4810f38f7ffa8cad86b7f2e))
* **marketing:** refresh Conductor comparison notes ([#282](https://github.com/Firna-AI/conductive/issues/282)) ([cc472bb](https://github.com/Firna-AI/conductive/commit/cc472bb002d3182e3bd6bffeb84fbd777596941b))
* **marketing:** track vertical panel resizing in progress ([#286](https://github.com/Firna-AI/conductive/issues/286)) ([1c66e33](https://github.com/Firna-AI/conductive/commit/1c66e330f852c6f72d60463e7a15d124b5d212c5))
* **model-gateway:** keep ordinary request paths in endpoint answers ([579ad69](https://github.com/Firna-AI/conductive/commit/579ad69850e002bbd4810f38f7ffa8cad86b7f2e))
* **ui:** make menu hover visible and show the pointer cursor ([#278](https://github.com/Firna-AI/conductive/issues/278)) ([8057cac](https://github.com/Firna-AI/conductive/commit/8057cacd3bd0cfddb2002ecbe8939f24bd633f70))

## [0.13.0](https://github.com/Firna-AI/conductive/compare/v0.12.0...v0.13.0) (2026-11-12)


### Features

* **agent-tools:** manage workspaces, sessions, sections, and previews ([#267](https://github.com/Firna-AI/conductive/issues/267)) ([b8ed3c8](https://github.com/Firna-AI/conductive/commit/b8ed3c8f69e7ab69e8324860e48287812d9432ea))
* **list:** run the mark light while checks run ([#277](https://github.com/Firna-AI/conductive/issues/277)) ([d789f9e](https://github.com/Firna-AI/conductive/commit/d789f9e904dfb4a74497f473c665cd3baed43e17))
* **previews:** put Close on each preview tab ([#255](https://github.com/Firna-AI/conductive/issues/255)) ([10da61a](https://github.com/Firna-AI/conductive/commit/10da61afdb00e9e32b374c86a2db342ac7e436e7))


### Bug Fixes

* **list:** brighten the working light of the workspace mark ([#274](https://github.com/Firna-AI/conductive/issues/274)) ([e778799](https://github.com/Firna-AI/conductive/commit/e778799c7a77d2041e28088deb584cc4da029775))
* **list:** keep the Archived group as it was after an Archive ([#271](https://github.com/Firna-AI/conductive/issues/271)) ([b504e8b](https://github.com/Firna-AI/conductive/commit/b504e8b8ab8a9d5e700c9a2aad99104434975166))

## [0.12.0](https://github.com/Firna-AI/conductive/compare/v0.11.0...v0.12.0) (2026-11-11)


### Features

* **chat:** drop files into the composer as chips in the text ([#266](https://github.com/Firna-AI/conductive/issues/266)) ([ece84da](https://github.com/Firna-AI/conductive/commit/ece84da697ad840368e21f0bf5e3bd80e1f8215b))


### Bug Fixes

* **mac:** close menus on a press on a top bar ([#268](https://github.com/Firna-AI/conductive/issues/268)) ([7700c8f](https://github.com/Firna-AI/conductive/commit/7700c8f6301ead7bf18c136f3186bd17875a0b31))


### Performance Improvements

* **lifecycle:** run start D1 and Boat calls outside the chat queue ([#261](https://github.com/Firna-AI/conductive/issues/261)) ([a822367](https://github.com/Firna-AI/conductive/commit/a82236777bb99ff7fecf6bd89d1d95baca4975dc))

## [0.11.0](https://github.com/Firna-AI/conductive/compare/v0.10.0...v0.11.0) (2026-11-11)


### Features

* **shortcuts:** add keyboard shortcuts and their settings tab ([#216](https://github.com/Firna-AI/conductive/issues/216)) ([0ad6a1c](https://github.com/Firna-AI/conductive/commit/0ad6a1c6f47a1de4c070cc1348869feaa8992676))

## [0.10.0](https://github.com/Firna-AI/conductive/compare/v0.9.1...v0.10.0) (2026-11-11)


### Features

* **chat:** draw Markdown headings in agent messages ([#244](https://github.com/Firna-AI/conductive/issues/244)) ([4374132](https://github.com/Firna-AI/conductive/commit/43741329ba2817835dbfec17e602895485301267))
* **workspaces:** show GitHub state in workspace marks ([#208](https://github.com/Firna-AI/conductive/issues/208)) ([eb34094](https://github.com/Firna-AI/conductive/commit/eb340941118ea2b35e4987808f186472a961ded0))


### Bug Fixes

* **ci:** keep the ChatGPT host helper private ([#262](https://github.com/Firna-AI/conductive/issues/262)) ([9125746](https://github.com/Firna-AI/conductive/commit/91257465c22f54287ee0bd6a69168350e45a964f))
* **files:** keep a lazy list line from becoming a heading underline ([4374132](https://github.com/Firna-AI/conductive/commit/43741329ba2817835dbfec17e602895485301267))
* **github:** read GitHub only for workspaces that a webhook can change ([#251](https://github.com/Firna-AI/conductive/issues/251)) ([c53e7fd](https://github.com/Firna-AI/conductive/commit/c53e7fd0ed1d53c80eb2d9352a95c349aa001423))
* **github:** skip archived workspaces when a webhook arrives ([#249](https://github.com/Firna-AI/conductive/issues/249)) ([dae46ac](https://github.com/Firna-AI/conductive/commit/dae46acdcdaf822b294001399fef9669c5ea6b93))
* **marketing:** update agent controls and changelog statuses ([#248](https://github.com/Firna-AI/conductive/issues/248)) ([f51097b](https://github.com/Firna-AI/conductive/commit/f51097b8b602d1a3cebe93e7f36b3bc0c2dd63b9))
* **model-gateway:** send chatgpt.com requests through an egress proxy ([#259](https://github.com/Firna-AI/conductive/issues/259)) ([dfd2ebf](https://github.com/Firna-AI/conductive/commit/dfd2ebf15c861b9e2f2b2ebde711e702f08fa870))
* **runner:** keep turns open for background work ([#245](https://github.com/Firna-AI/conductive/issues/245)) ([6b21ea3](https://github.com/Firna-AI/conductive/commit/6b21ea3412e045710a630fb13a16d6c0f3acc389))
* **runner:** name MCP tools in chat and let agents use the desktop ([#247](https://github.com/Firna-AI/conductive/issues/247)) ([1b2579d](https://github.com/Firna-AI/conductive/commit/1b2579df1e054e4d1b336231b45dc1d2074709b9))


### Performance Improvements

* **github:** read pull request banners in one GraphQL query ([#254](https://github.com/Firna-AI/conductive/issues/254)) ([8576421](https://github.com/Firna-AI/conductive/commit/8576421df2fbebf1a74af8cb936b273563911193))

## [0.9.1](https://github.com/Firna-AI/conductive/compare/v0.9.0...v0.9.1) (2026-11-11)


### Bug Fixes

* **marketing:** refresh chat and workspace progress ([#241](https://github.com/Firna-AI/conductive/issues/241)) ([cb67e06](https://github.com/Firna-AI/conductive/commit/cb67e0610c941177485e61eef9b0b014ebe503f0))


### Performance Improvements

* **chat:** read session history in a few large pages ([#242](https://github.com/Firna-AI/conductive/issues/242)) ([9188144](https://github.com/Firna-AI/conductive/commit/91881446b4f2ad50fe7ed68892d98228d8eb4f38))
* **chat:** show the chat while the session history loads ([#239](https://github.com/Firna-AI/conductive/issues/239)) ([2b3a3e0](https://github.com/Firna-AI/conductive/commit/2b3a3e03aedd88a518d2da521aa11051e39ac1c1))

## [0.9.0](https://github.com/Firna-AI/conductive/compare/v0.8.0...v0.9.0) (2026-11-11)


### Features

* **github:** add pull request bar actions and Continue ([#176](https://github.com/Firna-AI/conductive/issues/176)) ([d7a8a0c](https://github.com/Firna-AI/conductive/commit/d7a8a0c97d520359d813899dd7a6f506c246cdc0))
* **logins:** connect Codex to a ChatGPT plan with device sign-in ([#177](https://github.com/Firna-AI/conductive/issues/177)) ([d970f26](https://github.com/Firna-AI/conductive/commit/d970f263a4f45b2c2918324dfe3de217d6320ee7))
* **marketing:** add approved social link preview ([#228](https://github.com/Firna-AI/conductive/issues/228)) ([b5dbada](https://github.com/Firna-AI/conductive/commit/b5dbada1f924bad7703b686c40bb6ef55d57c4c1))


### Bug Fixes

* **chat:** keep only the newest run of tool calls open during a turn ([#167](https://github.com/Firna-AI/conductive/issues/167)) ([23628f7](https://github.com/Firna-AI/conductive/commit/23628f77b7f0dc8ecb8740a7242e666da53e799f))
* **github:** keep agent pushes working and explain access failures ([#235](https://github.com/Firna-AI/conductive/issues/235)) ([36c3b17](https://github.com/Firna-AI/conductive/commit/36c3b17cb9cf11c1f7d59da6971eee4e854448f4))
* **github:** show why Git got no GitHub access ([36c3b17](https://github.com/Firna-AI/conductive/commit/36c3b17cb9cf11c1f7d59da6971eee4e854448f4))
* **github:** tint merged pull requests purple ([#234](https://github.com/Firna-AI/conductive/issues/234)) ([acd22d5](https://github.com/Firna-AI/conductive/commit/acd22d551f4e60e36a7b8878e7fa01c1cb096107))
* **marketing:** mark session links available in Conductor comparison ([#227](https://github.com/Firna-AI/conductive/issues/227)) ([5759a4b](https://github.com/Firna-AI/conductive/commit/5759a4b9a5f4f442e6713cb5cefd9097a89c0004))
* **marketing:** note planned background work and manual logins ([#237](https://github.com/Firna-AI/conductive/issues/237)) ([32d09c4](https://github.com/Firna-AI/conductive/commit/32d09c4ee3507e0330bfbc2b5778ea277ab2b3d6))
* **marketing:** refresh Conductor comparison statuses ([#229](https://github.com/Firna-AI/conductive/issues/229)) ([f5eb804](https://github.com/Firna-AI/conductive/commit/f5eb804fcc2007b3348fa76d67d759363d01fb3d))
* **release:** use the renamed repository Firna-AI/conductive ([#233](https://github.com/Firna-AI/conductive/issues/233)) ([16c0aac](https://github.com/Firna-AI/conductive/commit/16c0aac8b95fe639a303d3a558c0e04645aa23e7))


### Performance Improvements

* **previews:** let the viewer's browser cache preview files ([#232](https://github.com/Firna-AI/conductive/issues/232)) ([cad6880](https://github.com/Firna-AI/conductive/commit/cad68800a023c0832a13604c06482f305c2d3ae5))

## [0.8.0](https://github.com/Firna-AI/remote-code/compare/v0.7.0...v0.8.0) (2026-11-11)


### Features

* **agent-tools:** manage sessions across workspaces ([#215](https://github.com/Firna-AI/remote-code/issues/215)) ([80401a0](https://github.com/Firna-AI/remote-code/commit/80401a0656c7be96cd863563d5efdc3347d44fbd))
* **chat:** mark models that open a new session with an icon ([#203](https://github.com/Firna-AI/remote-code/issues/203)) ([def319a](https://github.com/Firna-AI/remote-code/commit/def319a5d59e2656035332c3ee3a4786217f5187))
* **feedback:** send feedback from the command palette ([#201](https://github.com/Firna-AI/remote-code/issues/201)) ([1da13cc](https://github.com/Firna-AI/remote-code/commit/1da13cc149ede213e4a7c4c9c69233b04936841e))
* **new-workspace:** add Cloud computer settings to the build notice ([#189](https://github.com/Firna-AI/remote-code/issues/189)) ([8f3d52a](https://github.com/Firna-AI/remote-code/commit/8f3d52aad40a329bb162110a0a97fcfd73b09930))
* **waitlist:** add a global waitlist switch ([#135](https://github.com/Firna-AI/remote-code/issues/135)) ([067e82b](https://github.com/Firna-AI/remote-code/commit/067e82b63d79a9fd945357a311e19275caf42cd1))


### Bug Fixes

* **marketing:** mark agent session reads and GitHub list marks in progress ([#206](https://github.com/Firna-AI/remote-code/issues/206)) ([ce5ca2d](https://github.com/Firna-AI/remote-code/commit/ce5ca2d1384d457196a9c6720c51dda91068efc5))
* **marketing:** mark file drops and image tab previews in progress ([#221](https://github.com/Firna-AI/remote-code/issues/221)) ([31d7b33](https://github.com/Firna-AI/remote-code/commit/31d7b3300c505983b7a1d8baad2785c6fe1f3035))
* **marketing:** note routine sections and older workspace updates ([#225](https://github.com/Firna-AI/remote-code/issues/225)) ([d1dc058](https://github.com/Firna-AI/remote-code/commit/d1dc058d877afa4f61d76aca9fd1aabf42a3d06d))
* **marketing:** reflect approved work in Conductor comparison ([#212](https://github.com/Firna-AI/remote-code/issues/212)) ([c135170](https://github.com/Firna-AI/remote-code/commit/c13517063d4ee89ab156798946ead424044c036f))
* **marketing:** reflect planned file drops and Codex ChatGPT sign-in ([#202](https://github.com/Firna-AI/remote-code/issues/202)) ([03ea2ce](https://github.com/Firna-AI/remote-code/commit/03ea2ce5497229aece8fbd53ac588371a1e455be))
* **marketing:** refresh comparison from recent workspace activity ([#198](https://github.com/Firna-AI/remote-code/issues/198)) ([e5aea6c](https://github.com/Firna-AI/remote-code/commit/e5aea6c749fa6277dd02abac3bd8375a1b3fbf7a))
* **marketing:** refresh planned features in Conductor comparison ([#205](https://github.com/Firna-AI/remote-code/issues/205)) ([5dd38af](https://github.com/Firna-AI/remote-code/commit/5dd38af5f515972eeafdcdfcbdab6bbc248b163b))
* **marketing:** update session link and heading statuses ([#219](https://github.com/Firna-AI/remote-code/issues/219)) ([81fa409](https://github.com/Firna-AI/remote-code/commit/81fa4094f112ff9282ca334a2938d36f15c46e03))
* **runner:** watch the live repository after the disk restore ends ([#226](https://github.com/Firna-AI/remote-code/issues/226)) ([84bdcb2](https://github.com/Firna-AI/remote-code/commit/84bdcb29ec613d430328e0a8d4aa5e5aea4ce2a1))
* **titles:** replace underscores in model workspace names ([#197](https://github.com/Firna-AI/remote-code/issues/197)) ([f874827](https://github.com/Firna-AI/remote-code/commit/f8748270919b3d0f9db8f5db35e23fad2ea0033d))


### Performance Improvements

* **previews:** check preview bodies in larger reads ([#210](https://github.com/Firna-AI/remote-code/issues/210)) ([94f5781](https://github.com/Firna-AI/remote-code/commit/94f578126efb654e26e01da9479b35cdd7ab993e))

## [0.7.0](https://github.com/Firna-AI/remote-code/compare/v0.6.0...v0.7.0) (2026-11-10)


### Features

* **routines:** name the refused login in its own error field ([d39e64e](https://github.com/Firna-AI/remote-code/commit/d39e64eb1ee3949f4ddd905f890adce3a544169a))
* **routines:** start agent runs on schedules and pull request events ([#182](https://github.com/Firna-AI/remote-code/issues/182)) ([d39e64e](https://github.com/Firna-AI/remote-code/commit/d39e64eb1ee3949f4ddd905f890adce3a544169a))


### Bug Fixes

* **app:** restore the New workspace row styles ([d39e64e](https://github.com/Firna-AI/remote-code/commit/d39e64eb1ee3949f4ddd905f890adce3a544169a))
* **marketing:** mark routines as available on the comparison page ([d39e64e](https://github.com/Firna-AI/remote-code/commit/d39e64eb1ee3949f4ddd905f890adce3a544169a))
* **marketing:** reflect planned chat links and import progress ([#195](https://github.com/Firna-AI/remote-code/issues/195)) ([b0fecbe](https://github.com/Firna-AI/remote-code/commit/b0fecbe5507501a4db15e53f7eadbba7eb62bf61))


### Performance Improvements

* **workspaces:** hibernate idle workspace connections ([#148](https://github.com/Firna-AI/remote-code/issues/148)) ([247c772](https://github.com/Firna-AI/remote-code/commit/247c772afaf09cae29856f67dc4ada41b646cb20))

## [0.6.0](https://github.com/Firna-AI/remote-code/compare/v0.5.0...v0.6.0) (2026-11-10)


### Features

* build added repositories and show what waits for a build ([#188](https://github.com/Firna-AI/remote-code/issues/188)) ([b25d8e0](https://github.com/Firna-AI/remote-code/commit/b25d8e0d3021d6235b827c49ad0c04bb933b8655))
* **chat:** copy session transcripts as Markdown ([#164](https://github.com/Firna-AI/remote-code/issues/164)) ([5d56546](https://github.com/Firna-AI/remote-code/commit/5d56546ceba68d6e19c3a673df1e18460f0164dc))
* **chat:** nest lists and keep list numbers in agent answers ([#161](https://github.com/Firna-AI/remote-code/issues/161)) ([39b0941](https://github.com/Firna-AI/remote-code/commit/39b09416c13d1c038bd0b4876424608f70abea07))
* **marketing:** add check time, row links, and local Conductor rows ([#175](https://github.com/Firna-AI/remote-code/issues/175)) ([08cbe3c](https://github.com/Firna-AI/remote-code/commit/08cbe3cd07ce4e3b0394e499d909a43f6add4c47))
* **marketing:** add the public pricing page ([#170](https://github.com/Firna-AI/remote-code/issues/170)) ([871adca](https://github.com/Firna-AI/remote-code/commit/871adcac0952309a34647793582540ea37f68387))
* **previews:** detect running servers in Preview ([#154](https://github.com/Firna-AI/remote-code/issues/154)) ([27f888f](https://github.com/Firna-AI/remote-code/commit/27f888f4a600ffa399f26c54bf269b220b06ecf3))
* **previews:** label the new tab link of a preview "Open" ([#191](https://github.com/Firna-AI/remote-code/issues/191)) ([2008305](https://github.com/Firna-AI/remote-code/commit/20083050b2f427b4ddd30df9aa6843525bb8edd0))
* **software-image:** start first builds from a shared image ([#180](https://github.com/Firna-AI/remote-code/issues/180)) ([4249b33](https://github.com/Firna-AI/remote-code/commit/4249b33de2b026b08415e3a02b686981daf820b6))
* **worker:** turn on Cloudflare Issues error tracking ([#178](https://github.com/Firna-AI/remote-code/issues/178)) ([c47330b](https://github.com/Firna-AI/remote-code/commit/c47330bded028cc6f8f59572f04bd359bef641fc))
* **workspaces:** archive at once and restore within 14 days ([#138](https://github.com/Firna-AI/remote-code/issues/138)) ([8eaf4b2](https://github.com/Firna-AI/remote-code/commit/8eaf4b21e3e788f82b13b3f794142e7753f99b43))
* **workspaces:** keep attachments and notes in .context ([#168](https://github.com/Firna-AI/remote-code/issues/168)) ([6fd184c](https://github.com/Firna-AI/remote-code/commit/6fd184c53e77dee208687512244ebcaf5fa120e9))


### Bug Fixes

* **chat:** remove the label under queued messages ([#165](https://github.com/Firna-AI/remote-code/issues/165)) ([1e6e28b](https://github.com/Firna-AI/remote-code/commit/1e6e28b7912bbcf22ff1e096d0c1d9bbd89af87e))
* **files:** wait for the sandbox, and start it when a file opens ([#171](https://github.com/Firna-AI/remote-code/issues/171)) ([46769d9](https://github.com/Firna-AI/remote-code/commit/46769d979ff1151cf9cfaf02a4e4de0e9e582057))
* **github:** return to the screen where a GitHub App change started ([#169](https://github.com/Firna-AI/remote-code/issues/169)) ([16b6c5f](https://github.com/Firna-AI/remote-code/commit/16b6c5f7d996594c228972975d5cc49c821f2a7d))
* **marketing:** reflect planned terminal tabs and fast mode ([#190](https://github.com/Firna-AI/remote-code/issues/190)) ([ee6a69c](https://github.com/Firna-AI/remote-code/commit/ee6a69cd965967b0d38f59879cbda109e4c178ee))
* **marketing:** refresh comparison after recent merges ([#184](https://github.com/Firna-AI/remote-code/issues/184)) ([d1abf38](https://github.com/Firna-AI/remote-code/commit/d1abf38e582db8342ba27b7bab6d18c9509f1ca2))
* **runner:** list the changed files of a stopped turn ([#187](https://github.com/Firna-AI/remote-code/issues/187)) ([7273571](https://github.com/Firna-AI/remote-code/commit/72735714007be58da19cb37d03e03f8d508971fa))
* **test-support:** await native input before draining output ([27f888f](https://github.com/Firna-AI/remote-code/commit/27f888f4a600ffa399f26c54bf269b220b06ecf3))
* **workspaces:** give commits in cloud computers an author ([#181](https://github.com/Firna-AI/remote-code/issues/181)) ([076ce5c](https://github.com/Firna-AI/remote-code/commit/076ce5c1b12bf97d9ae06d2759fc69784374ed1c))

## [0.5.0](https://github.com/Firna-AI/remote-code/compare/v0.4.0...v0.5.0) (2026-11-10)


### Features

* **chat:** add the @ list of files and file chips ([#145](https://github.com/Firna-AI/remote-code/issues/145)) ([df93a19](https://github.com/Firna-AI/remote-code/commit/df93a19147b1b63b877575ef9e344201c5856a4a))
* **gateway:** keep agent logins out of cloud computers ([#173](https://github.com/Firna-AI/remote-code/issues/173)) ([a200a53](https://github.com/Firna-AI/remote-code/commit/a200a5326f3e13d3ec71a2d64d504622d9e183a5))
* keep one record of every cloud computer ([#151](https://github.com/Firna-AI/remote-code/issues/151)) ([a1bbd7f](https://github.com/Firna-AI/remote-code/commit/a1bbd7f8c6f72faa1d43facdd515e541c245c7db))
* **marketing:** add Markdown product documentation ([#133](https://github.com/Firna-AI/remote-code/issues/133)) ([8567cfb](https://github.com/Firna-AI/remote-code/commit/8567cfb620d9ecea59d555cae594dd29ce383d58))
* **models:** offer GPT-6 Astra, GPT-6.1 Terra, and GPT-6 Luna ([#155](https://github.com/Firna-AI/remote-code/issues/155)) ([24601a3](https://github.com/Firna-AI/remote-code/commit/24601a32115f4c76dbefbe401e3296b089709b31))
* **previews:** give previewed servers their local Host through a relay ([#160](https://github.com/Firna-AI/remote-code/issues/160)) ([0315aa5](https://github.com/Firna-AI/remote-code/commit/0315aa5e354c76c86b903e67766cf1ef99fe46ec))
* **workspaces:** add right-click workspace actions ([#139](https://github.com/Firna-AI/remote-code/issues/139)) ([ebfc286](https://github.com/Firna-AI/remote-code/commit/ebfc286b19198bd489997102f497944b13e4a743))


### Bug Fixes

* **lifecycle:** scope computer ledger identities by provider account ([5095987](https://github.com/Firna-AI/remote-code/commit/50959871fa67d377d3e24c475ac02574739240f0))
* **marketing:** make the website logo 25 px high ([#136](https://github.com/Firna-AI/remote-code/issues/136)) ([ba0c19d](https://github.com/Firna-AI/remote-code/commit/ba0c19d411a4132ee5b0c20862a3c6f221f6c6e0))
* **marketing:** mark workspace Restore as in progress ([fe295f3](https://github.com/Firna-AI/remote-code/commit/fe295f385e35a0bd33e674da1f58de0f8fe2dd1b))
* **marketing:** refresh comparison docs and planned features ([#157](https://github.com/Firna-AI/remote-code/issues/157)) ([7c8bcde](https://github.com/Firna-AI/remote-code/commit/7c8bcdec09296da27102519346e6b44a32be6680))
* **marketing:** refresh comparison feature progress ([3369dea](https://github.com/Firna-AI/remote-code/commit/3369dead6a28f1fb24cc05d57bf65a6e2f292242))
* **marketing:** refresh comparison progress and billing scope ([#150](https://github.com/Firna-AI/remote-code/issues/150)) ([cd233db](https://github.com/Firna-AI/remote-code/commit/cd233dbd4740b701405c64b7caaea35b41442b19))
* **members:** close owner popover when preview takes focus ([#149](https://github.com/Firna-AI/remote-code/issues/149)) ([92f9397](https://github.com/Firna-AI/remote-code/commit/92f9397745bec38138ba33733dca801b5aba7551))
* **merge:** combine provider accounts and the computer ledger ([d4ff458](https://github.com/Firna-AI/remote-code/commit/d4ff45868cbf99052a6a666eccb04ca7dfcb64fe))
* **terminal:** select and copy text while programs use the mouse ([#172](https://github.com/Firna-AI/remote-code/issues/172)) ([fcc2444](https://github.com/Firna-AI/remote-code/commit/fcc24440603171fc9c7b695c6bea8990ae5508b4))
* **workspaces:** remove the start limit note from the chat ([#162](https://github.com/Firna-AI/remote-code/issues/162)) ([ae736ab](https://github.com/Firna-AI/remote-code/commit/ae736ab5f23708d66ec684586cd3faf706ea6a4d))

## [0.4.0](https://github.com/Firna-AI/remote-code/compare/v0.3.0...v0.4.0) (2026-11-10)


### Features

* add chat attachments and lifecycle, doc, and chat write fixes ([#90](https://github.com/Firna-AI/remote-code/issues/90)) ([ab58467](https://github.com/Firna-AI/remote-code/commit/ab5846798e6a4994de212b361fdb793a2a2c8ba8))
* **marketing:** add Mac app downloads to the site ([#130](https://github.com/Firna-AI/remote-code/issues/130)) ([073f71b](https://github.com/Firna-AI/remote-code/commit/073f71b57dbf2b9cc4e6a61d155c8b3d1ac9c0ab))


### Bug Fixes

* **marketing:** align Conductor comparison with active work ([#144](https://github.com/Firna-AI/remote-code/issues/144)) ([83dfb14](https://github.com/Firna-AI/remote-code/commit/83dfb14b15fab476d75133a5f9f77db8fbca7064))
* **marketing:** mark merged chat attachments as available ([#147](https://github.com/Firna-AI/remote-code/issues/147)) ([1a9e75a](https://github.com/Firna-AI/remote-code/commit/1a9e75a7a075f3360aa2b4681761cd85f49a8d4d))
* **marketing:** refresh Conductor comparison progress ([552222e](https://github.com/Firna-AI/remote-code/commit/552222e992a168f4696793c178c7a59c5164988a))

## [0.3.0](https://github.com/Firna-AI/remote-code/compare/v0.2.0...v0.3.0) (2026-11-10)


### Features

* **chat:** render Markdown tables in agent replies ([#119](https://github.com/Firna-AI/remote-code/issues/119)) ([712afd8](https://github.com/Firna-AI/remote-code/commit/712afd8f97dd2264e570b9b05fa3db87bc39163e))
* draw Mac app downloads and give release DMGs fixed names ([#128](https://github.com/Firna-AI/remote-code/issues/128)) ([c49a4f8](https://github.com/Firna-AI/remote-code/commit/c49a4f8e52a92dc9abcf645681851c4402296740))
* **marketing:** add the Conductor Cloud feature comparison ([#129](https://github.com/Firna-AI/remote-code/issues/129)) ([8999b4b](https://github.com/Firna-AI/remote-code/commit/8999b4b46f356fee1245905843b91c22fe8024d2))
* **models:** deploy the model list from the repository ([#131](https://github.com/Firna-AI/remote-code/issues/131)) ([422f96e](https://github.com/Firna-AI/remote-code/commit/422f96e72f862e636d583c9193fee7472d06d6fb))
* **runner:** send stable workspace instructions and sender context ([#112](https://github.com/Firna-AI/remote-code/issues/112)) ([de36738](https://github.com/Firna-AI/remote-code/commit/de367388a42b4e4940abc6a522dc73bdf7751cb6))
* **waitlist:** add controlled access and invite codes ([#116](https://github.com/Firna-AI/remote-code/issues/116)) ([af96807](https://github.com/Firna-AI/remote-code/commit/af96807f6b1ee20fabd73df0bdd664f15423d5ec))
* **workspaces:** add workspace numbers and link chips ([#118](https://github.com/Firna-AI/remote-code/issues/118)) ([374260b](https://github.com/Firna-AI/remote-code/commit/374260b8509a2bce3145f2583ddb28f5c650ee39))


### Bug Fixes

* **chat:** add space between workspace chips and the cursor ([#125](https://github.com/Firna-AI/remote-code/issues/125)) ([3875aa0](https://github.com/Firna-AI/remote-code/commit/3875aa05d343588e4a702301f02eb4fab8c8df88))
* **chat:** align history button and hide it when empty ([#126](https://github.com/Firna-AI/remote-code/issues/126)) ([718e192](https://github.com/Firna-AI/remote-code/commit/718e19200ee7aa2776a886a80d2f0849144c81f6))
* **desktop:** configure preview origins in Mac builds ([#114](https://github.com/Firna-AI/remote-code/issues/114)) ([8bccd3c](https://github.com/Firna-AI/remote-code/commit/8bccd3ca5c1003dadaad1aa165510085aa58e8b1))
* **github:** authenticate CLI commands in cloud computers ([#110](https://github.com/Firna-AI/remote-code/issues/110)) ([7e23773](https://github.com/Firna-AI/remote-code/commit/7e23773fe8b13ecd1b11c6292a3c5d417360715c))
* **mail:** send Resend requests that the Workers runtime accepts ([#132](https://github.com/Firna-AI/remote-code/issues/132)) ([b9d3f40](https://github.com/Firna-AI/remote-code/commit/b9d3f40bf6896aa79b110bd579a67b46450ec054))
* **marketing:** refresh Conductor comparison statuses ([#134](https://github.com/Firna-AI/remote-code/issues/134)) ([fc2c009](https://github.com/Firna-AI/remote-code/commit/fc2c0099d457a206606d2693649caa78fb638c56))
* **mockups:** move the invite code to the end of the Account page ([af96807](https://github.com/Firna-AI/remote-code/commit/af96807f6b1ee20fabd73df0bdd664f15423d5ec))
* **previews:** preserve the launch page referrer policy ([#113](https://github.com/Firna-AI/remote-code/issues/113)) ([fc2f874](https://github.com/Firna-AI/remote-code/commit/fc2f874472218a68382dc7af2f2191739c12db31))
* reorder section menu actions ([#117](https://github.com/Firna-AI/remote-code/issues/117)) ([d4c2f12](https://github.com/Firna-AI/remote-code/commit/d4c2f12cfe45be5149af81e1ed0e3e21a340a4ac))
* **terminal:** restore output history scrolling ([#115](https://github.com/Firna-AI/remote-code/issues/115)) ([e6ebc09](https://github.com/Firna-AI/remote-code/commit/e6ebc0912384dacb386f8418363bedb9be7f6a66))
* **terminal:** show only the current folder in the prompt ([#127](https://github.com/Firna-AI/remote-code/issues/127)) ([68e001d](https://github.com/Firna-AI/remote-code/commit/68e001d145025033b96a0d464b8178dcb2506a37))
* **worker:** keep the scheduled repairs going when an email retry fails ([af96807](https://github.com/Firna-AI/remote-code/commit/af96807f6b1ee20fabd73df0bdd664f15423d5ec))
* **workspace:** remove the branch name from the header ([#122](https://github.com/Firna-AI/remote-code/issues/122)) ([b5ac64c](https://github.com/Firna-AI/remote-code/commit/b5ac64c27724085e9e502905ce51ef26c3c9bb5b))
* **workspaces:** move Archive to workspace rows ([#124](https://github.com/Firna-AI/remote-code/issues/124)) ([c02744f](https://github.com/Firna-AI/remote-code/commit/c02744f0ae9834e246d72ece451e6e9e99eaff4a))

## [0.2.0](https://github.com/Firna-AI/remote-code/compare/v0.1.0...v0.2.0) (2026-11-09)


### Features

* **onboarding:** build the cloud computer of a new org automatically ([#92](https://github.com/Firna-AI/remote-code/issues/92)) ([701c753](https://github.com/Firna-AI/remote-code/commit/701c753caf6c71a9a356ce7fd306304a0df22389))
* **tabs:** move any tab by drag or from a tab menu ([623dbe5](https://github.com/Firna-AI/remote-code/commit/623dbe511918adc39799693ba559838550cdb116))


### Bug Fixes

* **desktop:** pass signing secrets to the reusable release job ([#109](https://github.com/Firna-AI/remote-code/issues/109)) ([ed88e9b](https://github.com/Firna-AI/remote-code/commit/ed88e9b194241e3e73453664b254822adcb719a5))
* **marketing:** complete the Terms and Privacy pages ([#97](https://github.com/Firna-AI/remote-code/issues/97)) ([dbb3d26](https://github.com/Firna-AI/remote-code/commit/dbb3d26d71d40b15af83c6e4ea1492c404939c06))
* restore cursor at end of New workspace drafts ([#105](https://github.com/Firna-AI/remote-code/issues/105)) ([f1eb355](https://github.com/Firna-AI/remote-code/commit/f1eb3555ff8c6cdcccc11c68f08cb98216d823a3))
* **workspace:** hide the Desktop panel for now ([#107](https://github.com/Firna-AI/remote-code/issues/107)) ([7ebecf7](https://github.com/Firna-AI/remote-code/commit/7ebecf778382075fef1d1fb3a372ebda45a7e45f))

## 0.1.0 (2026-11-09)


### Features

* add Preferences and a New workspace dialog ([#73](https://github.com/Firna-AI/remote-code/issues/73)) ([50a4e5e](https://github.com/Firna-AI/remote-code/commit/50a4e5e814d5344731d8c4c10a0a730f5b8dd23d))
* add the operator section: stats, search, suspend, lift ([#89](https://github.com/Firna-AI/remote-code/issues/89)) ([fc36467](https://github.com/Firna-AI/remote-code/commit/fc36467f14dc6b19ca461541e7e1da8677ce5733))
* **chat:** fold the work of an ended turn ([#91](https://github.com/Firna-AI/remote-code/issues/91)) ([97f90da](https://github.com/Firna-AI/remote-code/commit/97f90da1b2e1d7d863a217799575b897d1caded3))
* **desktop:** publish signed Mac releases and enable updates ([#100](https://github.com/Firna-AI/remote-code/issues/100)) ([307dd03](https://github.com/Firna-AI/remote-code/commit/307dd03eaab4be99a22b58676e6ee3fe34e2f24b))
* keep the workspace after a failed first start ([#86](https://github.com/Firna-AI/remote-code/issues/86)) ([690353a](https://github.com/Firna-AI/remote-code/commit/690353aa692dc044012fca65a7eda262eed6f5ec))
* **marketing:** add GitHub link to the site navigation ([#99](https://github.com/Firna-AI/remote-code/issues/99)) ([a899886](https://github.com/Firna-AI/remote-code/commit/a8998869f6812b34ac198bfe407238287c59a4ea))
* name new workspaces from their first message ([#87](https://github.com/Firna-AI/remote-code/issues/87)) ([e7aa864](https://github.com/Firna-AI/remote-code/commit/e7aa8641340c4d05e183215c3a96751f7404d8ff))
* **palette:** show the state of data that did not load ([#84](https://github.com/Firna-AI/remote-code/issues/84)) ([8cf1599](https://github.com/Firna-AI/remote-code/commit/8cf15996ac5a6a85dee54f632a77a628d1d3ca7f))
* **tools:** list repositories, sections, and models for agents ([#88](https://github.com/Firna-AI/remote-code/issues/88)) ([9f651e1](https://github.com/Firna-AI/remote-code/commit/9f651e1de51764ebaec31fa015cfa0218b54afb8))


### Bug Fixes

* **chat:** name only another member's login, inside the composer box ([c7cec44](https://github.com/Firna-AI/remote-code/commit/c7cec44e9f7d7479b66ef9bb04ced833d94d9871))
* **chat:** remove the steer hint below the message box ([da8f051](https://github.com/Firna-AI/remote-code/commit/da8f0519e9fc22ac609e4242a5bb555fccceeb6f))
* **chat:** restore automatic workspace titles ([#101](https://github.com/Firna-AI/remote-code/issues/101)) ([54a5b2e](https://github.com/Firna-AI/remote-code/commit/54a5b2e326df996dfa62bc12ce21c44374b3fe4f))
* **github:** return users to the app after a GitHub App install ([#68](https://github.com/Firna-AI/remote-code/issues/68)) ([6c3a1f3](https://github.com/Firna-AI/remote-code/commit/6c3a1f3174de21aa5dda8890e315138fa36313f1))
* **list:** keep one draft for General ([50a4e5e](https://github.com/Firna-AI/remote-code/commit/50a4e5e814d5344731d8c4c10a0a730f5b8dd23d))
* **runner:** match background results to outstanding user input ([#83](https://github.com/Firna-AI/remote-code/issues/83)) ([6d0b648](https://github.com/Firna-AI/remote-code/commit/6d0b64878c878733fd37b676c037c7aa348073eb))
* **shell:** give the focus back after a press outside a modal layer ([50a4e5e](https://github.com/Firna-AI/remote-code/commit/50a4e5e814d5344731d8c4c10a0a730f5b8dd23d))
* **tools:** give an unknown CLI command the command help ([9f651e1](https://github.com/Firna-AI/remote-code/commit/9f651e1de51764ebaec31fa015cfa0218b54afb8))
