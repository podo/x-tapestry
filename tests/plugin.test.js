const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "local.x.timeline", "plugin.js"),
  "utf8"
);

function makeHomeHtml() {
  const key = Buffer.from(Array.from({ length: 32 }, (_, index) => index + 1)).toString("base64");
  const row = Array.from({ length: 16 }, (_, index) => {
    const base = 10 + index;
    return [base, base + 1, base + 2, base + 3, base + 4, base + 5, 100, 20, 60, 180, 220].join(" ");
  }).join(" C ");
  const svg = index => `<svg id="loading-x-anim-${index}"><g><path d="M0 0" /><path d="M 10,30 C ${row}" /></g></svg>`;
  return `
    <html>
      <head>
        <meta name="twitter-site-verification" content="${key}">
        <script src="https://abs.twimg.com/responsive-web/client-web/ondemand.s.abcdefa.js"></script>
      </head>
      <body>${[0, 1, 2, 3].map(svg).join("")}</body>
    </html>
  `;
}

const ondemandJs = "function s(o){(o[1],16);(o[2],16);(o[3],16);}";

function tweetResult(overrides = {}) {
  const id = overrides.id || "1950000000000000001";
  const username = overrides.username || "openai";
  const fullText = overrides.fullText || "Hello <world>\nhttps://t.co/a";
  const legacy = {
    id_str: id,
    full_text: fullText,
    created_at: overrides.created_at || "Fri Aug 28 08:00:00 +0000 2026",
    favorite_count: overrides.favorite_count ?? 12,
    retweet_count: overrides.retweet_count ?? 3,
    reply_count: overrides.reply_count ?? 4,
    quote_count: overrides.quote_count ?? 1,
    in_reply_to_status_id_str: overrides.in_reply_to_status_id_str,
    retweeted_status_result: overrides.retweeted_status_result,
    entities: {
      urls: [
        {
          url: "https://t.co/a",
          expanded_url: "https://example.com/article",
          display_url: "example.com/article"
        }
      ]
    },
    extended_entities: {
      media: [
        {
          type: "photo",
          media_url_https: "https://pbs.twimg.com/media/a.jpg",
          original_info: { width: 1200, height: 800 },
          ext_alt_text: "Alt text"
        }
      ]
    }
  };
  return {
    rest_id: id,
    legacy: { ...legacy, ...(overrides.legacy || {}) },
    core: {
      user_results: {
        result: {
          core: {
            screen_name: username,
            name: overrides.name || "OpenAI",
            profile_image_url: `https://pbs.twimg.com/profile_images/${username}_normal.jpg`
          },
          legacy: {
            screen_name: username,
            name: overrides.name || "OpenAI"
          }
        }
      }
    },
    views: { count: overrides.views ?? "1234" },
    quoted_status_result: overrides.quoted_status_result
  };
}

function timelineBody(results, cursor = null) {
  const entries = results.map(result => ({
    entryId: `tweet-${result.rest_id || result.tweet?.rest_id}`,
    content: {
      itemContent: {
        tweet_results: { result }
      }
    }
  }));
  if (cursor) {
    entries.push({ entryId: "cursor-bottom-abc", content: { value: cursor } });
  }
  return {
    data: {
      search_by_raw_query: {
        search_timeline: {
          timeline: {
            instructions: [{ entries }]
          }
        }
      }
    }
  };
}

