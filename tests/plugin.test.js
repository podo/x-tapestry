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
  const profileImageUrl = overrides.profile_image_url || `https://pbs.twimg.com/profile_images/${username}_normal.jpg`;
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
            profile_image_url: profileImageUrl
          },
          legacy: {
            screen_name: username,
            name: overrides.name || "OpenAI"
          },
          avatar: overrides.avatar
        }
      }
    },
    views: { count: overrides.views ?? "1234" },
    quoted_status_result: overrides.quoted_status_result,
    card: overrides.card
  };
}

function card(bindings) {
  return {
    legacy: {
      binding_values: Object.keys(bindings).map(key => ({ key, value: bindings[key] }))
    }
  };
}

function stringValue(value) {
  return { string_value: value };
}

function imageValue(url, width, height) {
  return { image_value: { url, width, height } };
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
    PollAttachment: {
      create: () => ({ kind: "poll" })
    },
    PollOption: {
      create: (title, votes) => (
        votes == null
          ? { title }
          : { title, votes }
      )
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
  assert.doesNotMatch(item.body, /Open on X/);
  assert.strictEqual(item.author.name, "OpenAI");
  assert.strictEqual(item.author.username, "@openai");
  assert.match(item.author.avatar, /_400x400\.jpg$/);
  assert.strictEqual(item.attachments[0].url, "https://pbs.twimg.com/media/a.jpg");
  assert.strictEqual(item.attachments[0].mimeType, "image/jpeg");
  assert.strictEqual(item.attachments[0].text, "Alt text");
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

  const linkCard = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000005",
        legacy: { extended_entities: { media: [] } },
        card: card({
          card_url: stringValue("https://example.com/card"),
          title: stringValue("Card title"),
          description: stringValue("Card summary"),
          domain: stringValue("example.com"),
          author_name: stringValue("Example Author"),
          thumbnail_image_original: imageValue("https://pbs.twimg.com/card_img/abc?format=jpg&name=small", 640, 360)
        })
      })
    ])
  });
  vm.runInContext("load()", linkCard);
  await settle();
  assert.ifError(linkCard.error);
  assert.strictEqual(linkCard.results[0].attachments[0].kind, "link");
  assert.strictEqual(linkCard.results[0].attachments[0].url, "https://example.com/card");
  assert.strictEqual(linkCard.results[0].attachments[0].title, "Card title");
  assert.strictEqual(linkCard.results[0].attachments[0].subtitle, "Card summary");
  assert.strictEqual(linkCard.results[0].attachments[0].siteName, "example.com");
  assert.strictEqual(linkCard.results[0].attachments[0].authorName, "Example Author");
  assert.strictEqual(linkCard.results[0].attachments[0].image, "https://pbs.twimg.com/card_img/abc?format=jpg&name=small");
  assert.strictEqual(linkCard.results[0].attachments[0].aspectSize.width, 640);

  const video = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000006",
        legacy: {
          extended_entities: {
            media: [
              {
                type: "video",
                media_url_https: "https://pbs.twimg.com/ext_tw_video_thumb/a.jpg",
                video_info: {
                  aspect_ratio: [16, 9],
                  variants: [
                    { content_type: "application/x-mpegURL", url: "https://video.twimg.com/a.m3u8" },
                    { content_type: "video/mp4", bitrate: 256000, url: "https://video.twimg.com/a-256.mp4" },
                    { content_type: "video/mp4", bitrate: 832000, url: "https://video.twimg.com/a-832.mp4" }
                  ]
                }
              }
            ]
          }
        }
      })
    ])
  });
  vm.runInContext("load()", video);
  await settle();
  assert.ifError(video.error);
  assert.strictEqual(video.results[0].attachments[0].url, "https://video.twimg.com/a-832.mp4");
  assert.strictEqual(video.results[0].attachments[0].mimeType, "video/mp4");
  assert.strictEqual(video.results[0].attachments[0].thumbnail, "https://pbs.twimg.com/ext_tw_video_thumb/a.jpg");
  assert.strictEqual(video.results[0].attachments[0].aspectSize.width, 16);
  assert.strictEqual(video.results[0].attachments[0].aspectSize.height, 9);

  const queryAvatar = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000007",
        profile_image_url: "https://pbs.twimg.com/profile_images/1/avatar?format=jpg&name=normal"
      })
    ])
  });
  vm.runInContext("load()", queryAvatar);
  await settle();
  assert.ifError(queryAvatar.error);
  assert.strictEqual(queryAvatar.results[0].author.avatar, "https://pbs.twimg.com/profile_images/1/avatar?format=jpg&name=400x400");

  const quoted = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000008",
        fullText: "Quoting this",
        legacy: { extended_entities: { media: [] }, entities: { urls: [] } },
        quoted_status_result: {
          result: tweetResult({
            id: "1950000000000000009",
            username: "sama",
            name: "Sam Altman",
            fullText: "Quoted text",
            legacy: { extended_entities: { media: [] }, entities: { urls: [] } }
          })
        }
      })
    ])
  });
  vm.runInContext("load()", quoted);
  await settle();
  assert.ifError(quoted.error);
  assert.strictEqual(quoted.results[0].attachments[0].uri, "https://x.com/sama/status/1950000000000000009");
  assert.strictEqual(quoted.results[0].attachments[0].author.username, "@sama");
  assert.match(quoted.results[0].attachments[0].body, /Quoted text/);
  assert.doesNotMatch(quoted.results[0].body, /Quoted text/);

  const poll = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000010",
        legacy: { extended_entities: { media: [] }, entities: { urls: [] } },
        card: card({
          choice1_label: stringValue("Yes"),
          choice1_count: stringValue("42"),
          choice2_label: stringValue("No"),
          choice2_count: stringValue("8"),
          end_datetime_utc: stringValue("1800000000")
        })
      })
    ])
  });
  vm.runInContext("load()", poll);
  await settle();
  assert.ifError(poll.error);
  assert.strictEqual(poll.results[0].attachments[0].kind, "poll");
  assert.strictEqual(poll.results[0].attachments[0].options[0].title, "Yes");
  assert.strictEqual(poll.results[0].attachments[0].options[0].votes, 42);
  assert.strictEqual(poll.results[0].attachments[0].options[1].title, "No");
  assert.strictEqual(poll.results[0].attachments[0].options[1].votes, 8);
  assert.strictEqual(poll.results[0].attachments[0].endDate.toISOString(), "2027-01-15T08:00:00.000Z");

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
