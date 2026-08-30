# X for Tapestry

This connector shows posts from X in Tapestry using your own logged-in `x.com`
browser session. It does not use an X developer app, OAuth app, paid API tier,
or third-party tweet-pulling service.

## Setup

1. Run `node scripts/x-cookie-helper.mjs` from the repository root, log in to
   X in the temporary browser window, then press Enter in the terminal. The
   helper copies a minimal `auth_token=...; ct0=...` cookie header to the
   clipboard without printing the secret values.
2. If you prefer to do it manually, open `x.com` in a browser where you are
   logged in, inspect a request to `x.com`, and copy either the full `Cookie`
   request header or the individual `auth_token` and `ct0` cookie values.
3. Create a Tapestry feed with this connector. You can also use Feed Finder
   with an `@handle`, `x.com` profile URL, `twitter.com` profile URL, or status
   URL to prefill the handle.
4. Paste the full cookie header into **Cookie Header**, or paste the individual
   values into **auth_token Cookie** and **ct0 Cookie**.
5. Set **Source Mode** to **Handles** and enter comma-separated handles such as
   `openai, sama`, or set it to **Search Query** and enter a full X search.

The cookies are entered during feed setup and are not included in the connector
bundle. Treat them like passwords. Do not commit them, paste them into issues,
or include them in screenshots.

## Features

- Zero per-tweet cost through an authenticated `x.com` web session
- Comma-separated handle feeds using X profile timelines
- Raw X search query feeds for advanced filters
- Feed Finder support for `@handle`, `x.com`, and `twitter.com` inputs
- Setup suggestions for common handle/search examples
- Latest or Top search mode
- Optional reply and repost filtering
- Native post-style Tapestry items with author identity and avatar
- Optional media attachments from post images, videos, GIFs, and note posts
- Video/GIF attachments include explicit media type and thumbnail metadata
- Optional link cards for external links when no richer attachment is present
- Quoted posts are attached as Tapestry quoted-item previews
- Poll cards are attached when X includes poll metadata in the response
- Thread context action for opening a conversation inside Tapestry
- Annotations for replies, reposts, quotes, likes, views, and repost source
- Linked URLs, handles, hashtags, and cashtags in post text
- Content warnings for sensitive posts when X marks them
- Incremental refresh by newest post ID per source, with paginated catch-up
- Configurable advanced query IDs for when X rotates web GraphQL IDs

## Reliability Notes

This connector uses X's private web GraphQL API. It is intentionally read-only,
but the authentication cookies still grant access to your account. X can rotate
query IDs, change response shapes, rate-limit the account, or block automated
traffic.

If loading starts failing with a query-ID or GraphQL validation error, capture
the current query ID from a fresh X web request and update the matching
**Advanced** query-ID field. The connector also tries to discover updated query
IDs from X's current web scripts after likely rotation errors.

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