function makeContext(overrides = {}) {
  const state = new Map();
  const calls = [];
  const context = {
    console,
    Buffer,
    Date,
    Error,
    JSON,
    Math,
    Number,
    Object,
    RegExp,
    String,
    URL,
    auth_token: "auth-token",
    ct0: "csrf-token",
    cookie_header: "",
    source_mode: "Handles",
    x_sources: "openai, sama",
    query_suffix: "lang:en",
    search_product: "Latest",
    include_replies: "off",
    include_retweets: "off",
    show_metrics: "on",
    show_media: "on",
    show_link_cards: "on",
    batch_size: "20",
    use_transaction_header: "on",
    search_query_id: "Bcw3RzK-PatNAmbnw54hFw",
    bearer_token: "",
    timeline: timelineBody([tweetResult()]),
    sendRequest: async (url, method, parameters, headers) => {
      calls.push({ url, method, parameters, headers });
      if (url === "https://x.com/") return makeHomeHtml();
      if (url.includes("ondemand.s.abcdefa.js")) return ondemandJs;
      return JSON.stringify(context.timeline);
    },
    processVerification: value => { context.verification = value; },
    processResults: value => { context.results = value; },
    processError: error => { context.error = error; },
    getItem: key => state.get(key) || null,
    setItem: (key, value) => state.set(key, value),
    Item: {
      createWithUriDate: (uri, date) => ({ uri, date })
    },
    Identity: {
      createWithName: name => ({ name })
    },
    Annotation: {
      createWithText: text => ({ text })
    },
    MediaAttachment: {
      createWithUrl: url => ({ url, kind: "media" })
    },
    LinkAttachment: {
      createWithUrl: url => ({ url, kind: "link" })
    },
    _state: state,
    _calls: calls,
    ...overrides
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

async function settle() {
  for (let index = 0; index < 5; index += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

function apiCall(context) {
  return context._calls.find(call => call.url.includes("/i/api/graphql/"));
}

async function run() {
  const context = makeContext();
  vm.runInContext("verify()", context);
  await settle();
  assert.ifError(context.error);
  assert.strictEqual(context.verification.displayName, "X - @openai, @sama");

  const verifyApi = apiCall(context);
  assert.ok(verifyApi, "verify should call SearchTimeline");
  assert.strictEqual(verifyApi.method, "GET");
  assert.match(verifyApi.headers.Cookie, /auth_token=auth-token/);
  assert.match(verifyApi.headers.Cookie, /ct0=csrf-token/);
  assert.strictEqual(verifyApi.headers["x-csrf-token"], "csrf-token");
  assert.ok(verifyApi.headers["x-client-transaction-id"]);
  const variables = JSON.parse(new URL(verifyApi.url).searchParams.get("variables"));
  assert.strictEqual(variables.product, "Latest");
  assert.match(variables.rawQuery, /from:openai/);
  assert.match(variables.rawQuery, /from:sama/);
  assert.match(variables.rawQuery, /lang:en/);
  assert.match(variables.rawQuery, /-filter:replies/);
  assert.match(variables.rawQuery, /-filter:retweets/);

  vm.runInContext("load()", context);
  await settle();
  assert.ifError(context.error);
  assert.strictEqual(context.results.length, 1);
  const item = context.results[0];
  assert.strictEqual(item.uri, "https://x.com/openai/status/1950000000000000001");
  assert.strictEqual(item.date.toISOString(), "2026-08-28T08:00:00.000Z");
  assert.match(item.body, /Hello &lt;world&gt;<br>/);
  assert.doesNotMatch(item.body, /<world>/);
  assert.match(item.body, /example\.com\/article/);
  assert.strictEqual(item.author.name, "OpenAI");
  assert.strictEqual(item.author.username, "@openai");
  assert.match(item.author.avatar, /_400x400\.jpg$/);
  assert.strictEqual(item.attachments[0].url, "https://pbs.twimg.com/media/a.jpg");
  assert.strictEqual(item.attachments[0].aspectSize.width, 1200);
  assert.strictEqual(item.attachments[0].aspectSize.height, 800);
  assert.match(item.annotations[0].text, /4 replies/);
  assert.match(item.annotations[0].text, /12 likes/);
  assert.match(item.annotations[0].text, /1,234 views/);

  const initialState = JSON.parse(context._state.get("syncStateV1"));
  assert.strictEqual(initialState.highWaterId, "1950000000000000001");

  context.timeline = timelineBody([
    tweetResult({ id: "1950000000000000003", fullText: "New post", favorite_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0, views: 0 }),
    tweetResult({ id: "1950000000000000001" })
  ], "|next|");
  vm.runInContext("load()", context);
  await settle();
  assert.ifError(context.error);
  assert.strictEqual(context.results.length, 1);
  assert.strictEqual(context.results[0].uri, "https://x.com/openai/status/1950000000000000003");
  const nextState = JSON.parse(context._state.get("syncStateV1"));
  assert.strictEqual(nextState.highWaterId, "1950000000000000003");

  const rawSearch = makeContext({
    source_mode: "Search Query",
    x_sources: "from:openai build",
    query_suffix: "",
    include_replies: "on",
    include_retweets: "on",
    use_transaction_header: "off"
  });
  vm.runInContext("verify()", rawSearch);
  await settle();
  assert.ifError(rawSearch.error);
  const rawVariables = JSON.parse(new URL(apiCall(rawSearch).url).searchParams.get("variables"));
  assert.strictEqual(rawVariables.rawQuery, "from:openai build");
  assert.ok(!apiCall(rawSearch).headers["x-client-transaction-id"]);

  const wrapped = makeContext({
    timeline: timelineBody([{ tweet: tweetResult({ id: "1950000000000000004" }) }]),
    show_media: "off"
  });
  vm.runInContext("load()", wrapped);
  await settle();
  assert.ifError(wrapped.error);
  assert.strictEqual(wrapped.results[0].attachments[0].kind, "link");
  assert.strictEqual(wrapped.results[0].attachments[0].url, "https://example.com/article");

  const cookieOnly = makeContext({
    auth_token: "",
    ct0: "",
    cookie_header: "foo=bar; auth_token=cookie-auth; ct0=cookie-csrf"
  });
  vm.runInContext("verify()", cookieOnly);
  await settle();
  assert.ifError(cookieOnly.error);
  assert.match(apiCall(cookieOnly).headers.Cookie, /foo=bar/);
  assert.strictEqual(apiCall(cookieOnly).headers["x-csrf-token"], "cookie-csrf");

  const missingCredentials = makeContext({ auth_token: "", ct0: "", cookie_header: "" });
  vm.runInContext("verify()", missingCredentials);
  await settle();
  assert.match(missingCredentials.error.message, /auth_token and ct0/);

  const queryIdError = makeContext({
    sendRequest: async (url, method, parameters, headers) => {
      if (url === "https://x.com/") return makeHomeHtml();
      if (url.includes("ondemand.s.abcdefa.js")) return ondemandJs;
      return JSON.stringify({
        status: 400,
        headers: {},
        body: { errors: [{ message: "Variable $count must be defined" }] }
      });
    }
  });
  vm.runInContext("load()", queryIdError);
  await settle();
  assert.match(queryIdError.error.message, /query ID/i);

  const retry = makeContext();
  let attempts = 0;
  retry.sendRequest = async (url, method, parameters, headers) => {
    retry._calls.push({ url, method, parameters, headers });
    if (url === "https://x.com/") return makeHomeHtml();
    if (url.includes("ondemand.s.abcdefa.js")) return ondemandJs;
    attempts += 1;
    if (attempts === 1) {
      return JSON.stringify({ errors: [{ code: 344, message: "You have reached your daily limit" }] });
    }
    return JSON.stringify(retry.timeline);
  };
  vm.runInContext("load()", retry);
  await settle();
  assert.ifError(retry.error);
  assert.strictEqual(attempts, 2);

  console.log("All X connector tests passed.");
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
