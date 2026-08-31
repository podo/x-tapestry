# X Connector Design

## Item model

- Each item represents one X post and is ordered newest first by the post timestamp.
- The author identity is always populated from the post author, including the X profile avatar when the payload provides one. Profile images from `pbs.twimg.com` are fetched during load and embedded as Base64 data URLs before assignment, because Loom 2.0.11 does not persist remote twimg URLs on native `Identity.avatar` even though assignment succeeds for `name`, `username`, and `uri`.
- Native media attachments are emitted with the post: photos, videos, and animated GIFs retain their thumbnail, MIME type, dimensions, and alt text when available. Tapestry normally renders native attachments below the HTML body, and a post may contain up to four media attachments.
- If a host runtime does not expose the native media constructors, the connector keeps a small escaped inline media fallback and leaves Tapestry's automatic attachment extraction enabled so the app can recover the image/video from the body.
- A native poll is emitted as a poll attachment. A quoted post is emitted as a quoted item attachment after the parent post's media, poll, or link card.
- A rich link card is emitted when X provides card metadata and no renderable media or poll already represents the same link. The body keeps the readable post text while the card's media, title, summary, publisher, and destination are rendered by Tapestry. Media and card `t.co` placeholders are hidden from the body.
- If X has no native card metadata, an expanded external URL may receive a fetched Open Graph/Twitter preview, without sending X session cookies to that external site.

## Feed modes and interactions

- Following Feed is the default collection mode and reads the authenticated account's home timeline.
- Individual Accounts reads one or more configured handles. Search Query reads X search results with the configured filters and ranking.
- Initial loads are bounded by the configured batch size. Incremental refresh uses the persisted high-water mark and stops after the connector's bounded page limit or a known item.
- The `thread` context action opens the post's X conversation through the Tweet Detail endpoint. Action failures are surfaced to Tapestry.
- Collection feeds keep the X service icon; a single-account feed may use that account's avatar for identification.

## Loom completion checklist

- Run verification and load with redacted variables; never print cookie or token values.
- Verify collection feeds retain the X service icon and author avatars are populated.
- Verify photo, video, and GIF attachments are present, with video thumbnails and dimensions where supplied.
- Verify rich link cards render title, summary, publisher, image, aspect ratio, and destination.
- Verify media/card placeholder URLs are absent from the body when a native attachment renders.
- Verify the inline fallback is used only when native media constructors are unavailable and does not duplicate native media in normal runtimes.
- Verify quoted posts, polls, replies, reposts, content warnings, and the thread action remain available.
