## Learned User Preferences

- Run connector tests and harness with `/opt/homebrew/opt/node@22/bin/node`; system `node` hits a dyld error on this machine.
- Before releasing connector versions, validate in Loom visually (avatars, media posters, clickable body links, link cards)—not only unit tests or the redacted live harness.
- When Loom behavior is unclear, compare against official Tapestry connectors and community repos (simonbs/tapestry-plugins, otaviocc/tapestry-connectors, chockenberry/TapestryConnectors).
- Use the tapestry-connector skill and `loom_connector_harness.mjs` for supplemental Loom validation when UI automation is blocked.
- Always bump versions with Loom-facing changes: `plugin-config.json` `version`, matching `connectorPluginVersion` in `plugin.js`, and `connectorBuildId` for reload smoke tests (plus `VERSION` / `connectorRelease` when shipping). Prefer running the live harness and Loom reload checks yourself rather than only proposing a plan.
- Keep external article URLs and @handles as clickable `<a href>` in `item.body`; do not strip article URLs just because a `LinkAttachment` exists.
- When durable Loom/connector lessons land, update the tapestry-connector skill (`references/loom-links-actions-feeds.md`) so agents stay in sync.
- Auth UI/credentials: `auth_token` + `ct0` only—do not expose or require a raw Cookie Header field.
- Feed display names use the `X · …` pattern (e.g. `X · Following Feed`) for verify/feed list titles. Keep `default_service_name_visibility: "visible"` so card Service chrome stays `service_name` ("X"); `hidden` removes that chrome entirely.
- Chronological thread ordering applies only when opening a thread via the thread action icon—not for ordinary item/detail navigation.
- Retweet chrome: omit the small annotation avatar/@handle on non-retweets; for retweets, annotation is `Reposted by @reposter` and the main `Identity` is the original author.

## Learned Workspace Facts

- This repo is the X/Twitter Tapestry connector under `local.x.timeline/`; the distributable archive is `XTapestry.tapestry`.
- Loom 2.0.11 / API 1.10 does not persist remote `pbs.twimg.com` URLs on native `Identity.avatar` (and often card/thumbnail images) even when JS assignment succeeds; fetch during load and embed as Base64 data URLs before assignment when possible.
- Author identity should use `Identity.create` or `Identity.createWithName` plus explicit property assignment; assign `item.author` after body, annotations, attachments, and actions.
- Loom reload verification: Web Inspector should show `[local.x.timeline] load build=<connectorBuildId> release=<VERSION> plugin=<version> avatars=embedded-data-url` and the connector panel should match `plugin-config.json` version.
- Treat source folder, built `.tapestry`, installed release asset, and Loom-selected working copy as separate artifacts—rebuild, sync, and reload after behavior changes; working copies often live under `~/Library/Containers/com.iconfactory.MuxerMobile/Data/tmp/XTapestry/`.
- Saved Loom feed settings live at `~/Library/Containers/com.iconfactory.TapestryLoom/Data/Library/Application Support/feeds/local.x.timeline.json`.
- `LinkAttachment` appears in the timeline only—not detail—so body must retain clickable external links; strip only media/t.co placeholders from body HTML.
- Do not gate body linkify / `isWebUrl` / `urlHost` on `new URL()` alone—Loom/JSC can reject usable URLs and leave plain black text; use regex fallbacks, a final force-linkify pass that skips URLs inside open HTML tags, and prefer caption vs URL in separate `<p>` blocks.
- Link-card resolution ladder: native X card → TweetDetail → FxTwitter → OG; many publishers (e.g. Reuters) block OG with DataDome—prefer X/FxTwitter card payloads and embed `card_img` as data URLs.
- When timeline omits media entities, backfill via TweetDetail then FxTwitter; set `provides_attachments: true`; use `MediaAttachment` with `video/mp4` plus poster. Loom’s “Player for URL not supported” is a preview limitation—verify playback in the Tapestry app.
- For You = `HomeTimeline`, Following = `HomeLatestTimeline`; keep separate `source_mode` choices and sync keys. Stale GraphQL query IDs return HTTP 404 and should trigger rediscovery; `account/settings.json` 404 is not a session failure. Card actions toggle like/repost/bookmark via GraphQL `FavoriteTweet`/`UnfavoriteTweet`, `CreateRetweet`/`DeleteRetweet`, `CreateBookmark`/`DeleteBookmark`.
- Avatar/user parsing must retain full `user_results` wrapper layers (legacy profile image may sit on the outer wrapper); Loom and the Node harness can diverge on the same feed.
