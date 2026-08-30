# X for Tapestry

This connector shows posts from X in Tapestry using your own logged-in `x.com`
browser session. It does not use an X developer app, OAuth app, paid API tier,
or third-party tweet-pulling service.

## Setup

1. Open `x.com` in a browser where you are logged in.
2. Open the browser developer tools and inspect a request to `x.com`.
3. Copy either the full `Cookie` request header, or copy the individual
   `auth_token` and `ct0` cookie values.
4. Create a Tapestry feed with this connector.
5. Paste the full cookie header into **Cookie Header**, or paste the individual
   values into **auth_token Cookie** and **ct0 Cookie**.
6. Set **Source Mode** to **Handles** and enter comma-separated handles such as
   `openai, sama`, or set it to **Search Query** and enter a full X search.

The cookies are entered during feed setup and are not included in the connector
bundle. Treat them like passwords. Do not commit them, paste them into issues,
or include them in screenshots.

## Features

- Zero per-tweet cost through an authenticated `x.com` web session
- Comma-separated handle feeds using X search `from:` queries
- Raw X search query feeds for advanced filters
- Latest or Top search mode
- Optional reply and repost filtering
- Native post-style Tapestry items with author identity and avatar
- Optional media attachments from post images, videos, GIFs, and note posts
- Video/GIF attachments include explicit media type and thumbnail metadata
- Optional link cards for external links when no richer attachment is present
- Quoted posts are attached as Tapestry quoted-item previews
- Poll cards are attached when X includes poll metadata in the response
- Metrics annotations for replies, reposts, quotes, likes, and views
- Incremental refresh by newest post ID, with paginated catch-up
- Configurable SearchTimeline query ID for when X rotates web GraphQL IDs

## Reliability Notes

This connector uses X's private web GraphQL API. It is intentionally read-only,
but the authentication cookies still grant access to your account. X can rotate
query IDs, change response shapes, rate-limit the account, or block automated
traffic.

If loading starts failing with a query-ID or GraphQL validation error, capture
the current `SearchTimeline` query ID from a fresh X web request and update the
feed's **SearchTimeline Query ID** setting.

If loading starts failing with an automation or daily-limit-style error, leave
**Use X Transaction Header** enabled and try again later. That error usually
means X rejected the request fingerprint, not that a paid API quota is needed.

## Development and Tests

Open the directory containing `local.x.timeline` as the Connectors Folder in
Tapestry Loom. Use Loom with your own cookies for live verification.

Run the mocked tests and build the installable connector with:

```sh
node tests/plugin.test.js
bash scripts/build.sh
```

## Releases and Versioning

Releases use semantic versioning from the `VERSION` file. Updating `VERSION` on
`main` builds the connector and creates a matching GitHub release with
`XTapestry.tapestry` attached.
