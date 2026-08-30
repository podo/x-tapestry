const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const connectorDir = path.join(__dirname, "..", "local.x.timeline");
const source = fs.readFileSync(
  path.join(connectorDir, "plugin.js"),
  "utf8"
);

function readConnectorJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(connectorDir, fileName), "utf8"));
}

function regexFromPattern(pattern) {
  const lastSlash = pattern.lastIndexOf("/");
  return new RegExp(pattern.slice(1, lastSlash), pattern.slice(lastSlash + 1) || "i");
}

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
  const profileImageUrl = Object.prototype.hasOwnProperty.call(overrides, "profile_image_url")
    ? overrides.profile_image_url
    : `https://pbs.twimg.com/profile_images/${username}_normal.jpg`;
  const legacy = {
    id_str: id,
    full_text: fullText,
    created_at: overrides.created_at || "Fri Aug 28 08:00:00 +0000 2026",
    favorite_count: overrides.favorite_count ?? 12,
    retweet_count: overrides.retweet_count ?? 3,
    reply_count: overrides.reply_count ?? 4,
    quote_count: overrides.quote_count ?? 1,
    in_reply_to_status_id_str: overrides.in_reply_to_status_id_str,
    in_reply_to_screen_name: overrides.in_reply_to_screen_name,
    retweeted_status_result: overrides.retweeted_status_result,
    possibly_sensitive: overrides.possibly_sensitive,
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
          rest_id: overrides.user_id || `${username}-id`,
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

function urlEntity(url, expandedUrl, displayUrl = null) {
  return {
    url,
    expanded_url: expandedUrl,
    display_url: displayUrl || expandedUrl.replace(/^https?:\/\//, "")
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

function userTimelineBody(results, cursor = null) {
  const search = timelineBody(results, cursor);
  return {
    data: {
      user: {
        result: {
          timeline_v2: {
            timeline: search.data.search_by_raw_query.search_timeline.timeline
          }
        }
      }
    }
  };
}

function homeTimelineBody(results, cursor = null, extraEntries = []) {
  const search = timelineBody(results, cursor);
  const timeline = search.data.search_by_raw_query.search_timeline.timeline;
  if (extraEntries.length > 0) timeline.instructions[0].entries.push(...extraEntries);
  return {
    data: {
      home: {
        home_timeline_urt: timeline
      }
    }
  };
}

function tweetDetailBody(results, cursor = null) {
  const search = timelineBody(results, cursor);
  return {
    data: {
      threaded_conversation_with_injections_v2: {
        instructions: search.data.search_by_raw_query.search_timeline.timeline.instructions
      }
    }
  };
}

function promotedTweetEntry(result) {
  return {
    entryId: `promoted-tweet-${result.rest_id || result.tweet?.rest_id}`,
    content: {
      itemContent: {
        tweet_results: { result },
        promotedMetadata: { advertiserResults: {} }
      }
    }
  };
}

function userProfileBody(handle, overrides = {}) {
  const username = handle || overrides.username || "openai";
  const name = overrides.name || (username === "podo" ? "Podo" : username === "sama" ? "Sam Altman" : "OpenAI");
  const avatar = overrides.profile_image_url || `https://pbs.twimg.com/profile_images/${username}_normal.jpg`;
  return {
    data: {
      user: {
        result: {
          rest_id: overrides.id || `${username}-user-id`,
          core: {
            screen_name: username,
            name,
            profile_image_url: avatar
          },
          legacy: {
            screen_name: username,
            name
          }
        }
      }
    }
  };
}

function graphqlAction(url) {
  const match = String(url).match(/\/i\/api\/graphql\/[^/]+\/([^?]+)/);
  return match ? match[1] : null;
}

function graphqlVariables(call) {
  if (call.parameters) {
    return JSON.parse(call.parameters).variables;
  }
  return JSON.parse(new URL(call.url).searchParams.get("variables"));
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
    source_mode: "Individual Accounts",
    x_sources: "openai, sama",
    query_suffix: "lang:en",
    search_product: "Latest",
    include_replies: "off",
    include_retweets: "off",
    show_metrics: "on",
    show_media: "on",
    show_link_cards: "on",
    fetch_link_previews: "on",
    batch_size: "20",
    use_transaction_header: "on",
    search_query_id: "Bcw3RzK-PatNAmbnw54hFw",
    user_by_screen_name_query_id: "",
    user_tweets_query_id: "",
    tweet_detail_query_id: "",
    bearer_token: "",
    timeline: timelineBody([tweetResult()]),
    userTimeline: null,
    homeTimeline: null,
    threadTimeline: null,
    linkPreviews: {},
    accountSettings: { screen_name: "podo", name: "Podo" },
    sendRequest: async (url, method, parameters, headers) => {
      calls.push({ url, method, parameters, headers });
      if (url === "https://x.com/") return makeHomeHtml();
      if (url.includes("ondemand.s.abcdefa.js")) return ondemandJs;
      if (url.includes("/account/settings.json")) return JSON.stringify(context.accountSettings);
      if (Object.prototype.hasOwnProperty.call(context.linkPreviews, url)) return context.linkPreviews[url];
      if (/^https?:\/\//.test(url) && !/https:\/\/(x\.com|abs\.twimg\.com)\//.test(url)) {
        return "<html></html>";
      }
      const action = graphqlAction(url);
      if (action === "UserByScreenName") {
        const variables = graphqlVariables({ url, parameters });
        return JSON.stringify(userProfileBody(variables.screen_name));
      }
      if (action === "UserTweets") return JSON.stringify(context.userTimeline || context.timeline);
      if (action === "HomeLatestTimeline") return JSON.stringify(context.homeTimeline || homeTimelineBody([tweetResult()]));
      if (action === "TweetDetail") return JSON.stringify(context.threadTimeline || tweetDetailBody([tweetResult()]));
      if (action === "SearchTimeline") return JSON.stringify(context.timeline);
      return JSON.stringify(context.timeline);
    },
    processVerification: value => { context.verification = value; },
    processResults: value => { context.results = value; },
    processError: error => { context.error = error; },
    actionComplete: (value, error) => {
      context.actionResult = value;
      context.actionError = error;
    },
    getItem: key => state.get(key) || null,
    setItem: (key, value) => state.set(key, value),
    Item: {
      createWithUriDate: (uri, date) => ({ uri, date })
    },
    Identity: {
      create: () => {
        throw new Error("Use createWithName and explicit identity properties for avatar compatibility.");
      },
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

function apiCall(context, action = null) {
  return context._calls.find(call => (
    call.url.includes("/i/api/graphql/")
    && (!action || graphqlAction(call.url) === action)
  ));
}

function apiCalls(context, action = null) {
  return context._calls.filter(call => (
    call.url.includes("/i/api/graphql/")
    && (!action || graphqlAction(call.url) === action)
  ));
}

async function run() {
  const pluginConfig = readConnectorJson("plugin-config.json");
  const uiConfig = readConnectorJson("ui-config.json");
  const discovery = readConnectorJson("discovery.json");
  const suggestions = readConnectorJson("suggestions.json");
  const actions = readConnectorJson("actions.json");
  const apps = readConnectorJson("apps.json");

  assert.strictEqual(pluginConfig.provides_attachments, true);
  assert.strictEqual(pluginConfig.minimum_app_version, "1.4");
  assert.strictEqual(pluginConfig.version, 5);
  const sourceModeInput = uiConfig.inputs.find(input => input.name === "source_mode");
  assert.ok(sourceModeInput.choices.includes("Following Feed"));
  assert.ok(sourceModeInput.choices.includes("Individual Accounts"));
  assert.ok(sourceModeInput.choices.includes("Search Query"));
  assert.ok(uiConfig.inputs.some(input => input.name === "x_sources"));
  assert.ok(uiConfig.inputs.some(input => input.name === "fetch_link_previews"));
  assert.ok(uiConfig.inputs.some(input => input.name === "home_latest_timeline_query_id"));
  assert.ok(uiConfig.inputs.some(input => input.name === "user_by_screen_name_query_id"));
  assert.ok(uiConfig.inputs.some(input => input.name === "user_tweets_query_id"));
  assert.ok(uiConfig.inputs.some(input => input.name === "tweet_detail_query_id"));
  assert.ok(discovery.sites.includes("x.com"));
  assert.ok(discovery.sites.includes("twitter.com"));
  assert.ok(discovery.input.some(input => input.url === "https://x.com/$1"));
  assert.ok(suggestions.variables.some(variable => variable.title === "Following Feed"));
  assert.ok(suggestions.variables.some(variable => variable.title === "OpenAI + Sam"));
  assert.ok(actions.items.some(action => action.id === "thread" && action.role === "context"));
  assert.ok(apps.apps.some(app => app.name === "X" && app.template === "__URL__"));
  assert.strictEqual("@openai".match(regexFromPattern(discovery.input[0].match))[1], "openai");
  assert.strictEqual("https://x.com/openai".match(regexFromPattern(discovery.url[0].extract))[1], "openai");
  assert.strictEqual("https://twitter.com/sama/status/123".match(regexFromPattern(discovery.url[0].extract))[1], "sama");

  const context = makeContext();
  vm.runInContext("verify()", context);
  await settle();
  assert.ifError(context.error);
  assert.strictEqual(context.verification.displayName, "X - @openai, @sama");
  assert.strictEqual(context.verification.accountIdentity.username, "@podo");
  assert.match(context.verification.accountIdentity.avatar, /podo\.jpg$/);

  const verifyProfileApi = apiCall(context, "UserByScreenName");
  assert.ok(verifyProfileApi, "verify should resolve configured handles");
  assert.strictEqual(verifyProfileApi.method, "GET");
  assert.match(verifyProfileApi.headers.Cookie, /auth_token=auth-token/);
  assert.match(verifyProfileApi.headers.Cookie, /ct0=csrf-token/);
  assert.strictEqual(verifyProfileApi.headers["x-csrf-token"], "csrf-token");
  assert.ok(verifyProfileApi.headers["x-client-transaction-id"]);

  const verifyTimelineApi = apiCall(context, "UserTweets");
  assert.ok(verifyTimelineApi, "verify should call UserTweets");
  const variables = JSON.parse(new URL(verifyTimelineApi.url).searchParams.get("variables"));
  assert.strictEqual(variables.userId, "openai-user-id");
  assert.strictEqual(variables.count, 1);

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
  assert.strictEqual(item.author.uri, "https://x.com/openai");
  assert.match(item.author.avatar, /openai\.jpg$/);
  assert.deepStrictEqual(JSON.parse(item.actions.thread), {
    tweetId: "1950000000000000001",
    url: "https://x.com/openai/status/1950000000000000001"
  });
  assert.strictEqual(item.attachments[0].url, "https://pbs.twimg.com/media/a.jpg");
  assert.strictEqual(item.attachments[0].mimeType, "image/jpeg");
  assert.strictEqual(item.attachments[0].text, "Alt text");
  assert.strictEqual(item.attachments[0].aspectSize.width, 1200);
  assert.strictEqual(item.attachments[0].aspectSize.height, 800);
  assert.match(item.annotations[0].text, /4 replies/);
  assert.match(item.annotations[0].text, /12 likes/);
  assert.match(item.annotations[0].text, /1,234 views/);

  const initialState = JSON.parse(context._state.get("syncStateV5"));
  assert.strictEqual(initialState.highWaterBySource["handle:openai"], "1950000000000000001");
  assert.strictEqual(initialState.highWaterBySource["handle:sama"], "1950000000000000001");

  context.timeline = timelineBody([
    tweetResult({ id: "1950000000000000003", fullText: "New post", favorite_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0, views: 0 }),
    tweetResult({ id: "1950000000000000001" })
  ], "|next|");
  vm.runInContext("load()", context);
  await settle();
  assert.ifError(context.error);
  assert.strictEqual(context.results.length, 1);
  assert.strictEqual(context.results[0].uri, "https://x.com/openai/status/1950000000000000003");
  const nextState = JSON.parse(context._state.get("syncStateV5"));
  assert.strictEqual(nextState.highWaterBySource["handle:openai"], "1950000000000000003");
  assert.strictEqual(nextState.highWaterBySource["handle:sama"], "1950000000000000003");

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
  const rawSearchApi = apiCall(rawSearch, "SearchTimeline");
  const rawVariables = JSON.parse(new URL(rawSearchApi.url).searchParams.get("variables"));
  assert.strictEqual(rawVariables.rawQuery, "from:openai build");
  assert.strictEqual(rawVariables.product, "Latest");
  assert.ok(!rawSearchApi.headers["x-client-transaction-id"]);

  const promotedTweet = tweetResult({
    id: "1950000000000000023",
    username: "sponsor",
    name: "Sponsor",
    fullText: "Promoted post",
    legacy: { entities: { urls: [] }, extended_entities: { media: [] } }
  });
  const following = makeContext({
    source_mode: "Following Feed",
    x_sources: "",
    homeTimeline: homeTimelineBody([
      tweetResult({
        id: "1950000000000000022",
        username: "verge",
        name: "The Verge",
        profile_image_url: "",
        avatar: { image_url: "https://pbs.twimg.com/profile_images/7/verge_normal.jpg" },
        fullText: "Read https://t.co/home",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/home", "https://example.com/home", "example.com/home")
            ]
          },
          extended_entities: { media: [] }
        }
      })
    ], "|home-next|", [promotedTweetEntry(promotedTweet)]),
    linkPreviews: {
      "https://example.com/home": `
        <html>
          <head>
            <meta property="og:title" content="Home feed story">
            <meta property="og:description" content="Rendered from webpage metadata">
            <meta property="og:site_name" content="Example News">
            <meta property="og:image" content="https://example.com/home.jpg">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="675">
          </head>
        </html>
      `
    }
  });
  vm.runInContext("verify()", following);
  await settle();
  assert.ifError(following.error);
  assert.strictEqual(following.verification.displayName, "X - Following Feed");
  assert.strictEqual(following.verification.icon, "https://pbs.twimg.com/profile_images/7/verge.jpg");
  const homeVerifyApi = apiCall(following, "HomeLatestTimeline");
  assert.ok(homeVerifyApi, "verify should call HomeLatestTimeline");
  assert.strictEqual(homeVerifyApi.method, "POST");
  assert.strictEqual(homeVerifyApi.headers["Content-Type"], "application/json");
  const homeVerifyVariables = graphqlVariables(homeVerifyApi);
  assert.strictEqual(homeVerifyVariables.count, 1);
  assert.deepStrictEqual(homeVerifyVariables.seenTweetIds, []);

  vm.runInContext("load()", following);
  await settle();
  assert.ifError(following.error);
  assert.strictEqual(following.results.length, 1);
  assert.strictEqual(following.results[0].author.username, "@verge");
  assert.strictEqual(following.results[0].author.avatar, "https://pbs.twimg.com/profile_images/7/verge.jpg");
  assert.strictEqual(following.results[0].attachments[0].kind, "link");
  assert.strictEqual(following.results[0].attachments[0].title, "Home feed story");
  assert.strictEqual(following.results[0].attachments[0].subtitle, "Rendered from webpage metadata");
  assert.strictEqual(following.results[0].attachments[0].siteName, "Example News");
  assert.strictEqual(following.results[0].attachments[0].image, "https://example.com/home.jpg");
  assert.strictEqual(following.results[0].attachments[0].aspectSize.width, 1200);
  assert.strictEqual(following.results[0].attachments[0].aspectSize.height, 675);
  assert.strictEqual(following.results[0].body, "<p>Read</p>");
  const homeLoadApi = apiCalls(following, "HomeLatestTimeline").pop();
  const homeLoadVariables = graphqlVariables(homeLoadApi);
  assert.strictEqual(homeLoadVariables.count, 20);
  assert.deepStrictEqual(JSON.parse(following._state.get("syncStateV5")).highWaterBySource.following, "1950000000000000022");

  const wrapped = makeContext({
    timeline: timelineBody([{ tweet: tweetResult({ id: "1950000000000000004" }) }]),
    show_media: "off"
  });
  vm.runInContext("load()", wrapped);
  await settle();
  assert.ifError(wrapped.error);
  assert.strictEqual(wrapped.results[0].attachments[0].kind, "link");
  assert.strictEqual(wrapped.results[0].attachments[0].url, "https://example.com/article");
  assert.doesNotMatch(wrapped.results[0].body, /example\.com\/article/);

  const linkCard = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000005",
        fullText: "Read this\nhttps://t.co/a",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/a", "https://example.com/card", "example.com/card")
            ]
          },
          extended_entities: { media: [] }
        },
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
  assert.strictEqual(linkCard.results[0].body, "<p>Read this</p>");

  const multiLinkCard = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000017",
        fullText: "First https://t.co/b\nhttps://t.co/a",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/b", "https://example.net/other", "example.net/other"),
              urlEntity("https://t.co/a", "https://example.com/card", "example.com/card")
            ]
          },
          extended_entities: { media: [] }
        },
        card: card({
          card_url: stringValue("https://t.co/a"),
          title: stringValue("Primary card"),
          site_name: stringValue("Example")
        })
      })
    ])
  });
  vm.runInContext("load()", multiLinkCard);
  await settle();
  assert.ifError(multiLinkCard.error);
  assert.strictEqual(multiLinkCard.results[0].attachments[0].url, "https://example.com/card");
  assert.match(multiLinkCard.results[0].body, /example\.net\/other/);
  assert.doesNotMatch(multiLinkCard.results[0].body, /example\.com\/card/);

  const playerCard = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000018",
        fullText: "Watch this https://t.co/player",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/player", "https://video.example.com/watch/1", "video.example.com/watch/1")
            ]
          },
          extended_entities: { media: [] }
        },
        card: card({
          card_url: stringValue("https://video.example.com/watch/1"),
          type: stringValue("player"),
          player_title: stringValue("Player title"),
          player_description: stringValue("Player summary"),
          player_image: imageValue("https://pbs.twimg.com/card_img/player?format=jpg&name=small", 1280, 720)
        })
      })
    ])
  });
  vm.runInContext("load()", playerCard);
  await settle();
  assert.ifError(playerCard.error);
  assert.strictEqual(playerCard.results[0].attachments[0].type, "video.other");
  assert.strictEqual(playerCard.results[0].attachments[0].title, "Player title");
  assert.strictEqual(playerCard.results[0].attachments[0].subtitle, "Player summary");
  assert.strictEqual(playerCard.results[0].attachments[0].aspectSize.height, 720);
  assert.strictEqual(playerCard.results[0].body, "<p>Watch this</p>");

  const urlOnlyCard = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000019",
        fullText: "https://t.co/only",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/only", "https://example.com/only", "example.com/only")
            ]
          },
          extended_entities: { media: [] }
        },
        card: card({
          card_url: stringValue("https://t.co/only"),
          title: stringValue("Only URL")
        })
      })
    ])
  });
  vm.runInContext("load()", urlOnlyCard);
  await settle();
  assert.ifError(urlOnlyCard.error);
  assert.strictEqual(urlOnlyCard.results[0].attachments[0].url, "https://example.com/only");
  assert.ok(!urlOnlyCard.results[0].body);

  const unfurled = makeContext({
    x_sources: "openai",
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000021",
        fullText: "Read https://t.co/preview",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/preview", "https://example.com/preview", "example.com/preview")
            ]
          },
          extended_entities: { media: [] }
        }
      })
    ]),
    linkPreviews: {
      "https://example.com/preview": `
        <html>
          <head>
            <title>Fallback title</title>
            <meta name="twitter:card" content="summary_large_image">
            <meta property="og:title" content="Preview title">
            <meta name="twitter:description" content="Preview summary">
            <meta property="og:site_name" content="Example Site">
            <meta name="twitter:creator" content="@writer">
            <meta property="og:image" content="/preview.jpg">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">
          </head>
        </html>
      `
    }
  });
  vm.runInContext("load()", unfurled);
  await settle();
  assert.ifError(unfurled.error);
  const previewAttachment = unfurled.results[0].attachments[0];
  assert.strictEqual(previewAttachment.kind, "link");
  assert.strictEqual(previewAttachment.url, "https://example.com/preview");
  assert.strictEqual(previewAttachment.type, "website");
  assert.strictEqual(previewAttachment.title, "Preview title");
  assert.strictEqual(previewAttachment.subtitle, "Preview summary");
  assert.strictEqual(previewAttachment.siteName, "Example Site");
  assert.strictEqual(previewAttachment.authorName, "writer");
  assert.strictEqual(previewAttachment.image, "https://example.com/preview.jpg");
  assert.strictEqual(previewAttachment.aspectSize.width, 1200);
  assert.strictEqual(previewAttachment.aspectSize.height, 630);
  assert.strictEqual(unfurled.results[0].body, "<p>Read</p>");
  const previewCall = unfurled._calls.find(call => call.url === "https://example.com/preview");
  assert.ok(previewCall, "missing link preview should fetch the expanded URL");
  assert.ok(!previewCall.headers.Cookie, "external link preview requests must not include X cookies");
  assert.match(previewCall.headers.Accept, /text\/html/);
  const previewCache = JSON.parse(unfurled._state.get("linkPreviewCacheV1"));
  assert.strictEqual(previewCache["https://example.com/preview"].preview.title, "Preview title");

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
        profile_image_url: "https://pbs.twimg.com/profile_images/1/avatar.jpg?format=jpg&name=normal"
      })
    ])
  });
  vm.runInContext("load()", queryAvatar);
  await settle();
  assert.ifError(queryAvatar.error);
  assert.strictEqual(queryAvatar.results[0].author.avatar, "https://pbs.twimg.com/profile_images/1/avatar.jpg");

  const queryAvatarWithoutExtension = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000024",
        profile_image_url: "https://pbs.twimg.com/profile_images/1/avatar?format=jpg&name=normal"
      })
    ])
  });
  vm.runInContext("load()", queryAvatarWithoutExtension);
  await settle();
  assert.ifError(queryAvatarWithoutExtension.error);
  assert.strictEqual(queryAvatarWithoutExtension.results[0].author.avatar, "https://pbs.twimg.com/profile_images/1/avatar.jpg");

  const modernAvatar = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000020",
        profile_image_url: "",
        avatar: { image_url: "https://pbs.twimg.com/profile_images/2/modern.jpg" }
      })
    ])
  });
  vm.runInContext("load()", modernAvatar);
  await settle();
  assert.ifError(modernAvatar.error);
  assert.strictEqual(modernAvatar.results[0].author.avatar, "https://pbs.twimg.com/profile_images/2/modern.jpg");

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

  const replySensitive = makeContext({
    include_replies: "on",
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000011",
        fullText: "Hi @sama #AI $OPENAI",
        in_reply_to_status_id_str: "1950000000000000010",
        in_reply_to_screen_name: "sama",
        possibly_sensitive: true,
        legacy: { extended_entities: { media: [] }, entities: { urls: [] } }
      })
    ])
  });
  vm.runInContext("load()", replySensitive);
  await settle();
  assert.ifError(replySensitive.error);
  assert.strictEqual(replySensitive.results[0].contentWarning, "Sensitive content");
  assert.match(replySensitive.results[0].body, /href="https:\/\/x\.com\/sama">@sama<\/a>/);
  assert.match(replySensitive.results[0].body, /href="https:\/\/x\.com\/hashtag\/AI">#AI<\/a>/);
  assert.match(replySensitive.results[0].body, /href="https:\/\/x\.com\/search\?q=%24OPENAI">\$OPENAI<\/a>/);
  assert.strictEqual(replySensitive.results[0].annotations[0].text, "Reply to @sama");

  const repost = makeContext({
    include_retweets: "on",
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000012",
        username: "podo",
        name: "Podo",
        created_at: "Sat Aug 29 08:00:00 +0000 2026",
        legacy: {
          retweeted_status_result: {
            result: tweetResult({
              id: "1950000000000000013",
              username: "sama",
              name: "Sam Altman",
              fullText: "Original post",
              legacy: { extended_entities: { media: [] }, entities: { urls: [] } }
            })
          }
        }
      })
    ])
  });
  vm.runInContext("load()", repost);
  await settle();
  assert.ifError(repost.error);
  assert.strictEqual(repost.results[0].uri, "https://x.com/sama/status/1950000000000000013");
  assert.strictEqual(repost.results[0].date.toISOString(), "2026-08-29T08:00:00.000Z");
  assert.strictEqual(repost.results[0].annotations[0].text, "@podo Reposted");
  assert.strictEqual(repost.results[0].annotations[0].uri, "https://x.com/podo");

  const threadContext = makeContext({
    threadTimeline: tweetDetailBody([
      tweetResult({ id: "1950000000000000014", fullText: "First", legacy: { extended_entities: { media: [] }, entities: { urls: [] } } }),
      tweetResult({ id: "1950000000000000015", username: "sama", name: "Sam Altman", fullText: "Second", legacy: { extended_entities: { media: [] }, entities: { urls: [] } } })
    ])
  });
  vm.runInContext("performAction('thread', JSON.stringify({ tweetId: '1950000000000000014' }), null)", threadContext);
  await settle();
  assert.ifError(threadContext.actionError);
  assert.strictEqual(threadContext.actionResult.length, 2);
  const threadApi = apiCall(threadContext, "TweetDetail");
  assert.ok(threadApi, "thread action should call TweetDetail");
  const threadVariables = JSON.parse(new URL(threadApi.url).searchParams.get("variables"));
  assert.strictEqual(threadVariables.focalTweetId, "1950000000000000014");

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

  const discovered = makeContext({
    x_sources: "openai",
    use_transaction_header: "off"
  });
  let staleUserTweetsCalls = 0;
  discovered.sendRequest = async (url, method, parameters, headers) => {
    discovered._calls.push({ url, method, parameters, headers });
    if (url === "https://x.com/") {
      return '<script src="https://abs.twimg.com/responsive-web/client-web/main.123.js"></script>';
    }
    if (url.includes("main.123.js")) {
      return 'const query={operationName:"UserTweets",queryId:"freshUserTweets"};';
    }
    const action = graphqlAction(url);
    if (action === "UserByScreenName") return JSON.stringify(userProfileBody("openai"));
    if (action === "UserTweets" && !url.includes("/freshUserTweets/")) {
      staleUserTweetsCalls += 1;
      return JSON.stringify({ errors: [{ message: "Variable $count must be defined" }] });
    }
    if (action === "UserTweets") {
      return JSON.stringify(userTimelineBody([
        tweetResult({ id: "1950000000000000016", legacy: { extended_entities: { media: [] }, entities: { urls: [] } } })
      ]));
    }
    return JSON.stringify(timelineBody([]));
  };
  vm.runInContext("load()", discovered);
  await settle();
  assert.ifError(discovered.error);
  assert.strictEqual(staleUserTweetsCalls, 1);
  assert.ok(apiCalls(discovered, "UserTweets").some(call => call.url.includes("/freshUserTweets/UserTweets")));
  assert.strictEqual(JSON.parse(discovered._state.get("queryIdCacheV1")).UserTweets.queryId, "freshUserTweets");

  const retry = makeContext({
    source_mode: "Search Query",
    x_sources: "from:openai"
  });
  let attempts = 0;
  retry.sendRequest = async (url, method, parameters, headers) => {
    retry._calls.push({ url, method, parameters, headers });
    if (url === "https://x.com/") return makeHomeHtml();
    if (url.includes("ondemand.s.abcdefa.js")) return ondemandJs;
    if (url.includes("/account/settings.json")) return JSON.stringify(retry.accountSettings);
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
