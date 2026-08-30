# Testing X for Tapestry

## Automated Suite

Run:

```sh
node tests/plugin.test.js
bash scripts/build.sh
```

The mocked suite verifies:

- Connector metadata, UI inputs, suggestions, discovery, actions, and native-app mappings
- Cookie-header parsing and missing-credential errors
- Following Feed, Individual Accounts, and Search Query request paths
- Following Feed GraphQL uses a JSON POST body with query ID and the expected variables
- Home feed parsing from `data.home.home_timeline_urt.instructions`
- Promoted home-feed entries are filtered before rendering
- Incremental sync state and connector version bumps
- Author identity fields: name, username, URI, and avatar
- Stable X profile-image URLs, including the newer `avatar.image_url` field
- Post body escaping, linkification, and media/preview URL removal
- Legacy and modern X media entities for photos, videos, GIF thumbnails, poll, quoted-post, and metric annotations
- Modern detail-style tweets, `core.user_result` authors, and nested `media_info.video_info` variants
- X-provided rich link cards, including `tweet_card` and unified-card payloads
- Higher-resolution X media/card image URL normalization
- Cached Open Graph/Twitter Card fallback previews for plain URLs
- External link-preview requests do not include X cookies
- Thread context action and query-ID rediscovery behavior

## Package Checks

After `bash scripts/build.sh`, verify the packaged connector:

```sh
unzip -t XTapestry.tapestry
unzip -p XTapestry.tapestry plugin-config.json
```

The packaged `plugin-config.json` version should increase whenever rendering or
sync behavior changes, so Tapestry reloads existing feed output.

## Live Tapestry Checks

For a redacted, repeatable Loom-side run, use the bundled harness. It reads the
same saved feed configuration Loom uses by default, or accepts a feed JSON path
explicitly. It prints only configuration keys with secrets redacted, request
summaries, item counts, and media reachability checks:

```sh
node /Users/podo/.codex/skills/tapestry-connector/scripts/loom_connector_harness.mjs \
  --connector "$PWD/local.x.timeline" \
  --mode both \
  --sample 8 \
  --check-media
```

If Loom has not saved the feed yet, pass its exported/supplied feed JSON with
`--feed-json /path/to/feed.json`. Do not put cookie values in shell history or
command output; use Loom's saved settings or a protected local config file.

Use Tapestry Loom or Tapestry with a real X cookie header and create three feeds:

- Source Mode: Following Feed
- Source Mode: Individual Accounts, with at least two handles
- Source Mode: Search Query, with a known active query

For each mode, inspect a small sample of items and confirm:

- Author avatar is visible and opens the author profile
- Text-only posts render without empty attachments
- Links render as cards when metadata is available
- The preview URL is hidden from the body when a link card is shown
- Other non-preview links remain visible in the body
- Posts with images show media instead of duplicate link cards
- Videos/GIFs include thumbnails and play as video
- Quoted posts render as quoted-item attachments
- Polls render as poll attachments
- Replies/reposts follow the configured include/exclude switches
- Thread action opens a conversation in Tapestry

For the avatar and rich-link regressions specifically, use one post whose author
avatar URL comes from X's `avatar.image_url` field and one post whose link has no
X card metadata but does expose Open Graph or Twitter Card tags.
