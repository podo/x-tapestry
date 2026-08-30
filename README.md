# X for Tapestry

A personal, read-only Tapestry connector for X posts using your own logged-in
`x.com` browser session cookies.

Download or build `XTapestry.tapestry`, install it in Tapestry, and configure a
feed with either comma-separated handles or a raw X search query. Feed Finder can
also prefill a handle from an `@handle`, X profile URL, Twitter profile URL, or
status URL.

For easier setup, run `node scripts/x-cookie-helper.mjs` from the repository
root. It opens a temporary browser login session and copies the minimal X cookie
header needed by the connector.

See [local.x.timeline/README.md](local.x.timeline/README.md) for setup,
security notes, and development instructions.
