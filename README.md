# X for Tapestry

A personal, read-only Tapestry connector for X posts using your own logged-in
`x.com` browser session cookies.

Download or build `XTapestry.tapestry`, install it in Tapestry, and configure a
feed from your Following timeline, comma-separated individual accounts, or a raw
X search query. It renders media, quoted posts, polls, profile photos, and
X-style URL preview cards. When X only returns a plain expanded URL, the
connector can fetch cached webpage metadata to build a richer card. Feed Finder
can also prefill a handle from an `@handle`, X profile URL, Twitter profile URL,
or status URL.

For easier setup, run `node scripts/x-cookie-helper.mjs` from the repository
root. It opens a temporary browser login session and copies `auth_token` for the
connector’s **auth_token** / **ct0** fields.

See [local.x.timeline/README.md](local.x.timeline/README.md) for setup,
security notes, and development instructions. See [TESTING.md](TESTING.md) for
the automated and live rendering checks.
