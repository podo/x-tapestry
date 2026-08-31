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

function bodyWithoutConnectorStamp(body) {
  return String(body || "").replace(/<!-- local\.x\.timeline [^>]+ -->$/, "");
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
    card: overrides.card,
    tweet_card: overrides.tweet_card,
    media_entities: overrides.media_entities
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

function modernImageEntity(url, sourceUrl = "https://t.co/img") {
  return {
    media_key: "3_1",
    url: sourceUrl,
    expanded_url: "https://x.com/openai/status/1950000000000000025/photo/1",
    media_results: {
      result: {
        media_info: {
          __typename: "ApiImage",
          original_img_url: url,
          original_img_width: 1200,
          original_img_height: 800,
          alt_text: "Modern image alt text"
        }
      }
    }
  };
}

function modernVideoEntity(videoUrl, thumbnailUrl, sourceUrl = "https://t.co/vid") {
  return {
    media_key: "7_1",
    url: sourceUrl,
    expanded_url: "https://x.com/openai/status/1950000000000000026/video/1",
    media_results: {
      result: {
        media_availability_v2: { status: "Available" },
        media_info: {
          __typename: "ApiVideo",
          preview_image: {
            original_img_url: thumbnailUrl,
            original_img_width: 1280,
            original_img_height: 720
          },
          variants: [
            { content_type: "application/x-mpegURL", url: "https://video.twimg.com/amplify_video/1/pl/hls.m3u8" },
            { content_type: "video/mp4", bit_rate: 832000, url: "https://video.twimg.com/amplify_video/1/vid/avc1/640x360/low.mp4" },
            { content_type: "video/mp4", bit_rate: 2176000, url: videoUrl }
          ]
        }
      }
    }
  };
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
    sendRequest: async (url, method, parameters, headers, fullResponse) => {
      calls.push({ url, method, parameters, headers, fullResponse });
      if (url.includes("pbs.twimg.com/")) {
        const body = String.fromCharCode(0xff, 0xd8, 0xff, 0xd9);
        if (fullResponse) {
          return JSON.stringify({
            status: 200,
            headers: { "content-type": "image/jpeg" },
            url,
            body
          });
        }
        return body;
      }
      if (url === "https://x.com/") return makeHomeHtml();
      if (url.includes("ondemand.s.abcdefa.js")) return ondemandJs;
      if (url.includes("/account/settings.json")) return JSON.stringify(context.accountSettings);
      if (url.includes("/users/show.json")) {
        const handle = new URL(url).searchParams.get("screen_name") || "openai";
        return JSON.stringify(userProfileBody(handle).data.user.result.legacy
          ? userProfileBody(handle).data.user.result
          : {
            screen_name: handle,
            name: handle,
            profile_image_url_https: `https://pbs.twimg.com/profile_images/${handle}_normal.jpg`
          });
      }
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
      createWithName: name => ({ name }),
      create: (name, username, avatar, uri) => ({ name, username, avatar, uri })
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
  assert.strictEqual(pluginConfig.version, 41);
  assert.match(source, /connectorBuildId = "2026-08-31T12:20Z-full-url-anchor-text"/);
  assert.match(source, /videoPreviewHtml/);
  assert.match(source, /embedTweetMediaThumbnails/);
  assert.match(source, /mediaFromFxTwitterStatus/);
  assert.match(source, /enrichTweetMedia/);
  assert.match(source, /engagementActionsForTweet/);
  assert.match(source, /FavoriteTweet/);
  assert.match(source, /timelineAvatarFromHint/);
  assert.match(source, /_timelineAvatarRaw/);
  assert.match(source, /avatarFromXProfilePage/);
  assert.match(source, /cardFromFxTwitterStatus/);
  assert.match(source, /_linkCardLookup/);
  assert.match(source, /subscriptions_feature_can_gift_premium/);
  assert.match(source, /fxtwitter-no-creds/);
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
  assert.ok(actions.items.some(action => action.id === "like" && action.icon === "heart"));
  assert.ok(actions.items.some(action => action.id === "repost" && action.icon === "tapestry.boost"));
  assert.ok(actions.items.some(action => action.id === "openLink" && action.icon === "tapestry.open.original"));
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
  assert.match(context.verification.accountIdentity.avatar, /^data:image\/jpeg;base64,/);

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
  assert.match(item.author.avatar, /^data:image\/jpeg;base64,/);
  assert.deepStrictEqual(JSON.parse(item.actions.like), {
    tweetId: "1950000000000000001",
    url: "https://x.com/openai/status/1950000000000000001"
  });
  assert.deepStrictEqual(JSON.parse(item.actions.repost), {
    tweetId: "1950000000000000001",
    url: "https://x.com/openai/status/1950000000000000001"
  });
  assert.deepStrictEqual(JSON.parse(item.actions.openLink), {
    url: "https://example.com/article"
  });
  assert.match(item.body, /href="https:\/\/example\.com\/article"/);
  assert.deepStrictEqual(JSON.parse(item.actions.thread), {
    tweetId: "1950000000000000001",
    url: "https://x.com/openai/status/1950000000000000001"
  });
  assert.match(item.actions._connectorBuild, /2026-08-31T12:20Z-full-url-anchor-text@plugin41@1.3.36/);
  assert.ok(item.actions._timelineAvatarRaw);
  assert.match(item.actions._authorAvatarInput, /^data:\d+$/);
  assert.match(item.actions._authorAvatarAssigned, /^data:\d+$/);
  assert.match(item.actions._authorAvatarLookup, /^(timeline|profile)\+embed$/);
  assert.match(item.body, /<!-- local\.x\.timeline 2026-08-31T12:20Z-full-url-anchor-text@plugin41@1.3.36 -->/);
  assert.strictEqual(item.attachments[0].url, "https://pbs.twimg.com/media/a.jpg");
  assert.strictEqual(item.attachments[0].mimeType, "image/jpeg");
  assert.strictEqual(item.attachments[0].text, "Alt text");
  assert.strictEqual(item.attachments[0].aspectSize.width, 1200);
  assert.strictEqual(item.attachments[0].aspectSize.height, 800);
  assert.match(item.annotations[0].text, /4 replies/);
  assert.match(item.annotations[0].text, /12 likes/);
  assert.match(item.annotations[0].text, /1,234 views/);

  const inlineFallback = makeContext({
    MediaAttachment: undefined,
    LinkAttachment: undefined
  });
  vm.runInContext("load()", inlineFallback);
  await settle();
  assert.ifError(inlineFallback.error);
  assert.match(inlineFallback.results[0].body, /<img src="https:\/\/pbs\.twimg\.com\/media\/a\.jpg"/);
  assert.match(inlineFallback.results[0].body, /example\.com\/article/);

  const createWithNameIdentity = makeContext({
    Identity: {
      createWithName: name => ({ name })
    }
  });
  vm.runInContext("load()", createWithNameIdentity);
  await settle();
  assert.ifError(createWithNameIdentity.error);
  assert.deepStrictEqual(createWithNameIdentity.results[0].author, {
    name: "OpenAI",
    username: "@openai",
    avatar: "data:image/jpeg;base64,/9j/2Q==",
    uri: "https://x.com/openai"
  });

  const initialState = JSON.parse(context._state.get("syncStateV20"));
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
  const nextState = JSON.parse(context._state.get("syncStateV20"));
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
  assert.strictEqual(rawSearch.verification.icon, "https://x.com/favicon.ico");

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
  assert.strictEqual(following.verification.icon, "https://x.com/favicon.ico");
  const homeVerifyApi = apiCall(following, "HomeLatestTimeline");
  assert.ok(homeVerifyApi, "verify should call HomeLatestTimeline");
  assert.strictEqual(homeVerifyApi.method, "POST");
  assert.strictEqual(homeVerifyApi.headers["Content-Type"], "application/json");
  const homeVerifyVariables = graphqlVariables(homeVerifyApi);
  assert.strictEqual(homeVerifyVariables.count, 1);
  assert.strictEqual(homeVerifyVariables.includePromotedContent, false);
  assert.strictEqual(homeVerifyVariables.latestControlAvailable, true);
  assert.strictEqual(homeVerifyVariables.requestContext, "launch");
  assert.strictEqual(homeVerifyVariables.withCommunity, true);
  assert.strictEqual(homeVerifyVariables.enableRanking, false);
  assert.deepStrictEqual(homeVerifyVariables.seenTweetIds, []);
  assert.strictEqual(JSON.parse(homeVerifyApi.parameters).queryId, "BKB7oi212Fi7kQtCBGE4zA");

  vm.runInContext("load()", following);
  await settle();
  assert.ifError(following.error);
  assert.strictEqual(following.results.length, 1);
  assert.strictEqual(following.results[0].author.username, "@verge");
  assert.match(following.results[0].author.avatar, /^data:image\/jpeg;base64,/);
  assert.strictEqual(following.results[0].attachments[0].kind, "link");
  assert.strictEqual(following.results[0].attachments[0].title, "Home feed story");
  assert.strictEqual(following.results[0].attachments[0].subtitle, "Rendered from webpage metadata");
  assert.strictEqual(following.results[0].attachments[0].siteName, "Example News");
  assert.strictEqual(following.results[0].attachments[0].image, "https://example.com/home.jpg");
  assert.strictEqual(following.results[0].attachments[0].aspectSize.width, 1200);
  assert.strictEqual(following.results[0].attachments[0].aspectSize.height, 675);
  assert.strictEqual(
    bodyWithoutConnectorStamp(following.results[0].body),
    '<p>Read <a href="https://example.com/home">https://example.com/home</a></p>'
  );
  const homeLoadApi = apiCalls(following, "HomeLatestTimeline").pop();
  const homeLoadVariables = graphqlVariables(homeLoadApi);
  assert.strictEqual(homeLoadVariables.count, 20);
  assert.strictEqual(homeLoadVariables.includePromotedContent, false);
  assert.strictEqual(homeLoadVariables.latestControlAvailable, true);
  assert.strictEqual(homeLoadVariables.requestContext, "launch");
  assert.strictEqual(homeLoadVariables.withCommunity, true);
  assert.strictEqual(homeLoadVariables.enableRanking, false);
  assert.deepStrictEqual(JSON.parse(following._state.get("syncStateV20")).highWaterBySource.following, "1950000000000000022");

  const wrapped = makeContext({
    timeline: timelineBody([{ tweet: tweetResult({ id: "1950000000000000004" }) }]),
    show_media: "off"
  });
  vm.runInContext("load()", wrapped);
  await settle();
  assert.ifError(wrapped.error);
  assert.strictEqual(wrapped.results[0].attachments[0].kind, "link");
  assert.strictEqual(wrapped.results[0].attachments[0].url, "https://example.com/article");
  assert.match(wrapped.results[0].body, /href="https:\/\/example\.com\/article"/);

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
  assert.match(linkCard.results[0].attachments[0].image, /^data:image\/jpeg;base64,/);
  assert.strictEqual(linkCard.results[0].attachments[0].aspectSize.width, 640);
  assert.strictEqual(
    bodyWithoutConnectorStamp(linkCard.results[0].body),
    '<p>Read this<br><a href="https://example.com/card">https://example.com/card</a></p>'
  );

  const tweetCard = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000028",
        fullText: "Read tweet card https://t.co/tweetcard",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/tweetcard", "https://example.com/tweet-card", "example.com/tweet-card")
            ]
          },
          extended_entities: { media: [] }
        },
        card: null,
        tweet_card: card({
          card_url: stringValue("https://t.co/tweetcard"),
          title: stringValue("Tweet card title"),
          description: stringValue("Tweet card summary"),
          site_name: stringValue("Tweet Cards"),
          thumbnail_image_original: imageValue("https://pbs.twimg.com/card_img/tweet-card?format=jpg&name=small", 1200, 630)
        })
      })
    ])
  });
  vm.runInContext("load()", tweetCard);
  await settle();
  assert.ifError(tweetCard.error);
  assert.strictEqual(tweetCard.results[0].attachments[0].url, "https://example.com/tweet-card");
  assert.strictEqual(tweetCard.results[0].attachments[0].title, "Tweet card title");
  assert.strictEqual(tweetCard.results[0].attachments[0].subtitle, "Tweet card summary");
  assert.strictEqual(tweetCard.results[0].attachments[0].siteName, "Tweet Cards");
  assert.match(tweetCard.results[0].attachments[0].image, /^data:image\/jpeg;base64,/);
  assert.strictEqual(
    bodyWithoutConnectorStamp(tweetCard.results[0].body),
    '<p>Read tweet card <a href="https://example.com/tweet-card">https://example.com/tweet-card</a></p>'
  );

  const unifiedCardJson = {
    type: "image_website",
    destination_objects: {
      browser_1: {
        data: {
          url_data: { url: "https://example.com/unified" },
          display_url: "example.com/unified"
        }
      }
    },
    component_objects: {
      details_1: {
        data: {
          destination: "browser_1",
          title: { content: "Unified title" },
          subtitle: { content: "Unified summary" },
          vanity_url: { content: "Example Unified" }
        }
      },
      media_1: {
        data: { id: "media_1" }
      }
    },
    media_entities: {
      media_1: modernImageEntity("https://pbs.twimg.com/card_img/unified?format=jpg&name=small")
    }
  };
  const unifiedCard = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000029",
        fullText: "Unified https://t.co/unified",
        legacy: {
          entities: {
            urls: []
          },
          extended_entities: { media: [] }
        },
        card: card({
          card_url: stringValue("https://t.co/unified"),
          unified_card: stringValue(JSON.stringify(unifiedCardJson))
        })
      })
    ])
  });
  vm.runInContext("load()", unifiedCard);
  await settle();
  assert.ifError(unifiedCard.error);
  assert.strictEqual(unifiedCard.results[0].attachments[0].url, "https://example.com/unified");
  assert.strictEqual(unifiedCard.results[0].attachments[0].title, "Unified title");
  assert.strictEqual(unifiedCard.results[0].attachments[0].subtitle, "Unified summary");
  assert.strictEqual(unifiedCard.results[0].attachments[0].siteName, "Example Unified");
  assert.match(unifiedCard.results[0].attachments[0].image, /^data:image\/jpeg;base64,/);
  assert.strictEqual(unifiedCard.results[0].attachments[0].aspectSize.width, 1200);
  assert.strictEqual(
    bodyWithoutConnectorStamp(unifiedCard.results[0].body),
    '<p>Unified <a href="https://example.com/unified">https://example.com/unified</a></p>'
  );

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
  assert.match(multiLinkCard.results[0].body, /href="https:\/\/example\.com\/card"/);

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
  assert.strictEqual(
    bodyWithoutConnectorStamp(playerCard.results[0].body),
    '<p>Watch this <a href="https://video.example.com/watch/1">https://video.example.com/watch/1</a></p>'
  );

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
  assert.strictEqual(
    bodyWithoutConnectorStamp(urlOnlyCard.results[0].body),
    '<p><a href="https://example.com/only">https://example.com/only</a></p>'
  );

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
  assert.strictEqual(
    bodyWithoutConnectorStamp(unfurled.results[0].body),
    '<p>Read <a href="https://example.com/preview">https://example.com/preview</a></p>'
  );
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
  assert.match(video.results[0].attachments[0].thumbnail, /^data:image\/jpeg;base64,/);
  assert.strictEqual(video.results[0].attachments[0].aspectSize.width, 16);
  assert.strictEqual(video.results[0].attachments[0].aspectSize.height, 9);

  const legacyMediaPlaceholder = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000025",
        fullText: "Legacy photo https://t.co/photo",
        legacy: {
          entities: {
            urls: [],
            media: [
              {
                type: "photo",
                url: "https://t.co/photo",
                media_url_https: "https://pbs.twimg.com/media/legacy?format=jpg&name=small",
                original_info: { width: 640, height: 480 },
                ext_alt_text: "Legacy photo"
              }
            ]
          },
          extended_entities: { media: [] }
        }
      })
    ])
  });
  vm.runInContext("load()", legacyMediaPlaceholder);
  await settle();
  assert.ifError(legacyMediaPlaceholder.error);
  assert.strictEqual(legacyMediaPlaceholder.results[0].attachments[0].url, "https://pbs.twimg.com/media/legacy?format=jpg&name=large");
  assert.strictEqual(legacyMediaPlaceholder.results[0].attachments[0].text, "Legacy photo");
  assert.strictEqual(bodyWithoutConnectorStamp(legacyMediaPlaceholder.results[0].body), "<p>Legacy photo</p>");

  const modernImage = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000026",
        fullText: "Modern image https://t.co/img",
        legacy: { entities: { urls: [] }, extended_entities: { media: [] } },
        media_entities: {
          "3_1": modernImageEntity("https://pbs.twimg.com/media/modern?format=jpg&name=small", "https://t.co/img")
        }
      })
    ])
  });
  vm.runInContext("load()", modernImage);
  await settle();
  assert.ifError(modernImage.error);
  assert.strictEqual(modernImage.results[0].attachments[0].url, "https://pbs.twimg.com/media/modern?format=jpg&name=large");
  assert.strictEqual(modernImage.results[0].attachments[0].mimeType, "image/jpeg");
  assert.strictEqual(modernImage.results[0].attachments[0].text, "Modern image alt text");
  assert.strictEqual(modernImage.results[0].attachments[0].aspectSize.width, 1200);
  assert.strictEqual(bodyWithoutConnectorStamp(modernImage.results[0].body), "<p>Modern image</p>");

  const modernVideo = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000027",
        fullText: "Modern video https://t.co/vid",
        legacy: { entities: { urls: [] }, extended_entities: { media: [] } },
        media_entities: [
          modernVideoEntity(
            "https://video.twimg.com/amplify_video/1/vid/avc1/1280x720/high.mp4",
            "https://pbs.twimg.com/amplify_video_thumb/1/img/thumb.jpg",
            "https://t.co/vid"
          )
        ]
      })
    ])
  });
  vm.runInContext("load()", modernVideo);
  await settle();
  assert.ifError(modernVideo.error);
  assert.strictEqual(modernVideo.results[0].attachments[0].url, "https://video.twimg.com/amplify_video/1/vid/avc1/1280x720/high.mp4");
  assert.match(modernVideo.results[0].attachments[0].thumbnail, /^data:image\/jpeg;base64,/);
  assert.strictEqual(modernVideo.results[0].attachments[0].mimeType, "video/mp4");
  assert.match(bodyWithoutConnectorStamp(modernVideo.results[0].body), /^<p>Modern video<\/p><p><img src="data:image\/jpeg;base64,/);

  const modernNestedVideo = tweetResult({
    id: "1950000000000000028",
    username: "nesteduser",
    name: "Nested User",
    profile_image_url: "",
    fullText: "Ignored legacy text",
    legacy: undefined
  });
  delete modernNestedVideo.legacy;
  modernNestedVideo.details = {
    id_str: "1950000000000000028",
    full_text: "Nested video https://t.co/nested",
    created_at_ms: "1787980800000",
    url_entities: [urlEntity("https://t.co/nested", "https://example.com/nested", "example.com/nested")]
  };
  modernNestedVideo.core = {
    user_result: {
      result: {
        rest_id: "nesteduser-id",
        core: {
          screen_name: "nesteduser",
          name: "Nested User",
          profile_image_url: "https://pbs.twimg.com/profile_images/9/nested_normal.jpg"
        },
        legacy: {
          screen_name: "nesteduser",
          name: "Nested User"
        }
      }
    }
  };
  modernNestedVideo.counts = {
    favorite_count: 6,
    retweet_count: 4,
    reply_count: 2,
    quote_count: 1,
    view_count: 900
  };
  modernNestedVideo.media_entities = [{
    media_key: "7_2",
    url: "https://t.co/nested",
    media_results: {
      result: {
        media_info: {
          __typename: "ApiVideo",
          media_url_https: "https://pbs.twimg.com/amplify_video_thumb/9/nested.jpg",
          original_info: { width: 1920, height: 1080 },
          video_info: {
            aspect_ratio: [16, 9],
            variants: [
              { content_type: "video/mp4", bit_rate: 640000, url: "https://video.twimg.com/nested-low.mp4" },
              { content_type: "video/mp4", bit_rate: 2240000, url: "https://video.twimg.com/nested-high.mp4" }
            ]
          }
        }
      }
    }
  }];
  const modernNested = makeContext({ timeline: timelineBody([{ tweet: modernNestedVideo }]) });
  vm.runInContext("load()", modernNested);
  await settle();
  assert.ifError(modernNested.error);
  assert.strictEqual(modernNested.results.length, 1);
  assert.strictEqual(modernNested.results[0].author.name, "Nested User");
  assert.strictEqual(modernNested.results[0].author.username, "@nesteduser");
  assert.match(modernNested.results[0].author.avatar, /^data:image\/jpeg;base64,/);
  assert.match(bodyWithoutConnectorStamp(modernNested.results[0].body), /^<p>Nested video <a href="https:\/\/example.com\/nested">https:\/\/example.com\/nested<\/a><\/p><p><img src="data:image\/jpeg;base64,/);
  assert.strictEqual(modernNested.results[0].attachments[0].url, "https://video.twimg.com/nested-high.mp4");
  assert.match(modernNested.results[0].attachments[0].thumbnail, /^data:image\/jpeg;base64,/);
  assert.strictEqual(modernNested.results[0].attachments[0].aspectSize.width, 1920);
  assert.strictEqual(modernNested.results[0].attachments[0].aspectSize.height, 1080);
  assert.match(modernNested.results[0].annotations.map(annotation => annotation.text).join(" "), /6 likes/);

  const nestedEntityLinks = tweetResult({
    id: "1950000000000000030",
    username: "nestedlinks",
    name: "Nested Links",
    profile_image_url: "https://pbs.twimg.com/profile_images/10/nestedlinks_normal.jpg",
    fullText: "Ignored legacy text",
    legacy: undefined
  });
  delete nestedEntityLinks.legacy;
  nestedEntityLinks.details = {
    id_str: "1950000000000000030",
    full_text: "Details entity link https://t.co/details",
    created_at_ms: "1787980800000",
    entities: {
      urls: [urlEntity(
        "https://t.co/details",
        "https://example.org/details",
        "example.org/details"
      )]
    }
  };
  nestedEntityLinks.core = {
    user_result: {
      result: {
        rest_id: "nestedlinks-id",
        core: {
          screen_name: "nestedlinks",
          name: "Nested Links",
          profile_image_url: "https://pbs.twimg.com/profile_images/10/nestedlinks_normal.jpg"
        }
      }
    }
  };
  const nestedEntityContext = makeContext({
    timeline: timelineBody([{ tweet: nestedEntityLinks }])
  });
  vm.runInContext("load()", nestedEntityContext);
  await settle();
  assert.ifError(nestedEntityContext.error);
  assert.strictEqual(
    bodyWithoutConnectorStamp(nestedEntityContext.results[0].body),
    '<p>Details entity link <a href="https://example.org/details">https://example.org/details</a></p>'
  );
  assert.strictEqual(nestedEntityContext.results[0].attachments[0].kind, "link");
  assert.strictEqual(nestedEntityContext.results[0].attachments[0].url, "https://example.org/details");

  const mediaEntitySource = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000029",
        fullText: "Baby elephant https://t.co/media",
        legacy: {
          entities: {
            urls: [urlEntity(
              "https://t.co/media",
              "https://x.com/rainmaker1973/status/1950000000000000029/photo/1",
              "x.com/rainmaker1973/status/1950000000000000029/photo/1"
            )]
          },
          extended_entities: {
            media: [{
              type: "photo",
              media_url_https: "https://pbs.twimg.com/media/elephant.jpg",
              original_info: { width: 1200, height: 800 }
            }]
          }
        }
      })
    ])
  });
  vm.runInContext("load()", mediaEntitySource);
  await settle();
  assert.ifError(mediaEntitySource.error);
  assert.strictEqual(bodyWithoutConnectorStamp(mediaEntitySource.results[0].body), "<p>Baby elephant</p>");
  assert.strictEqual(mediaEntitySource.results[0].attachments[0].url, "https://pbs.twimg.com/media/elephant.jpg");

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
  assert.match(queryAvatar.results[0].author.avatar, /^data:image\/jpeg;base64,/);

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
  assert.match(queryAvatarWithoutExtension.results[0].author.avatar, /^data:image\/jpeg;base64,/);

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
  assert.match(modernAvatar.results[0].author.avatar, /^data:image\/jpeg;base64,/);

  const typedOnlyAvatar = makeContext({
    timeline: timelineBody([
      {
        rest_id: "1950000000000000040",
        legacy: {
          id_str: "1950000000000000040",
          full_text: "Typed user shape only",
          created_at: "Fri Aug 28 08:00:00 +0000 2026",
          entities: { urls: [] },
          extended_entities: { media: [] }
        },
        core: {
          user_results: {
            result: {
              __typename: "User",
              rest_id: "typeduser-id",
              core: {
                screen_name: "typeduser",
                name: "Typed User"
              },
              avatar: {
                image_url: "https://pbs.twimg.com/profile_images/40/typeduser_normal.jpg"
              }
            }
          }
        }
      }
    ])
  });
  vm.runInContext("load()", typedOnlyAvatar);
  await settle();
  assert.ifError(typedOnlyAvatar.error);
  assert.match(typedOnlyAvatar.results[0].author.avatar, /^data:image\/jpeg;base64,/);
  assert.match(typedOnlyAvatar.results[0].actions._authorAvatarLookup, /^timeline\+embed$/);

  const liveShapedAvatar = tweetResult({
    id: "1950000000000000031",
    username: "liveuser",
    name: "Live User",
    profile_image_url: "",
    fullText: "Live-shaped payload"
  });
  liveShapedAvatar.core = {
    user_results: {
      result: {
        rest_id: "liveuser-id",
        legacy: {
          screen_name: "liveuser",
          name: "Live User",
          profile_image_url_https: "https://pbs.twimg.com/profile_images/31/liveuser_normal.jpg"
        }
      }
    }
  };
  const liveShapedContext = makeContext({
    timeline: timelineBody([{ tweet: liveShapedAvatar }])
  });
  vm.runInContext("load()", liveShapedContext);
  await settle();
  assert.ifError(liveShapedContext.error);
  assert.match(
    liveShapedContext.results[0].author.avatar,
    /^data:image\/jpeg;base64,/
  );

  const httpAvatar = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000032",
        profile_image_url: "http://pbs.twimg.com/profile_images/32/httpuser_normal.jpg"
      })
    ])
  });
  vm.runInContext("load()", httpAvatar);
  await settle();
  assert.ifError(httpAvatar.error);
  assert.match(
    httpAvatar.results[0].author.avatar,
    /^data:image\/jpeg;base64,/
  );

  const loomCreateIgnoresAvatar = makeContext({
    Identity: {
      createWithName: name => ({ name }),
      create: (name, username, avatar, uri) => ({ name, username, avatar, uri })
    }
  });
  vm.runInContext("load()", loomCreateIgnoresAvatar);
  await settle();
  assert.ifError(loomCreateIgnoresAvatar.error);
  assert.match(
    loomCreateIgnoresAvatar.results[0].author.avatar,
    /^data:image\/jpeg;base64,/
  );

  const protocolRelativeAvatar = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000034",
        profile_image_url: "//pbs.twimg.com/profile_images/34/protocol_normal.jpg"
      })
    ])
  });
  vm.runInContext("load()", protocolRelativeAvatar);
  await settle();
  assert.ifError(protocolRelativeAvatar.error);
  assert.match(
    protocolRelativeAvatar.results[0].author.avatar,
    /^data:image\/jpeg;base64,/
  );

  const schemelessTwimgAvatar = makeContext({
    timeline: timelineBody([
      {
        rest_id: "1950000000000000042",
        legacy: {
          id_str: "1950000000000000042",
          full_text: "Scheme-less twimg profile URL",
          created_at: "Fri Aug 28 08:00:00 +0000 2026",
          entities: { urls: [] },
          extended_entities: { media: [] }
        },
        core: {
          user_results: {
            result: {
              rest_id: "schemeless-id",
              legacy: {
                screen_name: "schemeless",
                name: "Scheme Less",
                profile_image_url_https: "pbs.twimg.com/profile_images/42/schemeless_normal.jpg"
              }
            }
          }
        }
      }
    ])
  });
  vm.runInContext("load()", schemelessTwimgAvatar);
  await settle();
  assert.ifError(schemelessTwimgAvatar.error);
  assert.match(schemelessTwimgAvatar.results[0].author.avatar, /^data:image\/jpeg;base64,/);
  assert.match(schemelessTwimgAvatar.results[0].actions._authorAvatarLookup, /^timeline\+embed$/);

  const wrappedLegacyAvatar = makeContext({
    timeline: timelineBody([
      {
        rest_id: "1950000000000000043",
        legacy: {
          id_str: "1950000000000000043",
          full_text: "Legacy avatar on wrapper",
          created_at: "Fri Aug 28 08:00:00 +0000 2026",
          entities: { urls: [] },
          extended_entities: { media: [] }
        },
        core: {
          user_results: {
            result: {
              rest_id: "wrapped-id",
              core: { screen_name: "wrapped", name: "Wrapped User" },
              legacy: { screen_name: "wrapped", name: "Wrapped User" }
            },
            legacy: {
              profile_image_url_https: "https://pbs.twimg.com/profile_images/43/wrapped_normal.jpg"
            }
          }
        }
      }
    ])
  });
  vm.runInContext("load()", wrappedLegacyAvatar);
  await settle();
  assert.ifError(wrappedLegacyAvatar.error);
  assert.match(wrappedLegacyAvatar.results[0].author.avatar, /^data:image\/jpeg;base64,/);

  const objectLegacyAvatar = makeContext({
    timeline: timelineBody([
      {
        rest_id: "1950000000000000044",
        legacy: {
          id_str: "1950000000000000044",
          full_text: "Object-shaped legacy profile image",
          created_at: "Fri Aug 28 08:00:00 +0000 2026",
          entities: { urls: [] },
          extended_entities: { media: [] }
        },
        core: {
          user_results: {
            result: {
              rest_id: "object-id",
              core: { screen_name: "objectpi", name: "Object Pi" },
              legacy: {
                screen_name: "objectpi",
                name: "Object Pi",
                profile_image_url_https: {
                  image_url: "https://pbs.twimg.com/profile_images/44/objectpi_normal.jpg"
                }
              }
            }
          }
        }
      }
    ])
  });
  vm.runInContext("load()", objectLegacyAvatar);
  await settle();
  assert.ifError(objectLegacyAvatar.error);
  assert.match(objectLegacyAvatar.results[0].author.avatar, /^data:image\/jpeg;base64,/);

  const rawHintRecovery = makeContext({
    timeline: timelineBody([
      {
        rest_id: "1950000000000000046",
        legacy: {
          id_str: "1950000000000000046",
          full_text: "Recover avatar from timeline raw hint",
          created_at: "Fri Aug 28 08:00:00 +0000 2026",
          entities: { urls: [] },
          extended_entities: { media: [] }
        },
        core: {
          user_results: {
            result: {
              rest_id: "tibo-id",
              core: { screen_name: "thsottiaux", name: "Tibo" },
              legacy: { screen_name: "thsottiaux", name: "Tibo" }
            },
            legacy: {
              profile_image_url_https: "https://pbs.twimg.com/profile_images/2093807917833281537/2yBgpwVV_normal.jpg"
            }
          }
        }
      }
    ])
  });
  vm.runInContext("load()", rawHintRecovery);
  await settle();
  assert.ifError(rawHintRecovery.error);
  assert.match(rawHintRecovery.results[0].author.avatar, /^data:image\/jpeg;base64,/);
  assert.match(rawHintRecovery.results[0].actions._authorAvatarLookup, /^timeline\+embed$/);
  assert.match(
    rawHintRecovery.results[0].actions._timelineAvatarRaw,
    /profile_images\/2093807917833281537\/2yBgpwVV_normal\.jpg/
  );

  const ignoredAssignmentIdentity = makeContext({
    Identity: {
      createWithName: name => {
        const identity = { name };
        Object.defineProperty(identity, "avatar", {
          configurable: true,
          enumerable: true,
          get() {
            return null;
          },
          set() {}
        });
        return identity;
      }
    }
  });
  vm.runInContext("load()", ignoredAssignmentIdentity);
  await settle();
  assert.ifError(ignoredAssignmentIdentity.error);
  assert.ok(!ignoredAssignmentIdentity.results[0].author.avatar);

  const unavailableUser = makeContext({
    timeline: timelineBody([
      {
        rest_id: "1950000000000000033",
        legacy: {
          id_str: "1950000000000000033",
          full_text: "Suspended author",
          created_at: "Fri Aug 28 08:00:00 +0000 2026",
          entities: { urls: [] },
          extended_entities: { media: [] }
        },
        core: {
          user_results: {
            result: {
              __typename: "UserUnavailable",
              message: "User is suspended"
            }
          }
        }
      }
    ])
  });
  vm.runInContext("load()", unavailableUser);
  await settle();
  assert.ifError(unavailableUser.error);
  assert.strictEqual(unavailableUser.results[0].author.name, "X");
  assert.ok(!unavailableUser.results[0].author.avatar);

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
  assert.match(quoted.results[0].attachments[0].author.avatar, /^data:image\/jpeg;base64,/);
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

  const replyMentions = makeContext({
    include_replies: "on",
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000016",
        fullText: "@ndrewpignanelli @kayacancode Users may not, but for audit purposes there needs to be UI for it.",
        in_reply_to_status_id_str: "1950000000000000010",
        in_reply_to_screen_name: "ndrewpignanelli",
        legacy: { extended_entities: { media: [] }, entities: { urls: [] } }
      })
    ])
  });
  vm.runInContext("load()", replyMentions);
  await settle();
  assert.ifError(replyMentions.error);
  assert.match(replyMentions.results[0].body, /Users may not, but for audit purposes/);
  assert.doesNotMatch(replyMentions.results[0].body, /@ndrewpignanelli/);
  assert.doesNotMatch(replyMentions.results[0].body, /@kayacancode/);
  assert.strictEqual(replyMentions.results[0].annotations[0].text, "Reply to @ndrewpignanelli");

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
  assert.match(repost.results[0].annotations[0].icon, /^data:image\/jpeg;base64,/);
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

  const likeContext = makeContext();
  likeContext.sendRequest = async (url, method, parameters, headers) => {
    likeContext._calls.push({ url, method, parameters, headers });
    if (url === "https://x.com/") return makeHomeHtml();
    if (url.includes("ondemand.s.abcdefa.js")) return ondemandJs;
    const action = graphqlAction(url);
    if (action === "UserByScreenName") return JSON.stringify(userProfileBody("openai"));
    if (action === "UserTweets") return JSON.stringify(homeTimelineBody([tweetResult()]));
    if (action === "FavoriteTweet") {
      return JSON.stringify({ data: { favorite_tweet: "Done" } });
    }
    return JSON.stringify({ data: {} });
  };
  vm.runInContext("performAction('like', JSON.stringify({ tweetId: '1950000000000000001' }), { uri: 'https://x.com/openai/status/1950000000000000001', actions: { like: JSON.stringify({ tweetId: '1950000000000000001' }) }, annotations: [ { text: '4 replies - 3 reposts - 12 likes - 1,234 views' } ] })", likeContext);
  await settle();
  assert.ifError(likeContext.actionError);
  assert.ok(apiCall(likeContext, "FavoriteTweet"), "like action should call FavoriteTweet");
  assert.ok(likeContext.actionResult.actions.unlike);
  assert.ok(!likeContext.actionResult.actions.like);
  assert.match(likeContext.actionResult.annotations[0].text, /13 likes/);

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
  retry.sendRequest = async (url, method, parameters, headers, fullResponse) => {
    retry._calls.push({ url, method, parameters, headers, fullResponse });
    if (url === "https://x.com/") return makeHomeHtml();
    if (url.includes("ondemand.s.abcdefa.js")) return ondemandJs;
    if (url.includes("/account/settings.json")) return JSON.stringify(retry.accountSettings);
    if (url.includes("pbs.twimg.com/")) {
      const body = String.fromCharCode(0xff, 0xd8, 0xff, 0xd9);
      if (fullResponse) {
        return JSON.stringify({
          status: 200,
          headers: { "content-type": "image/jpeg" },
          url,
          body
        });
      }
      return body;
    }
    if (/^https?:\/\//.test(String(url)) && !String(url).includes("x.com/") && !String(url).includes("api.fxtwitter.com/")) {
      return "<html></html>";
    }
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

  const profileRestFallback = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000035",
        username: "restonly",
        name: "Rest Only",
        profile_image_url: ""
      })
    ])
  });
  const sparseUserTweet = tweetResult({
    id: "1950000000000000035",
    username: "restonly",
    name: "Rest Only",
    profile_image_url: ""
  });
  sparseUserTweet.core = {
    user_results: {
      result: {
        rest_id: "restonly-id",
        core: { screen_name: "restonly", name: "Rest Only" },
        legacy: { screen_name: "restonly", name: "Rest Only" }
      }
    }
  };
  profileRestFallback.timeline = timelineBody([{ tweet: sparseUserTweet }]);
  const profileRestFallbackRequest = profileRestFallback.sendRequest;
  profileRestFallback.sendRequest = async (url, method, parameters, headers, fullResponse) => {
    if (graphqlAction(url) === "UserByScreenName") {
      const variables = graphqlVariables({ url, parameters });
      return JSON.stringify({
        data: {
          user: {
            result: {
              rest_id: "restonly-id",
              core: {
                screen_name: variables.screen_name,
                name: "Rest Only"
              },
              legacy: {
                screen_name: variables.screen_name,
                name: "Rest Only"
              }
            }
          }
        }
      });
    }
    if (graphqlAction(url) === "UserByRestId") {
      return JSON.stringify({
        data: {
          user: {
            result: {
              rest_id: "restonly-id",
              core: {
                screen_name: "restonly",
                name: "Rest Only"
              },
              legacy: {
                screen_name: "restonly",
                name: "Rest Only",
                profile_image_url_https: "https://pbs.twimg.com/profile_images/35/restonly_normal.jpg"
              }
            }
          }
        }
      });
    }
    return profileRestFallbackRequest(url, method, parameters, headers, fullResponse);
  };
  vm.runInContext("load()", profileRestFallback);
  await settle();
  assert.ifError(profileRestFallback.error);
  assert.match(profileRestFallback.results[0].author.avatar, /^data:image\/jpeg;base64,/);
  assert.strictEqual(
    profileRestFallback.results[0].actions._authorAvatarLookup,
    "profile+restid+embed"
  );

  const fxTwitterFallback = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000041",
        username: "reuters",
        name: "Reuters",
        profile_image_url: ""
      })
    ])
  });
  const sparseFxTweet = tweetResult({
    id: "1950000000000000041",
    username: "reuters",
    name: "Reuters",
    profile_image_url: ""
  });
  sparseFxTweet.core = {
    user_results: {
      result: {
        rest_id: "reuters-id",
        core: { screen_name: "reuters", name: "Reuters" },
        legacy: { screen_name: "reuters", name: "Reuters" }
      }
    }
  };
  fxTwitterFallback.timeline = timelineBody([{ tweet: sparseFxTweet }]);
  const fxTwitterFallbackRequest = fxTwitterFallback.sendRequest;
  fxTwitterFallback.sendRequest = async (url, method, parameters, headers, fullResponse) => {
    if (String(url).includes("api.fxtwitter.com/2/profile/reuters")) {
      const payload = JSON.stringify({
        code: 200,
        user: {
          avatar_url: "https://pbs.twimg.com/profile_images/41/reuters_normal.jpg"
        }
      });
      if (fullResponse) {
        return JSON.stringify({ status: 200, headers: { "content-type": "application/json" }, body: payload });
      }
      return payload;
    }
    if (String(url) === "https://x.com/reuters") {
      return fullResponse
        ? JSON.stringify({ status: 404, headers: {}, body: "" })
        : "";
    }
    if (graphqlAction(url) === "UserByScreenName") {
      const variables = graphqlVariables({ url, parameters });
      return JSON.stringify({
        data: {
          user: {
            result: {
              rest_id: "reuters-id",
              core: {
                screen_name: variables.screen_name,
                name: "Reuters"
              },
              legacy: {
                screen_name: variables.screen_name,
                name: "Reuters"
              }
            }
          }
        }
      });
    }
    if (graphqlAction(url) === "UserByRestId") {
      return JSON.stringify({
        data: {
          user: {
            result: {
              rest_id: "reuters-id",
              core: {
                screen_name: "reuters",
                name: "Reuters"
              },
              legacy: {
                screen_name: "reuters",
                name: "Reuters"
              }
            }
          }
        }
      });
    }
    return fxTwitterFallbackRequest(url, method, parameters, headers, fullResponse);
  };
  vm.runInContext("load()", fxTwitterFallback);
  await settle();
  assert.ifError(fxTwitterFallback.error);
  assert.match(fxTwitterFallback.results[0].author.avatar, /^data:image\/jpeg;base64,/);
  assert.strictEqual(
    fxTwitterFallback.results[0].actions._authorAvatarLookup,
    "profile+fxtwitter+embed"
  );

  const xcomFallback = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000045",
        username: "xcomuser",
        name: "Xcom User",
        profile_image_url: ""
      })
    ])
  });
  const sparseXcomTweet = tweetResult({
    id: "1950000000000000045",
    username: "xcomuser",
    name: "Xcom User",
    profile_image_url: ""
  });
  sparseXcomTweet.core = {
    user_results: {
      result: {
        rest_id: "xcomuser-id",
        core: { screen_name: "xcomuser", name: "Xcom User" },
        legacy: { screen_name: "xcomuser", name: "Xcom User" }
      }
    }
  };
  xcomFallback.timeline = timelineBody([{ tweet: sparseXcomTweet }]);
  const xcomFallbackRequest = xcomFallback.sendRequest;
  xcomFallback.sendRequest = async (url, method, parameters, headers, fullResponse) => {
    if (String(url) === "https://x.com/xcomuser") {
      const body = "<html><script>\"profile_image_url_https\":\"https://pbs.twimg.com/profile_images/45/xcomuser_normal.jpg\"</script></html>";
      return fullResponse
        ? JSON.stringify({ status: 200, headers: { "content-type": "text/html" }, body })
        : body;
    }
    if (graphqlAction(url) === "UserByScreenName") {
      return JSON.stringify({
        data: {
          user: {
            result: {
              rest_id: "xcomuser-id",
              core: { screen_name: "xcomuser", name: "Xcom User" },
              legacy: { screen_name: "xcomuser", name: "Xcom User" }
            }
          }
        }
      });
    }
    if (graphqlAction(url) === "UserByRestId") {
      return JSON.stringify({
        data: {
          user: {
            result: {
              rest_id: "xcomuser-id",
              core: { screen_name: "xcomuser", name: "Xcom User" },
              legacy: { screen_name: "xcomuser", name: "Xcom User" }
            }
          }
        }
      });
    }
    return xcomFallbackRequest(url, method, parameters, headers, fullResponse);
  };
  vm.runInContext("load()", xcomFallback);
  await settle();
  assert.ifError(xcomFallback.error);
  assert.match(xcomFallback.results[0].author.avatar, /^data:image\/jpeg;base64,/);
  assert.strictEqual(
    xcomFallback.results[0].actions._authorAvatarLookup,
    "profile+xcom+embed"
  );

  const fxTwitterCard = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000047",
        username: "Reuters",
        name: "Reuters",
        fullText: "Shares skid in Asia https://reut.rs/4wTZwhv https://reut.rs/4wTZwhv",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/abc", "https://reut.rs/4wTZwhv", "reut.rs/4wTZwhv")
            ]
          },
          extended_entities: { media: [] }
        }
      })
    ])
  });
  const fxTwitterCardRequest = fxTwitterCard.sendRequest;
  fxTwitterCard.sendRequest = async (url, method, parameters, headers, fullResponse) => {
    if (String(url).includes("api.fxtwitter.com/Reuters/status/1950000000000000047")) {
      const payload = JSON.stringify({
        code: 200,
        tweet: {
          card: {
            url: "https://reut.rs/4wTZwhv",
            title: "Shares skid in Asia as oil climbs, yields stay high",
            description: "Share markets slid on Monday in Asia.",
            domain: "www.reuters.com",
            image: {
              width: 800,
              height: 419,
              url: "https://pbs.twimg.com/card_img/47/reuters_card?format=jpg&name=800x419"
            }
          }
        }
      });
      return fullResponse
        ? JSON.stringify({ status: 200, headers: { "content-type": "application/json" }, body: payload })
        : payload;
    }
    if (String(url).includes("api.fxtwitter.com/2/profile/")) {
      return fullResponse
        ? JSON.stringify({ status: 404, headers: {}, body: "{}" })
        : "{}";
    }
    if (graphqlAction(url) === "TweetDetail") {
      return JSON.stringify({ data: { threaded_conversation_with_injections_v2: { instructions: [] } } });
    }
    return fxTwitterCardRequest(url, method, parameters, headers, fullResponse);
  };
  vm.runInContext("load()", fxTwitterCard);
  await settle();
  assert.ifError(fxTwitterCard.error);
  assert.strictEqual(fxTwitterCard.results[0].attachments[0].kind, "link");
  assert.strictEqual(
    fxTwitterCard.results[0].attachments[0].title,
    "Shares skid in Asia as oil climbs, yields stay high"
  );
  assert.match(fxTwitterCard.results[0].attachments[0].image, /^data:image\/jpeg;base64,/);
  assert.strictEqual(fxTwitterCard.results[0].actions._linkCardLookup, "fxtwitter");
  assert.strictEqual(fxTwitterCard.results[0].actions._linkCardInput, "title+subtitle+image-data+site");
  assert.deepStrictEqual(JSON.parse(fxTwitterCard.results[0].actions.openLink), {
    url: "https://reut.rs/4wTZwhv"
  });
  assert.match(fxTwitterCard.results[0].body, /href="https:\/\/reut\.rs\/4wTZwhv"/);

  const fxTwitterVideo = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000048",
        username: "Rainmaker1973",
        name: "Massimo",
        fullText: "Scottish dress [📹andythehighlander] https://t.co/s7SoN2UbKY",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/s7SoN2UbKY", "https://x.com/Rainmaker1973/status/1950000000000000048/video/1", "t.co/s7SoN2UbKY")
            ]
          },
          extended_entities: { media: [] }
        }
      })
    ])
  });
  const fxTwitterVideoRequest = fxTwitterVideo.sendRequest;
  fxTwitterVideo.sendRequest = async (url, method, parameters, headers, fullResponse) => {
    if (String(url).includes("api.fxtwitter.com/Rainmaker1973/status/1950000000000000048")) {
      const payload = JSON.stringify({
        code: 200,
        tweet: {
          media: {
            videos: [
              {
                type: "video",
                url: "https://video.twimg.com/amplify_video/48/vid/avc1/720x1280/high.mp4",
                thumbnail_url: "https://pbs.twimg.com/amplify_video_thumb/48/img/thumb.jpg",
                width: 720,
                height: 1280,
                format: "video/mp4"
              }
            ]
          }
        }
      });
      return fullResponse
        ? JSON.stringify({ status: 200, headers: { "content-type": "application/json" }, body: payload })
        : payload;
    }
    if (String(url).includes("api.fxtwitter.com/2/profile/")) {
      return fullResponse
        ? JSON.stringify({ status: 404, headers: {}, body: "{}" })
        : "{}";
    }
    if (graphqlAction(url) === "TweetDetail") {
      return JSON.stringify({ data: { threaded_conversation_with_injections_v2: { instructions: [] } } });
    }
    return fxTwitterVideoRequest(url, method, parameters, headers, fullResponse);
  };
  vm.runInContext("load()", fxTwitterVideo);
  await settle();
  assert.ifError(fxTwitterVideo.error);
  assert.strictEqual(fxTwitterVideo.results[0].attachments[0].kind, "media");
  assert.strictEqual(
    fxTwitterVideo.results[0].attachments[0].url,
    "https://video.twimg.com/amplify_video/48/vid/avc1/720x1280/high.mp4"
  );
  assert.strictEqual(fxTwitterVideo.results[0].actions._mediaLookup, "fxtwitter");
  assert.doesNotMatch(fxTwitterVideo.results[0].body, /t\.co\/s7SoN2UbKY/);
  assert.match(fxTwitterVideo.results[0].attachments[0].thumbnail, /^data:image\/jpeg;base64,/);
  assert.match(fxTwitterVideo.results[0].body, /<img src="data:image\/jpeg;base64,/);
  assert.ok(!fxTwitterVideo.results[0].attachments.some(attachment => attachment.kind === "link"));

  const bmwVideo = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000049",
        username: "Rainmaker1973",
        name: "Massimo",
        fullText: "Thieves broke the lock but couldn't take the BMW R1250GS. https://t.co/X0dqX8luUJ",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/X0dqX8luUJ", "https://x.com/Rainmaker1973/status/1950000000000000049/video/1", "t.co/X0dqX8luUJ")
            ]
          },
          extended_entities: { media: [] }
        }
      })
    ])
  });
  const bmwVideoRequest = bmwVideo.sendRequest;
  bmwVideo.sendRequest = async (url, method, parameters, headers, fullResponse) => {
    if (String(url).includes("api.fxtwitter.com/Rainmaker1973/status/1950000000000000049")) {
      const payload = JSON.stringify({
        code: 200,
        tweet: {
          media: {
            videos: [
              {
                type: "video",
                url: "https://video.twimg.com/amplify_video/49/vid/avc1/674x1198/high.mp4",
                thumbnail_url: "https://pbs.twimg.com/amplify_video_thumb/49/img/thumb.jpg",
                width: 674,
                height: 1198,
                format: "video/mp4"
              }
            ]
          }
        }
      });
      return fullResponse
        ? JSON.stringify({ status: 200, headers: { "content-type": "application/json" }, body: payload })
        : payload;
    }
    if (graphqlAction(url) === "TweetDetail") {
      return JSON.stringify({ data: { threaded_conversation_with_injections_v2: { instructions: [] } } });
    }
    return bmwVideoRequest(url, method, parameters, headers, fullResponse);
  };
  vm.runInContext("load()", bmwVideo);
  await settle();
  assert.ifError(bmwVideo.error);
  assert.match(bodyWithoutConnectorStamp(bmwVideo.results[0].body), /^<p>Thieves broke the lock but couldn(?:'|&#39;)t take the BMW R1250GS\.<\/p><p><img src="data:image\/jpeg;base64,/);
  assert.doesNotMatch(bmwVideo.results[0].body, /t\.co\/X0dqX8luUJ/);

  const reutersVideo = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000050",
        username: "Reuters",
        name: "Reuters",
        fullText: "Liudmyla Polianychko walks through her shattered home outside Kyiv https://reut.rs/4zOs8v9 https://t.co/fxZNHuUTYx",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/article", "https://reut.rs/4zOs8v9", "reut.rs/4zOs8v9"),
              urlEntity("https://t.co/fxZNHuUTYx", "https://x.com/Reuters/status/1950000000000000050/video/1", "t.co/fxZNHuUTYx")
            ]
          },
          extended_entities: { media: [] }
        }
      })
    ])
  });
  const reutersVideoRequest = reutersVideo.sendRequest;
  reutersVideo.sendRequest = async (url, method, parameters, headers, fullResponse) => {
    if (String(url).includes("api.fxtwitter.com/Reuters/status/1950000000000000050")) {
      const payload = JSON.stringify({
        code: 200,
        tweet: {
          card: {
            url: "https://reut.rs/4zOs8v9",
            title: "Drone strike on ammunition depot ravages Kyiv suburb",
            description: "A Russian drone strike sparked blasts that killed 38 people.",
            domain: "www.reuters.com",
            image: {
              width: 800,
              height: 419,
              url: "https://pbs.twimg.com/card_img/50/reuters_video_card?format=jpg&name=800x419"
            }
          },
          media: {
            videos: [
              {
                type: "video",
                url: "https://video.twimg.com/amplify_video/50/vid/avc1/1920x1080/high.mp4",
                thumbnail_url: "https://pbs.twimg.com/amplify_video_thumb/50/img/thumb.jpg",
                width: 1920,
                height: 1080,
                format: "video/mp4"
              }
            ]
          }
        }
      });
      return fullResponse
        ? JSON.stringify({ status: 200, headers: { "content-type": "application/json" }, body: payload })
        : payload;
    }
    if (graphqlAction(url) === "TweetDetail") {
      return JSON.stringify({ data: { threaded_conversation_with_injections_v2: { instructions: [] } } });
    }
    return reutersVideoRequest(url, method, parameters, headers, fullResponse);
  };
  vm.runInContext("load()", reutersVideo);
  await settle();
  assert.ifError(reutersVideo.error);
  assert.strictEqual(reutersVideo.results[0].actions._mediaLookup, "fxtwitter");
  assert.strictEqual(reutersVideo.results[0].attachments[0].mimeType, "video/mp4");
  assert.match(reutersVideo.results[0].attachments[0].thumbnail, /^data:image\/jpeg;base64,/);
  assert.strictEqual(reutersVideo.results[0].attachments[1].kind, "link");
  assert.strictEqual(
    reutersVideo.results[0].attachments[1].title,
    "Drone strike on ammunition depot ravages Kyiv suburb"
  );
  assert.match(bodyWithoutConnectorStamp(reutersVideo.results[0].body), /^<p>Liudmyla Polianychko walks through her shattered home outside Kyiv <a href="https:\/\/reut\.rs\/4zOs8v9">https:\/\/reut\.rs\/4zOs8v9<\/a><\/p><p><img src="(?:data:image\/jpeg;base64,|https:\/\/pbs\.twimg\.com\/)/);
  assert.doesNotMatch(reutersVideo.results[0].body, /t\.co\/fxZNHuUTYx/);
  assert.match(reutersVideo.results[0].body, /href="https:\/\/reut\.rs\/4zOs8v9"/);
  assert.strictEqual(reutersVideo.results[0].actions._linkCardLookup, "fxtwitter");
  assert.deepStrictEqual(JSON.parse(reutersVideo.results[0].actions.openLink), {
    url: "https://reut.rs/4zOs8v9"
  });

  const roboticHandVideo = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000051",
        username: "Rainmaker1973",
        name: "Massimo",
        fullText: "A robotic hand beyond human speed, performing with top tier precision. https://t.co/gdjW8AGDNz",
        legacy: {
          entities: {
            urls: [
              urlEntity("https://t.co/gdjW8AGDNz", "https://x.com/Rainmaker1973/status/1950000000000000051/video/1", "t.co/gdjW8AGDNz")
            ]
          },
          extended_entities: { media: [] }
        }
      })
    ])
  });
  const roboticHandVideoRequest = roboticHandVideo.sendRequest;
  roboticHandVideo.sendRequest = async (url, method, parameters, headers, fullResponse) => {
    if (String(url).includes("api.fxtwitter.com/Rainmaker1973/status/1950000000000000051")) {
      const payload = JSON.stringify({
        code: 200,
        tweet: {
          media: {
            all: [],
            videos: [
              {
                type: "video",
                url: "https://video.twimg.com/amplify_video/51/vid/avc1/1080x1036/high.mp4",
                thumbnail_url: "https://pbs.twimg.com/amplify_video_thumb/51/img/thumb.jpg",
                width: 1080,
                height: 1036,
                format: "video/mp4"
              }
            ]
          }
        }
      });
      return fullResponse
        ? JSON.stringify({ status: 200, headers: { "content-type": "application/json" }, body: payload })
        : payload;
    }
    if (graphqlAction(url) === "TweetDetail") {
      return JSON.stringify({ data: { threaded_conversation_with_injections_v2: { instructions: [] } } });
    }
    return roboticHandVideoRequest(url, method, parameters, headers, fullResponse);
  };
  vm.runInContext("load()", roboticHandVideo);
  await settle();
  assert.ifError(roboticHandVideo.error);
  assert.strictEqual(roboticHandVideo.results[0].actions._mediaLookup, "fxtwitter");
  assert.match(roboticHandVideo.results[0].body, /<img src="(?:data:image\/jpeg;base64,|https:\/\/pbs\.twimg\.com\/)/);
  assert.doesNotMatch(roboticHandVideo.results[0].body, /t\.co\/gdjW8AGDNz/);

  const wallpaperLink = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000052",
        username: "wallpapermag",
        name: "Wallpaper*",
        fullText: "Newly joint managing partners tell us about change https://www.wallpaper.com/architecture/oma-evolution-netherlands",
        legacy: {
          entities: { urls: [] },
          extended_entities: { media: [] }
        }
      })
    ]),
    linkPreviews: {
      "https://www.wallpaper.com/architecture/oma-evolution-netherlands": `<html><head>
        <meta property="og:title" content="OMA evolution in the Netherlands" />
        <meta property="og:description" content="Marianne Anthonissen and David Gianotten on the studio's future." />
        <meta property="og:site_name" content="Wallpaper*" />
        <meta property="og:image" content="https://cdn.wallpaper.com/example.jpg" />
      </head></html>`
    }
  });
  vm.runInContext("load()", wallpaperLink);
  await settle();
  assert.ifError(wallpaperLink.error);
  assert.strictEqual(wallpaperLink.results[0].attachments[0].kind, "link");
  assert.strictEqual(wallpaperLink.results[0].attachments[0].title, "OMA evolution in the Netherlands");
  assert.strictEqual(
    wallpaperLink.results[0].attachments[0].url,
    "https://www.wallpaper.com/architecture/oma-evolution-netherlands"
  );
  assert.match(
    wallpaperLink.results[0].body,
    /href="https:\/\/www\.wallpaper\.com\/architecture\/oma-evolution-netherlands"/
  );

  const transcriptLink = makeContext({
    x_sources: "TheTranscript_",
    include_replies: "on",
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000053",
        username: "TheTranscript_",
        name: "The Transcript",
        fullText: "Enjoyed this?\n\nSubscribe to our weekly newsletter here:\n\nhttps://thetranscript.substack.com/subscribe",
        legacy: {
          entities: { urls: [] },
          extended_entities: { media: [] }
        }
      })
    ]),
    linkPreviews: {
      "https://thetranscript.substack.com/subscribe": `<html><head>
        <meta property="og:title" content="Subscribe | The Transcript" />
        <meta property="og:site_name" content="The Transcript" />
      </head></html>`
    }
  });
  vm.runInContext("load()", transcriptLink);
  await settle();
  assert.ifError(transcriptLink.error);
  assert.ok(transcriptLink.results && transcriptLink.results[0], "transcript link item missing");
  assert.match(
    transcriptLink.results[0].body,
    /href="https:\/\/thetranscript\.substack\.com\/subscribe"/
  );
  assert.strictEqual(transcriptLink.results[0].attachments[0].kind, "link");
  assert.strictEqual(
    transcriptLink.results[0].attachments[0].url,
    "https://thetranscript.substack.com/subscribe"
  );
  assert.deepStrictEqual(JSON.parse(transcriptLink.results[0].actions.openLink), {
    url: "https://thetranscript.substack.com/subscribe"
  });

  const encodedAmpersand = makeContext({
    timeline: timelineBody([
      tweetResult({
        id: "1950000000000000036",
        fullText: "Saudi Arabia &amp; Pakistan meet"
      })
    ])
  });
  vm.runInContext("load()", encodedAmpersand);
  await settle();
  assert.ifError(encodedAmpersand.error);
  assert.strictEqual(
    bodyWithoutConnectorStamp(encodedAmpersand.results[0].body),
    "<p>Saudi Arabia &amp; Pakistan meet</p>"
  );

  console.log("All X connector tests passed.");
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
