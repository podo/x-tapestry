// local.x.timeline
// Transaction-id generation is adapted from x-agent-sdk's MIT-licensed implementation.

const apiBase = "https://x.com/i/api/graphql";
const xHomeUrl = "https://x.com/";
const xIconUrl = "https://x.com/favicon.ico";
const defaultHomeLatestTimelineQueryId = "BKB7oi212Fi7kQtCBGE4zA";
const defaultSearchTimelineQueryId = "Bcw3RzK-PatNAmbnw54hFw";
const defaultUserByScreenNameQueryId = "2qvSHpkWTMS9i0zJAwDNiA";
const defaultUserTweetsQueryId = "hr4gzZONlq23okjU8fIe_A";
const defaultTweetDetailQueryId = "97JF30KziU00483E_8elBA";
const defaultBearerToken = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const browserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const accountSettingsUrl = "https://x.com/i/api/1.1/account/settings.json?include_mention_filter=true&include_nsfw_user_flag=true&include_nsfw_admin_flag=true&include_ranked_timeline=true&include_alt_text_compose=true";
const syncStateKey = "syncStateV11";
const transactionCacheKey = "transactionCacheV1";
const queryIdCacheKey = "queryIdCacheV1";
const linkPreviewCacheKey = "linkPreviewCacheV1";
const transactionCacheTtlMilliseconds = 15 * 60 * 1000;
const queryIdCacheTtlMilliseconds = 24 * 60 * 60 * 1000;
const linkPreviewCacheTtlMilliseconds = 7 * 24 * 60 * 60 * 1000;
const maximumLinkPreviewBytes = 256 * 1024;
const maximumLinkPreviewCacheEntries = 100;
const maximumIncrementalPages = 5;
const maximumQueryIdScripts = 40;
const transactionKeyword = "obfiowerehiring";
const transactionEpochOffsetMilliseconds = 1682924400 * 1000;

const readFeatures = {
  rweb_video_screen_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  responsive_web_grok_show_grok_translated_post: true,
  responsive_web_grok_analysis_button_from_backend: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_enhance_cards_enabled: false
};

const userByScreenNameFeatures = {
  hidden_profile_subscriptions_enabled: true,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: true,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true
};

const userTimelineFieldToggles = {
  withArticlePlainText: false
};

function verify() {
  verifyAsync().then(processVerification).catch(processError);
}

function load() {
  loadAsync().then(processResults).catch(processError);
}

function performAction(actionId, actionValue, item) {
  performActionAsync(actionId, actionValue, item)
    .then(result => actionComplete(result, null))
    .catch(error => actionComplete(null, error));
}

async function performActionAsync(actionId, actionValue, item) {
  if (actionId !== "thread") {
    throw new Error(`Unsupported X action: ${actionId}`);
  }

  const value = parseActionValue(actionValue);
  const tweetId = value.tweetId || tweetIdFromUrl(value.url) || tweetIdFromUrl(item && item.uri);
  if (!tweetId) throw new Error("Could not determine the X post ID for this thread.");

  const credentials = normalizedCredentials();
  return tweetDetailItems(tweetId, credentials);
}

async function verifyAsync() {
  const credentials = normalizedCredentials();
  const result = {
    displayName: `X - ${sourceLabel()}`,
    icon: xIconUrl
  };

  const mode = normalizedSourceMode();
  if (mode === "following") {
    await homeLatestTimelinePage(1, null, credentials);
  }
  else if (mode === "handles") {
    const handles = normalizedHandles();
    if (handles.length === 0) throw new Error("Enter one or more valid X handles.");

    const profiles = [];
    for (const handle of handles) {
      profiles.push(await userProfileByHandle(handle, credentials));
    }

    if (profiles.length > 0) {
      await userTweetsPage(profiles[0].id, 1, null, credentials);
    }

    if (profiles.length === 1) {
      result.displayName = `X - @${profiles[0].username || handles[0]}`;
      if (profiles[0].avatar) result.icon = profiles[0].avatar;
    }
  }
  else {
    const query = buildSearchQuery();
    await searchTimelinePage(query, 1, null, credentials);
  }

  const accountIdentity = await currentAccountIdentity(credentials);
  if (accountIdentity) {
    result.accountIdentity = accountIdentity;
  }

  return result;
}

async function loadAsync() {
  const credentials = normalizedCredentials();
  const mode = normalizedSourceMode();
  if (mode === "following") {
    return loadFollowingTimeline(credentials);
  }
  if (mode === "handles") {
    return loadHandleTimelines(credentials);
  }
  return loadSearchTimeline(credentials);
}

async function loadFollowingTimeline(credentials) {
  const signature = currentSyncSignature("following");
  const syncState = syncStateForSignature(signature);
  const syncKey = "following";
  const highWaterId = syncHighWater(syncState, syncKey);

  const limit = normalizedBatchSize();
  const tweets = [];
  const fetchedIds = [];
  let cursor = null;
  let pageCount = 0;
  let reachedKnownItem = false;

  do {
    const page = await homeLatestTimelinePage(limit, cursor, credentials);
    for (const tweet of page.items) {
      if (!tweet || !tweet.id) continue;
      fetchedIds.push(tweet.id);
      if (!shouldIncludeTweet(tweet)) continue;

      if (highWaterId && compareIds(tweet.id, highWaterId) <= 0) {
        reachedKnownItem = true;
        continue;
      }

      tweets.push(tweet);
    }

    cursor = page.nextCursor;
    pageCount += 1;
  } while (highWaterId && cursor && !reachedKnownItem && pageCount < maximumIncrementalPages);

  const newestId = maxId(fetchedIds);
  if (newestId && (!highWaterId || compareIds(newestId, highWaterId) > 0)) {
    setSyncHighWater(syncState, syncKey, newestId);
  }

  writeSyncState(syncState);
  return tweetsToItems(tweets);
}

async function loadSearchTimeline(credentials) {
  const query = buildSearchQuery();
  const signature = currentSyncSignature(query);
  const syncState = syncStateForSignature(signature);
  const syncKey = "search";
  const highWaterId = syncHighWater(syncState, syncKey);

  const limit = normalizedBatchSize();
  const tweets = [];
  const fetchedIds = [];
  let cursor = null;
  let pageCount = 0;
  let reachedKnownItem = false;

  do {
    const page = await searchTimelinePage(query, limit, cursor, credentials);
    for (const tweet of page.items) {
      if (!tweet || !tweet.id) continue;
      fetchedIds.push(tweet.id);
      if (!shouldIncludeTweet(tweet)) continue;

      if (highWaterId && compareIds(tweet.id, highWaterId) <= 0) {
        reachedKnownItem = true;
        continue;
      }

      tweets.push(tweet);
    }

    cursor = page.nextCursor;
    pageCount += 1;
  } while (highWaterId && cursor && !reachedKnownItem && pageCount < maximumIncrementalPages);

  const newestId = maxId(fetchedIds);
  if (newestId && (!highWaterId || compareIds(newestId, highWaterId) > 0)) {
    setSyncHighWater(syncState, syncKey, newestId);
  }

  writeSyncState(syncState);
  return tweetsToItems(tweets);
}

async function loadHandleTimelines(credentials) {
  const handles = normalizedHandles();
  if (handles.length === 0) throw new Error("Enter one or more valid X handles.");

  const signature = currentSyncSignature(handles.join(","));
  const syncState = syncStateForSignature(signature);
  const limit = normalizedBatchSize();
  const tweets = [];

  for (const handle of handles) {
    const profile = await userProfileByHandle(handle, credentials);
    const syncKey = `handle:${profile.username || handle}`;
    const highWaterId = syncHighWater(syncState, syncKey);
    const fetchedIds = [];
    let cursor = null;
    let pageCount = 0;
    let reachedKnownItem = false;

    do {
      const page = await userTweetsPage(profile.id, limit, cursor, credentials);
      for (const tweet of page.items) {
        if (!tweet || !tweet.id) continue;
        fetchedIds.push(tweet.id);
        if (!shouldIncludeTweet(tweet)) continue;

        if (highWaterId && compareIds(tweet.id, highWaterId) <= 0) {
          reachedKnownItem = true;
          continue;
        }

        tweets.push(tweet);
      }

      cursor = page.nextCursor;
      pageCount += 1;
    } while (highWaterId && cursor && !reachedKnownItem && pageCount < maximumIncrementalPages);

    const newestId = maxId(fetchedIds);
    if (newestId && (!highWaterId || compareIds(newestId, highWaterId) > 0)) {
      setSyncHighWater(syncState, syncKey, newestId);
    }
  }

  writeSyncState(syncState);
  return tweetsToItems(tweets);
}

async function tweetsToItems(tweets) {
  const normalized = sortTweetsNewestFirst(dedupeTweets(tweets));
  const items = [];
  for (const tweet of normalized) {
    await enrichTweetLinkCard(tweet);
    items.push(tweetToItem(tweet));
  }
  return items;
}

async function enrichTweetLinkCard(tweet) {
  if (!tweet) return;
  if (tweet.quoted) await enrichTweetLinkCard(tweet.quoted);
  if (!fetchLinkPreviews()) return;

  const card = linkCardForTweet(tweet);
  if (!card || !cardNeedsPreview(card)) return;

  const preview = await linkPreviewForUrl(card.url);
  if (!preview) return;

  const current = tweet.card || {};
  tweet.card = {
    url: current.url || card.url,
    type: current.type || preview.type || card.type || "website",
    title: current.title || preview.title || card.title || "",
    subtitle: current.subtitle || preview.subtitle || card.subtitle || "",
    siteName: current.siteName || preview.siteName || card.siteName || urlHost(card.url) || "",
    authorName: current.authorName || preview.authorName || card.authorName || "",
    image: current.image || preview.image || card.image || null,
    aspectSize: current.aspectSize || preview.aspectSize || card.aspectSize || null,
    hiddenUrls: dedupeStrings((current.hiddenUrls || card.hiddenUrls || [card.url]).concat(preview.hiddenUrls || []))
  };
}

function cardNeedsPreview(card) {
  return Boolean(
    card
    && isExternalWebUrl(card.url)
    && (!card.title || !card.subtitle || !card.image || !card.siteName)
  );
}

async function searchTimelinePage(query, count, cursor, credentials) {
  const variables = {
    rawQuery: query,
    count,
    querySource: "typed_query",
    product: normalizedSearchProduct()
  };
  if (cursor) variables.cursor = cursor;

  const data = await graphqlGet(
    "SearchTimeline",
    normalizedSearchQueryId(),
    variables,
    readFeatures,
    null,
    credentials
  );

  const instructions = searchTimelineInstructions(data);
  return {
    items: extractTweetsFromInstructions(instructions),
    nextCursor: bottomCursor(instructions)
  };
}

async function homeLatestTimelinePage(count, cursor, credentials) {
  const variables = {
    count,
    includePromotedContent: false,
    latestControlAvailable: true,
    requestContext: "launch",
    withCommunity: true,
    enableRanking: false,
    seenTweetIds: []
  };
  if (cursor) variables.cursor = cursor;

  const data = await graphqlPost(
    "HomeLatestTimeline",
    normalizedHomeLatestTimelineQueryId(),
    variables,
    readFeatures,
    userTimelineFieldToggles,
    credentials
  );

  const instructions = homeTimelineInstructions(data);
  return {
    items: extractTweetsFromInstructions(instructions),
    nextCursor: bottomCursor(instructions)
  };
}

async function userProfileByHandle(handle, credentials) {
  const data = await graphqlGet(
    "UserByScreenName",
    normalizedUserByScreenNameQueryId(),
    {
      screen_name: handle,
      withSafetyModeUserFields: true
    },
    userByScreenNameFeatures,
    null,
    credentials
  );
  return userProfileFromGraphql(data, handle);
}

async function userTweetsPage(userId, count, cursor, credentials) {
  const variables = {
    userId: String(userId),
    count,
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true
  };
  if (cursor) variables.cursor = cursor;

  const data = await graphqlGet(
    "UserTweets",
    normalizedUserTweetsQueryId(),
    variables,
    readFeatures,
    userTimelineFieldToggles,
    credentials
  );

  const instructions = userTimelineInstructions(data);
  return {
    items: extractTweetsFromInstructions(instructions),
    nextCursor: bottomCursor(instructions)
  };
}

async function currentAccountIdentity(credentials) {
  try {
    const text = await requestText(accountSettingsUrl, "GET", null, restHeaders(credentials), "AccountSettings");
    const settings = JSON.parse(text);
    const handle = sanitizeHandle(settings.screen_name || settings.screenName || settings.username);
    if (!handle) return null;

    let profile = null;
    try {
      profile = await userProfileByHandle(handle, credentials);
    }
    catch (error) {
      profile = null;
    }

    const name = profile && profile.name ? profile.name : (settings.name || handle);
    const avatar = profile && profile.avatar
      ? profile.avatar
      : normalizedAvatar(settings.profile_image_url_https || settings.profile_image_url);
    return createIdentity(name, `@${handle}`, avatar, `https://x.com/${handle}`);
  }
  catch (error) {
    console.log(`Unable to load X account identity: ${error.message || error}`);
    return null;
  }
}

async function tweetDetailItems(tweetId, credentials) {
  const data = await graphqlGet(
    "TweetDetail",
    normalizedTweetDetailQueryId(),
    {
      focalTweetId: String(tweetId),
      referrer: "tweet",
      with_rux_injections: false,
      includePromotedContent: false,
      withCommunity: true,
      withQuickPromoteEligibilityTweetFields: true,
      withBirdwatchNotes: true,
      withVoice: true,
      rankingMode: "Relevance"
    },
    readFeatures,
    userTimelineFieldToggles,
    credentials
  );

  const tweets = dedupeTweets(extractTweetsFromInstructions(tweetDetailInstructions(data)));
  const items = await tweetsToItems(tweets);
  if (items.length > 0) return items;
  throw new Error("X did not return a conversation for this post.");
}

function userProfileFromGraphql(data, requestedHandle) {
  const rawUser = data && data.data && data.data.user && data.data.user.result;
  const profile = normalizeUserProfile(rawUser);
  if (!profile.id) {
    throw new Error(`Could not resolve @${requestedHandle}. Check the handle or refresh the UserByScreenName query ID.`);
  }
  return profile;
}

function restHeaders(credentials) {
  return {
    "Authorization": `Bearer ${normalizedBearerToken()}`,
    "x-csrf-token": credentials.ct0,
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    "User-Agent": browserUserAgent,
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://x.com/settings/account",
    "Cookie": credentials.cookie
  };
}

async function graphqlGet(action, queryId, variables, features, fieldToggles, credentials) {
  const parameters = [
    ["variables", JSON.stringify(variables)]
  ];
  if (features) parameters.push(["features", JSON.stringify(features)]);
  if (fieldToggles) parameters.push(["fieldToggles", JSON.stringify(fieldToggles)]);

  let lastError = null;
  let activeQueryId = queryId;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const path = `/i/api/graphql/${activeQueryId}/${action}`;
    const url = `${apiBase}/${activeQueryId}/${action}?${encodeQuery(parameters)}`;
    const headers = await graphQlHeaders("GET", path, credentials);
    let text;
    try {
      text = await requestText(url, "GET", null, headers, action);
      return parseGraphqlResponse(text, action);
    }
    catch (error) {
      lastError = error;
      if (attempt === 0 && isTransactionRetryableError(error)) {
        clearTransactionCache();
        continue;
      }
      if (attempt < 2 && isQueryIdRetryableError(error)) {
        const discovered = await discoverQueryId(action, credentials, activeQueryId);
        if (discovered && discovered !== activeQueryId) {
          activeQueryId = discovered;
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError || new Error(`${action} failed.`);
}

async function graphqlPost(action, queryId, variables, features, fieldToggles, credentials) {
  let lastError = null;
  let activeQueryId = queryId;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const path = `/i/api/graphql/${activeQueryId}/${action}`;
    const url = `${apiBase}/${activeQueryId}/${action}`;
    const headers = await graphQlHeaders("POST", path, credentials);
    const body = {
      variables,
      queryId: activeQueryId
    };
    if (features) body.features = features;
    if (fieldToggles) body.fieldToggles = fieldToggles;
    headers["Content-Type"] = "application/json";
    let text;
    try {
      text = await requestText(url, "POST", JSON.stringify(body), headers, action);
      return parseGraphqlResponse(text, action);
    }
    catch (error) {
      lastError = error;
      if (attempt === 0 && isTransactionRetryableError(error)) {
        clearTransactionCache();
        continue;
      }
      if (attempt < 2 && isQueryIdRetryableError(error)) {
        const discovered = await discoverQueryId(action, credentials, activeQueryId);
        if (discovered && discovered !== activeQueryId) {
          activeQueryId = discovered;
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError || new Error(`${action} failed.`);
}

async function graphQlHeaders(method, path, credentials) {
  const headers = {
    "Authorization": `Bearer ${normalizedBearerToken()}`,
    "x-csrf-token": credentials.ct0,
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    "User-Agent": browserUserAgent,
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "Origin": "https://x.com",
    "Referer": "https://x.com/home",
    "Cookie": credentials.cookie
  };

  if (useTransactionHeader()) {
    headers["x-client-transaction-id"] = await transactionId(method, path, credentials);
  }

  return headers;
}

async function requestText(url, method, body, headers, action) {
  let text;
  try {
    text = await sendRequest(url, method, body, headers, true);
  }
  catch (error) {
    throw normalizedRequestError(error, action);
  }

  const wrapped = statusWrappedResponse(text);
  if (wrapped) {
    if (wrapped.status >= 400) throw statusError(wrapped.status, wrapped.body, wrapped.headers, action);
    return typeof wrapped.body === "string" ? wrapped.body : JSON.stringify(wrapped.body);
  }

  return text;
}

function statusWrappedResponse(text) {
  if (typeof text !== "string") return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.status === "number" && Object.prototype.hasOwnProperty.call(parsed, "body")) {
      return parsed;
    }
  }
  catch (error) {
    return null;
  }
  return null;
}

function statusError(status, body, headers, action) {
  let message = action === "LinkPreview"
    ? `Link preview returned HTTP ${status}.`
    : `X returned HTTP ${status}.`;
  if (status === 400 && action !== "LinkPreview") {
    message = `X rejected the ${action || "GraphQL"} request. The query ID may have rotated; update the advanced ${action || "GraphQL"} query ID.`;
  }
  else if ((status === 401 || status === 403) && action !== "LinkPreview") {
    message = "X rejected the session cookies. Refresh auth_token and ct0 from a logged-in x.com session.";
  }
  else if (status === 429) {
    const retryAfter = headerValue(headers, "retry-after");
    const reset = headerValue(headers, "x-rate-limit-reset");
    const source = action === "LinkPreview" ? "Link preview" : "X";
    message = retryAfter
      ? `${source} rate limit reached. Try again in ${retryAfter} seconds.`
      : reset
        ? `${source} rate limit reached. Try again after ${new Date(Number(reset) * 1000).toISOString()}.`
        : `${source} rate limit reached. Try again later.`;
  }

  const detail = firstGraphqlErrorMessage(body);
  if (detail && status !== 401 && status !== 403) message += ` ${detail}`;

  const error = new Error(message);
  error.xStatus = status;
  return error;
}

function normalizedRequestError(error, action) {
  const message = error && error.message ? error.message : String(error);
  if (/\b(401|403)\b/.test(message)) return statusError(401, null, null, action);
  if (/\b429\b/.test(message)) return statusError(429, null, null, action);
  if (/\b400\b/.test(message)) return statusError(400, null, null, action);
  return error instanceof Error ? error : new Error(message);
}

function parseGraphqlResponse(text, action) {
  const json = JSON.parse(text);
  const errors = Array.isArray(json && json.errors) ? json.errors : [];
  if (errors.length > 0) {
    const first = errors[0] || {};
    let message = first.message || `X ${action} returned an error.`;
    if (first.code === 344) {
      message = "X rejected the request as automated. The transaction header may be stale; try again later.";
    }
    else if (first.code === 429) {
      message = "X rate limit reached. Try again later.";
    }
    else if (/must be defined|validation|query/i.test(message)) {
      message = `${message} The ${action} query ID may have rotated.`;
    }

    const error = new Error(message);
    error.xGraphqlCode = first.code;
    error.xGraphqlErrors = errors;
    throw error;
  }

  if (!json || !json.data) {
    throw new Error(`X ${action} returned an unexpected response.`);
  }

  return json;
}

function isTransactionRetryableError(error) {
  return error && error.xGraphqlCode === 344;
}

function isQueryIdRetryableError(error) {
  const message = error && error.message ? error.message : "";
  return Boolean(error && error.xStatus === 400)
    || /query ID|query id|must be defined|validation|PersistedQuery|operation/i.test(message);
}

function firstGraphqlErrorMessage(body) {
  let parsed = body;
  if (typeof body === "string") {
    try {
      parsed = JSON.parse(body);
    }
    catch (error) {
      return null;
    }
  }
  const errors = parsed && Array.isArray(parsed.errors) ? parsed.errors : [];
  if (errors.length === 0) return null;
  return errors[0] && errors[0].message ? String(errors[0].message) : null;
}

function headerValue(headers, name) {
  if (!headers || typeof headers !== "object") return null;
  const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key]) : null;
}

function searchTimelineInstructions(data) {
  const root = data
    && data.data
    && data.data.search_by_raw_query
    && data.data.search_by_raw_query.search_timeline
    && data.data.search_by_raw_query.search_timeline.timeline;
  return root && Array.isArray(root.instructions) ? root.instructions : [];
}

function homeTimelineInstructions(data) {
  const home = data && data.data && data.data.home;
  const root = home
    && (
      home.home_timeline_urt
      || (home.timeline && home.timeline.timeline)
      || home.timeline
    );
  return root && Array.isArray(root.instructions) ? root.instructions : [];
}

function userTimelineInstructions(data) {
  const user = data && data.data && data.data.user && data.data.user.result;
  const root = user
    && (
      (user.timeline_v2 && user.timeline_v2.timeline)
      || (user.timeline && user.timeline.timeline)
      || user.timeline
    );
  if (root && Array.isArray(root.instructions)) return root.instructions;
  return searchTimelineInstructions(data);
}

function tweetDetailInstructions(data) {
  const root = data
    && data.data
    && data.data.threaded_conversation_with_injections_v2;
  return root && Array.isArray(root.instructions) ? root.instructions : [];
}

function extractTweetsFromInstructions(instructions) {
  const tweets = [];
  for (const instruction of instructions || []) {
    const entries = [];
    if (Array.isArray(instruction.entries)) entries.push(...instruction.entries);
    if (instruction.entry) entries.push(instruction.entry);

    for (const entry of entries) {
      collectTweetFromEntry(entry, tweets);
    }
  }
  return dedupeTweets(tweets);
}

function collectTweetFromEntry(entry, tweets) {
  if (!entry || !entry.content) return;
  if (isPromotedEntry(entry)) return;
  collectTweetFromItemContent(entry.content.itemContent, tweets);

  const items = Array.isArray(entry.content.items) ? entry.content.items : [];
  for (const item of items) {
    if (isPromotedEntry(item && item.item)) continue;
    collectTweetFromItemContent(item && item.item && item.item.itemContent, tweets);
  }
}

function isPromotedEntry(entry) {
  const content = entry && entry.content ? entry.content : {};
  const itemContent = content.itemContent || {};
  return Boolean(
    String(entry && entry.entryId || "").indexOf("promoted") >= 0
    || content.promotedMetadata
    || itemContent.promotedMetadata
    || itemContent.promoted_metadata
  );
}

function collectTweetFromItemContent(itemContent, tweets) {
  const wrapper = itemContent && (itemContent.tweet_results || itemContent.tweetResult);
  const result = wrapper && (wrapper.result || wrapper);
  const tweet = normalizeTweet(result, true);
  if (tweet) tweets.push(tweet);
}

function normalizeTweet(rawResult, includeQuoted) {
  const result = unwrapTweetResult(rawResult);
  const legacy = result && result.legacy ? result.legacy : null;
  const details = result && result.details ? result.details : null;
  if (!result || (!legacy && !details)) return null;

  const id = (legacy && legacy.id_str)
    || (details && (details.id_str || details.id))
    || result.rest_id;
  if (!id) return null;

  const userResult = result.core && (result.core.user_results || result.core.user_result);
  const user = normalizeUser(userResult && (userResult.result || userResult));
  const date = tweetDate(
    (legacy && legacy.created_at)
    || (details && (details.created_at || details.created_at_ms))
  );

  const retweetedRaw = legacy && legacy.retweeted_status_result && legacy.retweeted_status_result.result;
  if (retweetedRaw) {
    const retweeted = normalizeTweet(retweetedRaw, includeQuoted);
    if (!retweeted) return null;
    retweeted.date = date;
    retweeted.isRetweet = true;
    retweeted.repostedByName = user.name || user.username || "X";
    retweeted.repostedByUsername = user.username || null;
    retweeted.repostedByAvatar = user.avatar || null;
    return retweeted;
  }

  const note = result.note_tweet
    && result.note_tweet.note_tweet_results
    && result.note_tweet.note_tweet_results.result;
  const entities = legacy && legacy.entities;
  const extraEntities = [
    result.entities,
    result.url_entities && { urls: result.url_entities },
    details && details.url_entities && { urls: details.url_entities },
    details && details.urls && { urls: details.urls },
    details && details.entities,
    details && details.entity_set
  ].filter(Boolean);
  const urlMappings = tweetUrlMappings(entities, note, extraEntities);
  const fullText = (legacy && legacy.full_text)
    || (details && (details.full_text || details.text))
    || result.text
    || "";
  const text = expandedTweetText(fullText, entities, note, urlMappings);
  const media = extractMedia(result, legacy);
  const externalUrls = dedupeStrings(extractExternalUrls(urlMappings));
  const card = extractCard(result, externalUrls, urlMappings);
  const poll = extractPoll(result);
  const quotedRaw = result.quoted_status_result && result.quoted_status_result.result;
  const quoted = includeQuoted && quotedRaw ? normalizeTweet(quotedRaw, false) : null;
  const counts = result.counts || result.metrics || {};
  const replyStatusId = (legacy && legacy.in_reply_to_status_id_str)
    || (details && details.in_reply_to_status_id_str);
  const replyUsername = (legacy && legacy.in_reply_to_screen_name)
    || (details && details.in_reply_to_screen_name);

  return {
    id,
    text,
    date,
    url: user.username ? `https://x.com/${user.username}/status/${id}` : `https://x.com/i/web/status/${id}`,
    authorName: user.name || user.username || "X",
    authorUsername: user.username || null,
    authorAvatar: user.avatar || null,
    likes: finiteNumber(firstDefined(legacy && legacy.favorite_count, counts.favorite_count, counts.like_count)),
    reposts: finiteNumber(firstDefined(legacy && legacy.retweet_count, counts.retweet_count, counts.repost_count)),
    replies: finiteNumber(firstDefined(legacy && legacy.reply_count, counts.reply_count)),
    quotes: finiteNumber(firstDefined(legacy && legacy.quote_count, counts.quote_count)),
    views: finiteNumber(firstDefined(result.views && result.views.count, counts.view_count, counts.views_count)),
    media,
    hiddenUrls: mediaHiddenUrls(media, urlMappings),
    externalUrls,
    card,
    poll,
    isReply: Boolean(replyStatusId || (legacy && legacy.in_reply_to_user_id_str)),
    replyToUsername: replyUsername || null,
    isRetweet: /^RT @/.test(fullText),
    repostedByName: null,
    repostedByUsername: null,
    repostedByAvatar: null,
    contentWarning: (legacy && legacy.possibly_sensitive) ? "Sensitive content" : null,
    quoted
  };
}

function unwrapTweetResult(result) {
  if (!result || typeof result !== "object") return null;
  if (result.tweet && (result.tweet.legacy || result.tweet.details)) return result.tweet;
  if (result.result && (result.result.legacy || result.result.details)) return result.result;
  return result;
}

function normalizeUser(rawUser) {
  const profile = normalizeUserProfile(rawUser);
  return {
    username: profile.username,
    name: profile.name,
    avatar: profile.avatar
  };
}

function normalizeUserProfile(rawUser) {
  const user = rawUser && rawUser.result ? rawUser.result : rawUser;
  const core = user && user.core ? user.core : {};
  const legacy = user && user.legacy ? user.legacy : {};
  const username = core.screen_name || legacy.screen_name || null;
  const name = core.name || legacy.name || username;
  const avatar = normalizedAvatar(userAvatarUrl(user, core, legacy));
  const id = (user && user.rest_id)
    || (user && user.id_str)
    || core.id_str
    || legacy.id_str
    || null;
  return {
    id: id ? String(id) : null,
    username,
    name,
    avatar,
    url: username ? `https://x.com/${username}` : null,
    protected: Boolean(legacy.protected)
  };
}

function userAvatarUrl(user, core, legacy) {
  const avatar = user && user.avatar ? user.avatar : {};
  return avatar.image_url
    || avatar.image_url_https
    || avatar.imageUrl
    || avatar.url
    || core.profile_image_url
    || core.profile_image_url_https
    || legacy.profile_image_url_https
    || legacy.profile_image_url;
}

function expandedTweetText(fullText, legacyEntities, note, mappings) {
  let text = note && note.text ? note.text : fullText;
  const replacements = mappings || tweetUrlMappings(legacyEntities, note);
  replacements.sort((left, right) => right.source.length - left.source.length);

  for (const mapping of replacements) {
    if (!mapping.source || !mapping.expanded) continue;
    text = text.split(mapping.source).join(mapping.expanded);
  }

  return text || "";
}

function tweetUrlMappings(legacyEntities, note, extraEntities) {
  const mappings = [];
  mappings.push(...urlMappingsFromContainer(legacyEntities));
  mappings.push(...urlMappingsFromContainer(note));
  mappings.push(...urlMappingsFromContainer(extraEntities));
  return dedupeBy(mappings, mapping => `${mapping.source}|${mapping.expanded}|${mapping.display}`);
}

function urlMappings(urls) {
  if (!Array.isArray(urls) && urls && typeof urls === "object") {
    urls = Object.keys(urls).map(key => urls[key]);
  }
  if (!Array.isArray(urls)) return [];
  return urls.map(url => ({
    source: url && url.url ? String(url.url) : "",
    expanded: url && (url.unwound_url || url.expanded_url || url.url)
      ? String(url.unwound_url || url.expanded_url || url.url)
      : "",
    display: url && url.display_url ? String(url.display_url) : ""
  })).filter(mapping => mapping.source && mapping.expanded);
}

function urlMappingsFromContainer(container) {
  if (!container) return [];
  if (Array.isArray(container)) {
    return container.flatMap(urlMappingsFromContainer);
  }
  if (typeof container !== "object") return [];

  const mappings = [];
  mappings.push(...urlMappings(container.urls || container.url_entities));
  for (const nested of [container.entities, container.entity_set, container.data, container.result]) {
    if (nested) mappings.push(...urlMappingsFromContainer(nested));
  }
  return mappings;
}

function extractExternalUrls(mappings) {
  const urls = [];
  for (const mapping of mappings || []) {
    if (isExternalWebUrl(mapping.expanded)) urls.push(mapping.expanded);
  }
  return urls;
}

function extractMedia(result, legacy) {
  const media = [];
  const extended = mediaEntityEntries(legacy && legacy.extended_entities && legacy.extended_entities.media);
  const direct = mediaEntityEntries(legacy && legacy.entities && legacy.entities.media);
  const note = result && result.note_tweet
    && result.note_tweet.note_tweet_results
    && result.note_tweet.note_tweet_results.result;
  const noteMedia = mediaEntityEntries(note && note.entity_set && note.entity_set.media);
  const modern = mediaEntityEntries(result && result.media_entities);
  const entries = extended.concat(direct, noteMedia, modern);

  for (const entry of entries) {
    const item = mediaFromEntity(entry);
    if (item) media.push(item);
  }

  return dedupeBy(media, item => item.url);
}

function mediaEntityEntries(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "object") {
    return Object.keys(value).map(key => value[key]).filter(Boolean);
  }
  return [];
}

function mediaFromEntity(entry) {
  if (!entry || typeof entry !== "object") return null;
  const modern = mediaFromModernEntity(entry);
  if (modern) return modern;

  let url = null;
  let type = entry.type || "photo";
  let thumbnail = null;

  if (type === "photo") {
    url = normalizedPhotoUrl(entry.media_url_https || entry.media_url);
  }
  else if ((type === "video" || type === "animated_gif") && entry.video_info) {
    thumbnail = normalizedPhotoUrl(entry.media_url_https || entry.media_url);
    const variants = Array.isArray(entry.video_info.variants) ? entry.video_info.variants : [];
    const mp4s = variants
      .filter(variant => variant && variant.url && /video\/mp4/i.test(variant.content_type || ""))
      .sort((left, right) => finiteNumber(right.bitrate) - finiteNumber(left.bitrate));
    if (mp4s.length > 0) url = mp4s[0].url;
  }

  if (!isWebUrl(url)) return null;

  const dimensions = mediaDimensions(entry);
  return {
    url,
    type,
    thumbnail,
    mimeType: mediaMimeType(type, url),
    width: dimensions.width,
    height: dimensions.height,
    altText: entry.ext_alt_text || entry.alt_text || null,
    hiddenUrls: mediaEntityHiddenUrls(entry)
  };
}

function mediaFromModernEntity(entry) {
  const info = modernMediaInfo(entry);
  if (!info) return null;

  const typeName = String(info.__typename || info.type || "").toLowerCase();
  const isImage = typeName.indexOf("image") >= 0;
  const isVideo = typeName.indexOf("video") >= 0;
  const isGif = typeName.indexOf("gif") >= 0;
  const type = isVideo ? "video" : isGif ? "animated_gif" : "photo";
  let url = null;
  let thumbnail = null;

  if (isImage || (!isVideo && !isGif)) {
    url = normalizedPhotoUrl(
      info.original_img_url
      || info.original_image_url
      || info.image_url
      || info.media_url_https
      || info.media_url
      || info.url
      || (info.preview_image && (info.preview_image.original_img_url || info.preview_image.url))
    );
  }
  else {
    thumbnail = normalizedPhotoUrl(
      (info.preview_image && (info.preview_image.original_img_url || info.preview_image.url))
      || info.media_url_https
      || info.media_url
    );
    const videoInfo = info.video_info || {};
    const variants = Array.isArray(info.variants)
      ? info.variants
      : Array.isArray(videoInfo.variants) ? videoInfo.variants : [];
    const mp4s = variants
      .filter(variant => variant && variant.url && /video\/mp4/i.test(variant.content_type || variant.type || ""))
      .sort((left, right) => finiteNumber(right.bit_rate || right.bitrate) - finiteNumber(left.bit_rate || left.bitrate));
    if (mp4s.length > 0) url = mp4s[0].url;
  }

  if (!isWebUrl(url)) return null;

  const dimensions = modernMediaDimensions(info);
  return {
    url,
    type,
    thumbnail,
    mimeType: mediaMimeType(type, url),
    width: dimensions.width,
    height: dimensions.height,
    altText: info.alt_text || info.ext_alt_text || entry.ext_alt_text || entry.alt_text || null,
    hiddenUrls: mediaEntityHiddenUrls(entry)
  };
}

function modernMediaInfo(entry) {
  const result = entry
    && entry.media_results
    && entry.media_results.result;
  return (result && result.media_info)
    || (entry && entry.media_info)
    || null;
}

function modernMediaDimensions(info) {
  const original = info && info.original_info ? info.original_info : {};
  let width = finiteNumber(info && (info.original_img_width || info.original_width || info.width || original.width));
  let height = finiteNumber(info && (info.original_img_height || info.original_height || info.height || original.height));

  const preview = info && info.preview_image ? info.preview_image : {};
  if (!width || !height) {
    width = finiteNumber(preview.original_img_width || preview.width);
    height = finiteNumber(preview.original_img_height || preview.height);
  }

  if ((!width || !height) && info && Array.isArray(info.aspect_ratio)) {
    width = finiteNumber(info.aspect_ratio[0]);
    height = finiteNumber(info.aspect_ratio[1]);
  }

  const videoInfo = info && info.video_info ? info.video_info : {};
  if ((!width || !height) && Array.isArray(videoInfo.aspect_ratio)) {
    width = finiteNumber(videoInfo.aspect_ratio[0]);
    height = finiteNumber(videoInfo.aspect_ratio[1]);
  }

  return { width, height };
}

function mediaEntityHiddenUrls(entry) {
  const info = modernMediaInfo(entry);
  return dedupeStrings([
    entry && entry.url,
    entry && entry.expanded_url,
    entry && entry.display_url,
    info && info.url,
    info && info.expanded_url,
    info && info.display_url
  ].filter(Boolean).map(String));
}

function mediaHiddenUrls(media, mappings) {
  const urls = [];
  for (const item of media || []) {
    if (Array.isArray(item.hiddenUrls)) urls.push(...item.hiddenUrls);
  }
  for (const mapping of mappings || []) {
    if (!mapping || !mapping.source) continue;
    // Modern X media may expose the media URL only through the tweet entity.
    if (!isExternalWebUrl(mapping.expanded)) {
      urls.push(mapping.source, mapping.expanded, mapping.display);
    }
  }
  return dedupeStrings(urls);
}

function mediaDimensions(entry) {
  const original = entry && entry.original_info ? entry.original_info : {};
  let width = finiteNumber(original.width);
  let height = finiteNumber(original.height);

  if ((!width || !height) && entry && entry.sizes) {
    const large = entry.sizes.large || entry.sizes.medium || entry.sizes.small || {};
    width = finiteNumber(large.w || large.width);
    height = finiteNumber(large.h || large.height);
  }

  if ((!width || !height) && entry && entry.video_info && Array.isArray(entry.video_info.aspect_ratio)) {
    width = finiteNumber(entry.video_info.aspect_ratio[0]);
    height = finiteNumber(entry.video_info.aspect_ratio[1]);
  }

  return { width, height };
}

function mediaMimeType(type, url) {
  if (type === "video" || type === "animated_gif") return "video/mp4";
  const format = mediaFormat(url);
  if (format === "jpg") return "image/jpeg";
  if (format === "png" || format === "gif" || format === "webp") return `image/${format}`;
  return "image";
}

function mediaFormat(value) {
  try {
    const url = new URL(value);
    const queryFormat = url.searchParams.get("format");
    if (queryFormat) return queryFormat.toLowerCase();
    const match = url.pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase().replace("jpeg", "jpg") : null;
  }
  catch (error) {
    return null;
  }
}

function normalizedPhotoUrl(value) {
  if (!isWebUrl(value)) return value;

  try {
    const url = new URL(value);
    if (/pbs\.twimg\.com$/i.test(url.hostname) && (
      url.pathname.indexOf("/media/") >= 0
      || url.pathname.indexOf("/card_img/") >= 0
    )) {
      if (url.searchParams.has("name")) {
        url.searchParams.set("name", "large");
      }
      return url.toString();
    }
  }
  catch (error) {
    return value;
  }

  return value;
}

function extractCard(result, externalUrls, mappings) {
  const values = cardBindingValues(result);
  if (Object.keys(values).length === 0) return null;

  const unified = unifiedCard(values, externalUrls, mappings);
  if (unified) return unified;

  const url = firstExternalCardUrl(values, mappings) || firstExternalUrl(externalUrls);
  if (!isExternalWebUrl(url)) return null;

  const image = firstCardImage(values);
  const title = firstCardText(values, [
    "title",
    "card_title",
    "player_title",
    "app_name",
    "promo_title"
  ]);
  const subtitle = firstCardText(values, [
    "description",
    "card_description",
    "player_description",
    "app_description",
    "promo_description"
  ]);
  const siteName = firstCardText(values, [
    "site_name",
    "site",
    "domain",
    "publisher",
    "publisher_name",
    "vanity_url"
  ]);
  const authorName = firstCardText(values, [
    "author_name",
    "author",
    "creator",
    "creator_name"
  ]);

  return {
    url,
    type: normalizedCardType(values, image),
    title,
    subtitle,
    siteName,
    authorName,
    image: image ? image.url : null,
    aspectSize: image && image.width > 0 && image.height > 0
      ? { width: image.width, height: image.height }
      : null,
    hiddenUrls: cardHiddenUrls(url, externalUrls, values, mappings)
  };
}

function cardBindingValues(result) {
  const values = {};
  const containers = cardContainers(result);

  for (const container of containers) {
    mergeCardBindingValues(values, container);
  }

  return values;
}

function cardContainers(result) {
  return [
    result && result.card,
    result && result.tweet_card,
    result && result.legacy && result.legacy.tweet_card
  ].filter(Boolean);
}

function mergeCardBindingValues(values, container) {
  const legacy = container && container.legacy ? container.legacy : {};
  for (const key of ["name", "url", "expanded_url", "website_url", "destination_url"]) {
    const candidate = container && container[key] != null ? container[key] : legacy[key];
    if (candidate != null && values[key] == null) values[key] = candidate;
  }

  const bindings = (container && container.legacy && container.legacy.binding_values)
    || (container && container.binding_values);

  if (Array.isArray(bindings)) {
    for (const binding of bindings) {
      if (binding && binding.key) values[binding.key] = binding.value;
    }
  }
  else if (bindings && typeof bindings === "object") {
    for (const key of Object.keys(bindings)) {
      values[key] = bindings[key];
    }
  }
}

function firstExternalCardUrl(values, mappings) {
  const keys = [
    "card_url",
    "expanded_url",
    "url",
    "website_url",
    "destination_url",
    "vanity_url",
    "player_url",
    "player_stream_url",
    "site_url",
    "app_url"
  ];
  for (const key of keys) {
    const value = cardString(values[key]);
    const expanded = expandedUrlForSource(value, mappings);
    if (isExternalWebUrl(expanded)) return expanded;
    if (isExternalWebUrl(value)) return value;
  }
  return null;
}

function firstExternalUrl(values) {
  for (const value of values || []) {
    if (isExternalWebUrl(value)) return value;
  }
  return null;
}

function firstCardText(values, keys) {
  for (const key of keys) {
    const text = normalizedCardText(cardString(values[key]));
    if (text) return text;
  }
  return "";
}

function normalizedCardType(values, image) {
  const raw = firstCardText(values, ["type", "card_type", "card_name", "name"]).toLowerCase();
  if (/player|video|broadcast/.test(raw)) return "video.other";
  if (/audio|space/.test(raw)) return "audio.other";
  if (/photo|image/.test(raw) && !image) return "image";
  return "website";
}

function expandedUrlForSource(value, mappings) {
  if (!value) return null;
  for (const mapping of mappings || []) {
    if (mapping.source === value || mapping.expanded === value) return mapping.expanded;
  }
  return null;
}

function cardHiddenUrls(url, externalUrls, values, mappings) {
  const urls = [url];
  for (const candidate of externalUrls || []) {
    if (equivalentWebUrl(candidate, url)) urls.push(candidate);
  }
  for (const mapping of mappings || []) {
    if (!mapping) continue;
    if (equivalentWebUrl(mapping.expanded, url) || equivalentWebUrl(mapping.source, url)) {
      urls.push(mapping.source, mapping.expanded, mapping.display);
    }
  }
  const candidates = [
    "card_url",
    "expanded_url",
    "url",
    "website_url",
    "destination_url",
    "player_url",
    "player_stream_url",
    "site_url",
    "app_url"
  ];
  for (const key of candidates) {
    const value = cardString(values[key]);
    if (!value) continue;
    urls.push(value);
    const expanded = expandedUrlForSource(value, mappings);
    if (expanded && equivalentWebUrl(expanded, url)) urls.push(expanded);
  }
  return dedupeStrings(urls);
}

function unifiedCard(values, externalUrls, mappings) {
  const raw = cardString(values.unified_card);
  if (!raw) return null;

  let json;
  try {
    json = JSON.parse(raw);
  }
  catch (error) {
    return null;
  }

  const url = unifiedCardUrl(json, mappings)
    || firstExternalCardUrl(values, mappings)
    || firstExternalUrl(externalUrls);
  if (!isExternalWebUrl(url)) return null;

  const details = unifiedCardDetails(json);
  const image = unifiedCardImage(json);
  return {
    url,
    type: unifiedCardType(json),
    title: details.title,
    subtitle: details.subtitle,
    siteName: details.siteName,
    authorName: details.authorName,
    image: image ? image.url : null,
    aspectSize: image && image.width > 0 && image.height > 0
      ? { width: image.width, height: image.height }
      : null,
    hiddenUrls: cardHiddenUrls(url, externalUrls, values, mappings)
  };
}

function unifiedCardUrl(json, mappings) {
  const candidates = [];
  const destinations = json && json.destination_objects ? Object.keys(json.destination_objects) : [];
  for (const key of destinations) {
    const data = json.destination_objects[key] && json.destination_objects[key].data || {};
    candidates.push(
      data.url,
      data.destination_url,
      data.url_data && data.url_data.url,
      data.url_data && data.url_data.expanded_url,
      data.display_url
    );
  }

  const components = json && json.component_objects ? Object.keys(json.component_objects) : [];
  for (const key of components) {
    const data = json.component_objects[key] && json.component_objects[key].data || {};
    candidates.push(
      data.url,
      data.destination_url,
      data.destination,
      data.url_data && data.url_data.url,
      data.url_data && data.url_data.expanded_url
    );
  }

  for (const candidate of candidates) {
    const value = unifiedText(candidate);
    const expanded = expandedUrlForSource(value, mappings);
    if (isExternalWebUrl(expanded)) return expanded;
    if (isExternalWebUrl(value)) return value;
  }
  return null;
}

function unifiedCardDetails(json) {
  const components = json && json.component_objects ? Object.keys(json.component_objects) : [];
  for (const key of components) {
    const data = json.component_objects[key] && json.component_objects[key].data || {};
    const title = normalizedCardText(unifiedText(data.title || data.headline || data.label));
    const subtitle = normalizedCardText(unifiedText(data.subtitle || data.description));
    const siteName = normalizedCardText(unifiedText(data.vanity_url || data.site_name || data.domain));
    const authorName = stripLeadingAt(normalizedCardText(unifiedText(data.author || data.author_name || data.creator)));
    if (title || subtitle || siteName || authorName) {
      return { title, subtitle, siteName, authorName };
    }
  }
  return { title: "", subtitle: "", siteName: "", authorName: "" };
}

function unifiedCardImage(json) {
  const media = mediaEntityEntries(json && json.media_entities);
  for (const entry of media) {
    const info = modernMediaInfo(entry);
    if (!info) continue;
    const typeName = String(info.__typename || info.type || "").toLowerCase();
    const imageUrl = typeName.indexOf("video") >= 0 || typeName.indexOf("gif") >= 0
      ? info.preview_image && (info.preview_image.original_img_url || info.preview_image.url)
      : info.original_img_url || info.original_image_url || info.image_url || info.url;
    const url = normalizedPhotoUrl(imageUrl);
    if (!isWebUrl(url)) continue;
    const dimensions = modernMediaDimensions(info);
    return {
      url,
      width: dimensions.width,
      height: dimensions.height
    };
  }
  return null;
}

function unifiedCardType(json) {
  const raw = String(json && (json.type || json.card_type || json.name) || "").toLowerCase();
  if (/player|video|broadcast/.test(raw)) return "video.other";
  if (/audio|space/.test(raw)) return "audio.other";
  return "website";
}

function unifiedText(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  return value.content
    || value.text
    || value.string_value
    || value.url
    || value.id
    || "";
}

function firstCardImage(values) {
  const keys = [
    "thumbnail_image_original",
    "thumbnail_image_x_large",
    "thumbnail_image_large",
    "thumbnail_image",
    "summary_photo_image_original",
    "summary_photo_image_large",
    "summary_photo_image",
    "player_image_original",
    "player_image_large",
    "player_image",
    "photo_image_full_size_original",
    "photo_image_full_size",
    "promo_image_original",
    "promo_image",
    "app_image",
    "app_icon"
  ];

  for (const key of keys) {
    const image = cardImage(values[key]);
    if (image) return image;
  }

  for (const key of Object.keys(values)) {
    if (!/(image|thumbnail|photo|icon)/i.test(key) || /color/i.test(key)) continue;
    const image = cardImage(values[key]);
    if (image) return image;
  }

  return null;
}

function cardImage(value) {
  const image = value && value.image_value ? value.image_value : value;
  const url = image && image.url ? normalizedPhotoUrl(String(image.url)) : cardString(value);
  if (!isWebUrl(url)) return null;
  return {
    url,
    width: finiteNumber(image && (image.width || image.original_width)),
    height: finiteNumber(image && (image.height || image.original_height))
  };
}

function cardString(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  if (value.string_value != null) return String(value.string_value);
  if (value.url != null) return String(value.url);
  if (value.boolean_value != null) return String(value.boolean_value);
  if (value.long_value != null) return String(value.long_value);
  if (value.image_value && value.image_value.url) return String(value.image_value.url);
  return "";
}

function normalizedCardText(value) {
  const text = String(value || "").trim();
  if (!text || /^https?:\/\//i.test(text)) return "";
  return htmlDecode(text);
}

function extractPoll(result) {
  const values = cardBindingValues(result);
  const options = [];

  for (let index = 1; index <= 10; index += 1) {
    const title = cardString(values[`choice${index}_label`]);
    if (!title) continue;
    const count = cardString(values[`choice${index}_count`]);
    options.push({
      title,
      votes: count ? finiteNumber(count) : null
    });
  }

  if (options.length === 0) return null;

  const end = cardString(values.end_datetime_utc) || cardString(values.end_time);
  return {
    options,
    endDate: pollEndDate(end)
  };
}

function pollEndDate(value) {
  const seconds = finiteNumber(value);
  if (seconds > 0) return new Date(seconds * 1000);

  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function bottomCursor(instructions) {
  if (!Array.isArray(instructions)) return null;
  for (let instructionIndex = instructions.length - 1; instructionIndex >= 0; instructionIndex -= 1) {
    const instruction = instructions[instructionIndex];
    const entries = [];
    if (Array.isArray(instruction.entries)) entries.push(...instruction.entries);
    if (instruction.entry) entries.push(instruction.entry);

    for (let entryIndex = entries.length - 1; entryIndex >= 0; entryIndex -= 1) {
      const entry = entries[entryIndex];
      const entryId = entry && entry.entryId ? String(entry.entryId) : "";
      const value = entry && entry.content ? entry.content.value : null;
      if (entryId.indexOf("cursor-bottom") === 0 && typeof value === "string" && value) {
        return value;
      }
    }
  }
  return null;
}

function tweetToItem(tweet) {
  const item = Item.createWithUriDate(tweet.url, tweet.date || new Date());
  const body = tweetBody(tweet);
  if (body) item.body = body;
  if (tweet.contentWarning) item.contentWarning = tweet.contentWarning;

  item.author = tweetIdentity(tweet);

  const annotations = tweetAnnotations(tweet);
  if (annotations.length > 0) item.annotations = annotations;

  const attachments = tweetAttachments(tweet);
  if (attachments.length > 0) item.attachments = attachments;

  item.actions = tweetActions(tweet);

  return item;
}

function tweetBody(tweet) {
  const text = tweetBodyText(tweet);
  if (!text.trim()) return "";
  return `<p>${linkifiedText(text)}</p>`;
}

function tweetBodyText(tweet) {
  const card = linkCardForTweet(tweet);
  const text = tweet && tweet.text ? tweet.text : "";
  if (card) return textWithoutCardUrl(text, card.hiddenUrls || [card.url]);
  if (hasRenderableMedia(tweet)) return textWithoutCardUrl(text, tweet.hiddenUrls || mediaHiddenUrls(tweet.media));
  return text;
}

function tweetIdentity(tweet) {
  const username = tweet.authorUsername ? `@${tweet.authorUsername}` : null;
  const uri = tweet.authorUsername ? `https://x.com/${tweet.authorUsername}` : "https://x.com";
  return createIdentity(tweet.authorName || "X", username, tweet.authorAvatar, uri);
}

function createIdentity(name, username, avatar, uri) {
  const identity = Identity.createWithName(name);
  if (username) identity.username = username;
  if (avatar) identity.avatar = avatar;
  if (uri) identity.uri = uri;
  return identity;
}

function tweetAnnotations(tweet) {
  const annotations = [];
  if (tweet.repostedByUsername || tweet.repostedByName) {
    const text = tweet.repostedByUsername
      ? `@${tweet.repostedByUsername} Reposted`
      : `${tweet.repostedByName} Reposted`;
    const annotation = Annotation.createWithText(text);
    if (tweet.repostedByAvatar) annotation.icon = tweet.repostedByAvatar;
    if (tweet.repostedByUsername) annotation.uri = `https://x.com/${tweet.repostedByUsername}`;
    annotations.push(annotation);
  }
  if (tweet.isReply) {
    const text = tweet.replyToUsername ? `Reply to @${tweet.replyToUsername}` : "Reply";
    annotations.push(Annotation.createWithText(text));
  }
  if (showMetrics()) {
    const details = [];
    if (tweet.replies > 0) details.push(`${formatCount(tweet.replies)} replies`);
    if (tweet.reposts > 0) details.push(`${formatCount(tweet.reposts)} reposts`);
    if (tweet.quotes > 0) details.push(`${formatCount(tweet.quotes)} quotes`);
    if (tweet.likes > 0) details.push(`${formatCount(tweet.likes)} likes`);
    if (tweet.views > 0) details.push(`${formatCount(tweet.views)} views`);
    if (details.length > 0) annotations.push(Annotation.createWithText(details.join(" - ")));
  }
  return annotations;
}

function tweetAttachments(tweet) {
  const attachments = [];

  attachments.push(...tweetMediaAttachments(tweet));

  const poll = tweetPollAttachment(tweet);
  if (poll) attachments.push(poll);

  if (attachments.length === 0) {
    const link = tweetLinkAttachment(tweet);
    if (link) attachments.push(link);
  }

  const quote = quotedTweetAttachment(tweet);
  if (quote) attachments.push(quote);

  return attachments;
}

function tweetMediaAttachments(tweet) {
  const attachments = [];
  if (!showMedia() || typeof MediaAttachment === "undefined" || !tweet.media || tweet.media.length === 0) {
    return attachments;
  }

  for (const media of tweet.media.slice(0, 4)) {
    const attachment = MediaAttachment.createWithUrl(media.url);
    if (media.mimeType) attachment.mimeType = media.mimeType;
    if (media.thumbnail) attachment.thumbnail = media.thumbnail;
    if (media.width > 0 && media.height > 0) {
      attachment.aspectSize = { width: media.width, height: media.height };
    }
    attachment.text = media.altText || mediaDescription(media, tweet);
    attachments.push(attachment);
  }

  return attachments;
}

function mediaDescription(media, tweet) {
  const author = tweet.authorName || "X";
  if (media.type === "video") return `Video from ${author}`;
  if (media.type === "animated_gif") return `GIF from ${author}`;
  return `Image from ${author}`;
}

function tweetPollAttachment(tweet) {
  if (!tweet.poll || typeof PollAttachment === "undefined" || typeof PollOption === "undefined") return null;

  const attachment = PollAttachment.create();
  attachment.options = tweet.poll.options.map(option => (
    option.votes == null
      ? PollOption.create(option.title)
      : PollOption.create(option.title, option.votes)
  ));
  if (tweet.poll.endDate) attachment.endDate = tweet.poll.endDate;
  return attachment;
}

function tweetLinkAttachment(tweet) {
  const card = linkCardForTweet(tweet);
  if (!card) return null;

  const attachment = LinkAttachment.createWithUrl(card.url);
  if (card.type) attachment.type = card.type;
  if (card.title) attachment.title = card.title;
  if (card.subtitle) attachment.subtitle = card.subtitle;
  if (card.siteName) attachment.siteName = card.siteName;
  if (card.authorName) attachment.authorName = card.authorName;
  if (card.image) attachment.image = card.image;
  if (card.aspectSize) attachment.aspectSize = card.aspectSize;
  return attachment;
}

function linkCardForTweet(tweet) {
  if (!showLinkCards() || typeof LinkAttachment === "undefined" || !tweet) return null;
  if (hasRenderableMedia(tweet) || hasRenderablePoll(tweet)) return null;

  const card = tweet.card || {};
  const url = card.url || firstExternalUrl(tweet.externalUrls);
  if (!isExternalWebUrl(url)) return null;
  const hasXCard = Boolean(card.url);

  return {
    url,
    type: hasXCard ? (card.type || "website") : "",
    title: card.title || "",
    subtitle: card.subtitle || "",
    siteName: hasXCard ? (card.siteName || urlHost(url) || "") : "",
    authorName: card.authorName || "",
    image: card.image || null,
    aspectSize: card.aspectSize || null,
    hiddenUrls: card.hiddenUrls || [url]
  };
}

async function linkPreviewForUrl(url) {
  if (!isExternalWebUrl(url)) return null;

  const cached = readLinkPreview(url);
  if (cached) return cached;

  try {
    const text = await requestText(url, "GET", null, linkPreviewHeaders(), "LinkPreview");
    const preview = parseLinkPreview(text, url);
    if (preview && preview.hasMetadata) {
      delete preview.hasMetadata;
      writeLinkPreview(url, preview);
      return preview;
    }
  }
  catch (error) {
    console.log(`Unable to fetch link preview for ${url}: ${error.message || error}`);
  }

  return null;
}

function linkPreviewHeaders() {
  return {
    "User-Agent": browserUserAgent,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Range": `bytes=0-${maximumLinkPreviewBytes - 1}`
  };
}

function parseLinkPreview(text, pageUrl) {
  const html = String(text || "");
  const values = htmlMetaValues(html);
  const rawImage = firstMetaValue(values, [
    "twitter:image",
    "twitter:image:src",
    "og:image:secure_url",
    "og:image:url",
    "og:image",
    "image"
  ]);
  const image = rawImage ? absoluteUrl(rawImage, pageUrl) : null;
  const width = finiteNumber(firstMetaValue(values, ["twitter:image:width", "og:image:width"]));
  const height = finiteNumber(firstMetaValue(values, ["twitter:image:height", "og:image:height"]));
  const title = firstMetaValue(values, ["twitter:title", "og:title"]) || htmlTitle(html);
  const subtitle = firstMetaValue(values, ["twitter:description", "og:description", "description"]);
  const siteName = stripLeadingAt(firstMetaValue(values, ["og:site_name", "twitter:site", "application-name"]));
  const authorName = stripLeadingAt(firstMetaValue(values, ["twitter:creator", "author", "article:author"]));
  const validImage = isWebUrl(image) ? image : null;
  const hasMetadata = Boolean(title || subtitle || siteName || authorName || validImage);

  return {
    url: pageUrl,
    type: linkPreviewType(values),
    title,
    subtitle,
    siteName: siteName || (hasMetadata ? urlHost(pageUrl) : ""),
    authorName,
    image: validImage,
    aspectSize: width > 0 && height > 0 ? { width, height } : null,
    hasMetadata
  };
}

function htmlMetaValues(html) {
  const values = {};
  const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const key = attributeValue(tag, "property") || attributeValue(tag, "name") || attributeValue(tag, "itemprop");
    const content = attributeValue(tag, "content");
    if (!key || !content) continue;

    const normalizedKey = String(key).trim().toLowerCase();
    if (!values[normalizedKey]) values[normalizedKey] = [];
    values[normalizedKey].push(normalizedWhitespace(content));
  }

  return values;
}

function firstMetaValue(values, keys) {
  for (const key of keys) {
    const options = values[String(key).toLowerCase()];
    if (!Array.isArray(options)) continue;
    const value = options.find(candidate => normalizedWhitespace(candidate));
    if (value) return normalizedWhitespace(value);
  }
  return "";
}

function htmlTitle(html) {
  const match = String(html || "").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return normalizedWhitespace(htmlDecode(match[1].replace(/<[^>]+>/g, "")));
}

function linkPreviewType(values) {
  const twitterCard = firstMetaValue(values, ["twitter:card"]).toLowerCase();
  const ogType = firstMetaValue(values, ["og:type"]).toLowerCase();
  if (/player/.test(twitterCard) || /video/.test(ogType)) return "video.other";
  if (/audio/.test(twitterCard) || /audio/.test(ogType)) return "audio.other";
  if (/photo/.test(twitterCard) || /^image\b/.test(ogType)) return "image";
  return "website";
}

function absoluteUrl(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  }
  catch (error) {
    return value;
  }
}

function stripLeadingAt(value) {
  return normalizedWhitespace(value).replace(/^@/, "");
}

function normalizedWhitespace(value) {
  return htmlDecode(String(value || "").replace(/\s+/g, " ").trim());
}

function readLinkPreview(url) {
  const cache = readLinkPreviewCache();
  const entry = cache[linkPreviewCacheUrl(url)];
  if (!entry || !entry.preview || typeof entry.preview !== "object") return null;
  if (!entry.builtAt || Date.now() - Number(entry.builtAt) >= linkPreviewCacheTtlMilliseconds) return null;
  return entry.preview;
}

function writeLinkPreview(url, preview) {
  if (!preview || typeof preview !== "object") return;
  const cache = readLinkPreviewCache();
  cache[linkPreviewCacheUrl(url)] = {
    builtAt: Date.now(),
    preview
  };
  safeSetItem(linkPreviewCacheKey, JSON.stringify(pruneLinkPreviewCache(cache)));
}

function readLinkPreviewCache() {
  const stored = safeGetItem(linkPreviewCacheKey);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : {};
  }
  catch (error) {
    return {};
  }
}

function pruneLinkPreviewCache(cache) {
  const now = Date.now();
  const entries = Object.keys(cache || {})
    .map(key => ({ key, entry: cache[key] }))
    .filter(item => (
      item.entry
      && item.entry.preview
      && item.entry.builtAt
      && now - Number(item.entry.builtAt) < linkPreviewCacheTtlMilliseconds
    ))
    .sort((left, right) => Number(right.entry.builtAt) - Number(left.entry.builtAt))
    .slice(0, maximumLinkPreviewCacheEntries);

  const pruned = {};
  for (const item of entries) {
    pruned[item.key] = item.entry;
  }
  return pruned;
}

function linkPreviewCacheUrl(url) {
  return normalizedUrlForCompare(url) || String(url || "");
}

function hasRenderableMedia(tweet) {
  return Boolean(
    showMedia()
    && typeof MediaAttachment !== "undefined"
    && tweet
    && tweet.media
    && tweet.media.length > 0
  );
}

function hasRenderablePoll(tweet) {
  return Boolean(
    tweet
    && tweet.poll
    && typeof PollAttachment !== "undefined"
    && typeof PollOption !== "undefined"
  );
}

function quotedTweetAttachment(tweet) {
  if (!tweet.quoted || typeof Item === "undefined") return null;

  const quote = Item.createWithUriDate(tweet.quoted.url, tweet.quoted.date || new Date());
  const body = tweetBody(tweet.quoted);
  if (body) quote.body = body;
  if (tweet.quoted.contentWarning) quote.contentWarning = tweet.quoted.contentWarning;
  quote.author = tweetIdentity(tweet.quoted);

  const attachments = tweetMediaAttachments(tweet.quoted);
  if (attachments.length === 0) {
    const link = tweetLinkAttachment(tweet.quoted);
    if (link) attachments.push(link);
  }
  if (attachments.length > 0) quote.attachments = attachments;
  quote.actions = tweetActions(tweet.quoted);

  return quote;
}

function tweetActions(tweet) {
  if (!tweet || !tweet.id) return {};
  return {
    thread: JSON.stringify({
      tweetId: tweet.id,
      url: tweet.url
    })
  };
}

function parseActionValue(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  }
  catch (error) {
    return {};
  }
}

function tweetIdFromUrl(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

function shouldIncludeTweet(tweet) {
  if (!includeReplies() && tweet.isReply) return false;
  if (!includeRetweets() && tweet.isRetweet) return false;
  return true;
}

function currentSyncSignature(query) {
  return JSON.stringify({
    mode: normalizedSourceMode(),
    query,
    product: normalizedSearchProduct(),
    searchFilters: normalizedSourceMode() === "search query" ? stringInput("query_suffix").trim() : "",
    includeReplies: includeReplies(),
    includeRetweets: includeRetweets(),
    showMetrics: showMetrics(),
    showMedia: showMedia(),
    showLinkCards: showLinkCards(),
    fetchLinkPreviews: fetchLinkPreviews(),
    batchSize: normalizedBatchSize(),
    homeLatestTimelineQueryId: normalizedHomeLatestTimelineQueryId(),
    searchQueryId: normalizedSearchQueryId(),
    userByScreenNameQueryId: normalizedUserByScreenNameQueryId(),
    userTweetsQueryId: normalizedUserTweetsQueryId(),
    tweetDetailQueryId: normalizedTweetDetailQueryId(),
    transactionHeader: useTransactionHeader()
  });
}

function newSyncState(signature) {
  return {
    signature,
    highWaterBySource: {}
  };
}

function syncStateForSignature(signature) {
  const syncState = readSyncState();
  return syncState.signature === signature ? syncState : newSyncState(signature);
}

function readSyncState() {
  const stored = safeGetItem(syncStateKey);
  if (!stored) return newSyncState(null);
  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : newSyncState(null);
  }
  catch (error) {
    return newSyncState(null);
  }
}

function syncHighWater(state, key) {
  if (!state || !key) return null;
  if (state.highWaterBySource && state.highWaterBySource[key]) return state.highWaterBySource[key];
  if (key === "search" && state.highWaterId) return state.highWaterId;
  return null;
}

function setSyncHighWater(state, key, highWaterId) {
  if (!state.highWaterBySource) state.highWaterBySource = {};
  state.highWaterBySource[key] = highWaterId;
}

function writeSyncState(state) {
  safeSetItem(syncStateKey, JSON.stringify(state));
}

function buildSearchQuery() {
  const mode = normalizedSourceMode();
  const input = stringInput("x_sources").trim();
  if (!input && mode !== "following") {
    throw new Error("Enter one or more X handles, or switch Source Mode to Search Query and enter a query.");
  }

  let query;
  if (mode === "search query") {
    query = input;
  }
  else {
    const handles = normalizedHandles();
    if (handles.length === 0) {
      throw new Error("Enter one or more valid X handles.");
    }
    const clauses = handles.map(handle => `from:${handle}`);
    query = clauses.length === 1 ? clauses[0] : `(${clauses.join(" OR ")})`;
  }

  const suffix = stringInput("query_suffix").trim();
  if (suffix) query = `${query} ${suffix}`;
  if (!includeReplies() && !/\bfilter:replies\b/i.test(query)) query = `${query} -filter:replies`;
  if (!includeRetweets() && !/\bfilter:retweets\b/i.test(query)) query = `${query} -filter:retweets`;
  return query;
}

function sourceLabel() {
  const mode = normalizedSourceMode();
  if (mode === "following") return "Following Feed";
  if (mode === "search query") return "Search";
  const handles = normalizedHandles();
  if (handles.length === 0) return "Individual Accounts";
  if (handles.length <= 2) return handles.map(handle => `@${handle}`).join(", ");
  return `@${handles[0]} + ${handles.length - 1}`;
}

function normalizedHandles() {
  return stringInput("x_sources")
    .split(/[,\s]+/)
    .map(sanitizeHandle)
    .filter(Boolean)
    .slice(0, 25);
}

function sanitizeHandle(value) {
  if (!value) return null;
  let handle = String(value).trim();
  handle = handle.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "");
  handle = handle.replace(/^@/, "");
  handle = handle.split(/[/?#]/)[0];
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : null;
}

function normalizedCredentials() {
  const parsedCookie = parseCookieHeader(stringInput("cookie_header"));
  const authToken = stringInput("auth_token").trim() || parsedCookie.auth_token;
  const csrf = stringInput("ct0").trim() || parsedCookie.ct0;
  if (!authToken || !csrf) {
    throw new Error("Enter auth_token and ct0, or paste a full Cookie header containing both values.");
  }

  return {
    authToken,
    ct0: csrf,
    cookie: completeCookieHeader(stringInput("cookie_header"), authToken, csrf)
  };
}

function parseCookieHeader(value) {
  const cookies = {};
  const header = String(value || "").replace(/^cookie:\s*/i, "");
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const val = part.slice(index + 1).trim();
    if (key) cookies[key] = val;
  }
  return cookies;
}

function completeCookieHeader(header, authToken, csrf) {
  const trimmed = String(header || "").replace(/^cookie:\s*/i, "").trim();
  const cookies = parseCookieHeader(trimmed);
  const parts = trimmed ? trimmed.split(";").map(part => part.trim()).filter(Boolean) : [];
  if (!cookies.auth_token) parts.push(`auth_token=${authToken}`);
  if (!cookies.ct0) parts.push(`ct0=${csrf}`);
  return parts.join("; ");
}

function normalizedSourceMode() {
  const value = normalizedChoice(stringInput("source_mode"));
  if (value === "following feed" || value === "feed" || value === "following") return "following";
  if (value === "search query" || value === "search") return "search query";
  return "handles";
}

function normalizedSearchProduct() {
  const value = normalizedChoice(stringInput("search_product"));
  return value === "top" ? "Top" : "Latest";
}

function normalizedBatchSize() {
  const value = parseInt(stringInput("batch_size"), 10);
  return [20, 50, 100].includes(value) ? value : 50;
}

function normalizedHomeLatestTimelineQueryId() {
  const value = stringInput("home_latest_timeline_query_id").trim();
  return value || defaultHomeLatestTimelineQueryId;
}

function normalizedSearchQueryId() {
  const value = stringInput("search_query_id").trim();
  return value || defaultSearchTimelineQueryId;
}

function normalizedUserByScreenNameQueryId() {
  const value = stringInput("user_by_screen_name_query_id").trim();
  return value || defaultUserByScreenNameQueryId;
}

function normalizedUserTweetsQueryId() {
  const value = stringInput("user_tweets_query_id").trim();
  return value || defaultUserTweetsQueryId;
}

function normalizedTweetDetailQueryId() {
  const value = stringInput("tweet_detail_query_id").trim();
  return value || defaultTweetDetailQueryId;
}

function normalizedBearerToken() {
  const value = stringInput("bearer_token").trim().replace(/^bearer\s+/i, "");
  return value || defaultBearerToken;
}

function includeReplies() {
  return normalizedChoice(stringInput("include_replies")) === "on";
}

function includeRetweets() {
  return normalizedChoice(stringInput("include_retweets")) === "on";
}

function showMetrics() {
  return normalizedChoice(stringInput("show_metrics")) !== "off";
}

function showMedia() {
  return normalizedChoice(stringInput("show_media")) !== "off";
}

function showLinkCards() {
  return normalizedChoice(stringInput("show_link_cards")) !== "off";
}

function fetchLinkPreviews() {
  return normalizedChoice(stringInput("fetch_link_previews")) !== "off";
}

function useTransactionHeader() {
  return normalizedChoice(stringInput("use_transaction_header")) !== "off";
}

function normalizedChoice(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function stringInput(name) {
  if (typeof globalThis !== "undefined" && typeof globalThis[name] === "string") {
    return globalThis[name];
  }
  return "";
}

async function transactionId(method, path, credentials) {
  const seed = await transactionSeed(credentials);
  const now = Math.floor((Date.now() - transactionEpochOffsetMilliseconds) / 1000);
  const timeBytes = [0, 1, 2, 3].map(index => (now >> (index * 8)) & 255);
  const hash = sha256Bytes(`${method}!${path}!${now}${transactionKeyword}${seed.animationKey}`);
  const random = Math.floor(Math.random() * 256);
  const bytes = seed.keyBytes
    .concat(timeBytes)
    .concat(hash.slice(0, 16))
    .concat([3]);
  const encoded = [random].concat(bytes.map(byte => byte ^ random));
  return bytesToBase64(encoded).replace(/=+$/, "");
}

async function transactionSeed(credentials) {
  const cached = readTransactionCache();
  if (cached) return cached;

  const home = await requestText(xHomeUrl, "GET", null, homeHeaders(credentials));
  const ondemandUrl = ondemandScriptUrl(home);
  const ondemand = await requestText(ondemandUrl, "GET", null, staticHeaders());
  const seed = transactionSeedFromHtml(home, ondemand);
  writeTransactionCache(seed);
  return seed;
}

function homeHeaders(credentials) {
  return {
    "User-Agent": browserUserAgent,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": credentials.cookie
  };
}

function staticHeaders() {
  return {
    "User-Agent": browserUserAgent,
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://x.com/"
  };
}

function readTransactionCache() {
  const stored = safeGetItem(transactionCacheKey);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.keyBytes) || typeof parsed.animationKey !== "string") return null;
    if (!parsed.builtAt || Date.now() - Number(parsed.builtAt) >= transactionCacheTtlMilliseconds) return null;
    return {
      keyBytes: parsed.keyBytes.map(value => Number(value) & 255),
      animationKey: parsed.animationKey
    };
  }
  catch (error) {
    return null;
  }
}

function writeTransactionCache(seed) {
  safeSetItem(transactionCacheKey, JSON.stringify({
    builtAt: Date.now(),
    keyBytes: seed.keyBytes,
    animationKey: seed.animationKey
  }));
}

function clearTransactionCache() {
  safeSetItem(transactionCacheKey, "");
}

async function discoverQueryId(action, credentials, rejectedQueryId) {
  const cached = readQueryIdCache(action);
  if (cached && cached !== rejectedQueryId) return cached;

  try {
    const home = await requestText(xHomeUrl, "GET", null, homeHeaders(credentials));
    const scripts = scriptUrlsFromHtml(home).slice(0, maximumQueryIdScripts);
    for (const scriptUrl of scripts) {
      const script = await requestText(scriptUrl, "GET", null, staticHeaders());
      const queryId = queryIdFromScript(script, action);
      if (queryId) {
        writeQueryIdCache(action, queryId);
        return queryId;
      }
    }
  }
  catch (error) {
    console.log(`Unable to discover ${action} query ID: ${error.message || error}`);
  }

  return null;
}

function scriptUrlsFromHtml(home) {
  const urls = [];
  const regex = /(?:src|href)=["'](https:\/\/abs\.twimg\.com\/responsive-web\/client-web[^"']+?\.js)["']/g;
  let match;
  while ((match = regex.exec(home || "")) !== null) {
    if (urls.indexOf(match[1]) < 0) urls.push(match[1]);
  }
  return urls;
}

function queryIdFromScript(script, action) {
  const name = escapeRegExp(action);
  const patterns = [
    new RegExp(`queryId:\\s*["']([A-Za-z0-9_-]+)["'][\\s\\S]{0,900}operationName:\\s*["']${name}["']`),
    new RegExp(`operationName:\\s*["']${name}["'][\\s\\S]{0,900}queryId:\\s*["']([A-Za-z0-9_-]+)["']`)
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(script || "");
    if (match) return match[1];
  }
  return null;
}

function readQueryIdCache(action) {
  const stored = safeGetItem(queryIdCacheKey);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    const entry = parsed && parsed[action];
    if (!entry || typeof entry.queryId !== "string") return null;
    if (!entry.builtAt || Date.now() - Number(entry.builtAt) >= queryIdCacheTtlMilliseconds) return null;
    return entry.queryId;
  }
  catch (error) {
    return null;
  }
}

function writeQueryIdCache(action, queryId) {
  let parsed = {};
  const stored = safeGetItem(queryIdCacheKey);
  if (stored) {
    try {
      parsed = JSON.parse(stored) || {};
    }
    catch (error) {
      parsed = {};
    }
  }
  parsed[action] = {
    builtAt: Date.now(),
    queryId
  };
  safeSetItem(queryIdCacheKey, JSON.stringify(parsed));
}

function safeGetItem(key) {
  return typeof getItem === "function" ? getItem(key) : null;
}

function safeSetItem(key, value) {
  if (typeof setItem === "function") setItem(key, value);
}

function ondemandScriptUrl(home) {
  const direct = home.match(/https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/ondemand\.s\.[^"']+?\.js/);
  if (direct) return direct[0];

  const indexMatch = home.match(/,(\d+):["']ondemand\.s["']/);
  if (!indexMatch) throw new Error("Could not locate X ondemand.s script in the web client.");
  const hashMatch = home.match(new RegExp(`,${indexMatch[1]}:["']([0-9a-f]+)["']`));
  if (!hashMatch) throw new Error("Could not locate X ondemand.s script hash in the web client.");
  return `https://abs.twimg.com/responsive-web/client-web/ondemand.s.${hashMatch[1]}a.js`;
}

function transactionSeedFromHtml(home, ondemand) {
  const key = twitterSiteVerificationKey(home);
  const keyBytes = base64ToBytes(key);
  if (keyBytes.length < 6) throw new Error("X returned an invalid transaction key.");

  const indices = transactionIndices(ondemand);
  const frames = loadingAnimationFrames(home);
  if (frames.length < 4) throw new Error("Could not locate X loading animation frames.");

  return {
    keyBytes,
    animationKey: animationKeyFrom(keyBytes, frames, indices.rowIndex, indices.keyByteIndices)
  };
}

function twitterSiteVerificationKey(home) {
  const tags = home.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (attributeValue(tag, "name") === "twitter-site-verification") {
      const value = attributeValue(tag, "content");
      if (value) return value;
    }
  }
  throw new Error("Could not locate X transaction key in the web client.");
}

function loadingAnimationFrames(home) {
  return home.match(/<svg\b[^>]*id=["']loading-x-anim[^"']*["'][\s\S]*?<\/svg>/gi) || [];
}

function transactionIndices(ondemand) {
  const matches = [];
  const regex = /\(\w\[(\d{1,2})\],\s*16\)/g;
  let match;
  while ((match = regex.exec(ondemand)) !== null) {
    matches.push(Number(match[1]));
  }
  if (matches.length < 2) {
    throw new Error("Could not parse X transaction byte indices; the web bundle shape changed.");
  }
  return {
    rowIndex: matches[0],
    keyByteIndices: matches.slice(1)
  };
}

function attributeValue(tag, name) {
  const regex = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = tag.match(regex);
  return match ? htmlDecode(match[1]) : null;
}

function animationKeyFrom(keyBytes, frames, rowIndex, keyByteIndices) {
  const row = keyBytes[rowIndex] % 16;
  const frameTime = mathRound(keyByteIndices.reduce((acc, index) => acc * (keyBytes[index] % 16), 1) / 10) * 10;
  const frame = frames[keyBytes[5] % 4];
  const pathTags = frame.match(/<path\b[^>]*>/gi) || [];
  const pathData = pathTags.length > 1 ? attributeValue(pathTags[1], "d") : null;
  if (!pathData) throw new Error("Could not parse X transaction animation path.");

  const rows = pathData
    .slice(9)
    .split("C")
    .map(segment => segment
      .replace(/[^\d]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(Number));
  const selected = rows[row];
  if (!selected || selected.length < 11) throw new Error("Could not parse X transaction animation row.");
  return animateTransactionFrame(selected, frameTime / 4096);
}

function animateTransactionFrame(frames, targetTime) {
  const fromColor = frames.slice(0, 3).concat([1]).map(Number);
  const toColor = frames.slice(3, 6).concat([1]).map(Number);
  const fromRotation = [0.0];
  const toRotation = [solveFrameValue(frames[6], 60.0, 360.0, true)];
  const curves = frames.slice(7).map((value, index) => solveFrameValue(value, isOdd(index), 1.0, false));
  const value = new Cubic(curves).getValue(targetTime);
  const color = interpolate(fromColor, toColor, value).map(component => Math.max(0, Math.min(255, component)));
  const rotation = interpolate(fromRotation, toRotation, value);
  const matrix = rotationMatrix(rotation[0]);

  const parts = color.slice(0, -1).map(component => Math.round(component).toString(16));
  for (const matrixValue of matrix) {
    const rounded = Math.abs(Math.round(matrixValue * 100) / 100);
    const hex = floatToHex(rounded);
    parts.push(hex.indexOf(".") === 0 ? `0${hex}`.toLowerCase() : (hex || "0").toLowerCase());
  }
  parts.push("0", "0");
  return parts.join("").replace(/[.-]/g, "");
}

function mathRound(num) {
  const floor = Math.floor(num);
  const rounded = num - floor >= 0.5 ? Math.ceil(num) : floor;
  return Object.is(rounded, -0) ? 0 : Math.sign(num) < 0 && rounded === 0 ? -0 : rounded;
}

function isOdd(number) {
  return number % 2 ? -1.0 : 0.0;
}

function floatToHex(value) {
  const result = [];
  let quotient = Math.trunc(value);
  let fraction = value - quotient;
  while (quotient > 0) {
    quotient = Math.trunc(value / 16);
    const remainder = Math.trunc(value - quotient * 16);
    result.unshift(remainder > 9 ? String.fromCharCode(remainder + 55) : String(remainder));
    value = quotient;
  }
  if (fraction === 0) return result.join("");
  result.push(".");
  while (fraction > 0) {
    fraction *= 16;
    const integer = Math.trunc(fraction);
    fraction -= integer;
    result.push(integer > 9 ? String.fromCharCode(integer + 55) : String(integer));
  }
  return result.join("");
}

function interpolate(from, to, fraction) {
  return from.map((value, index) => value * (1 - fraction) + to[index] * fraction);
}

function rotationMatrix(degrees) {
  const radians = (degrees * Math.PI) / 180;
  return [Math.cos(radians), -Math.sin(radians), Math.sin(radians), Math.cos(radians)];
}

function solveFrameValue(value, min, max, rounding) {
  const result = (value * (max - min)) / 255 + min;
  return rounding ? Math.floor(result) : Math.round(result * 100) / 100;
}

class Cubic {
  constructor(curves) {
    this.curves = curves;
  }

  getValue(time) {
    const curves = this.curves;
    let startGradient = 0;
    let endGradient = 0;
    let start = 0;
    let middle = 0;
    let end = 1;
    if (time <= 0) {
      if (curves[0] > 0) startGradient = curves[1] / curves[0];
      else if (curves[1] === 0 && curves[2] > 0) startGradient = curves[3] / curves[2];
      return startGradient * time;
    }
    if (time >= 1) {
      if (curves[2] < 1) endGradient = (curves[3] - 1) / (curves[2] - 1);
      else if (curves[2] === 1 && curves[0] < 1) endGradient = (curves[1] - 1) / (curves[0] - 1);
      return 1 + endGradient * (time - 1);
    }
    while (start < end) {
      middle = (start + end) / 2;
      const estimate = Cubic.calc(curves[0], curves[2], middle);
      if (Math.abs(time - estimate) < 0.00001) return Cubic.calc(curves[1], curves[3], middle);
      if (estimate < time) start = middle;
      else end = middle;
    }
    return Cubic.calc(curves[1], curves[3], middle);
  }

  static calc(first, second, middle) {
    return 3 * first * (1 - middle) * (1 - middle) * middle
      + 3 * second * (1 - middle) * middle * middle
      + middle * middle * middle;
  }
}

function tweetDate(value) {
  if (!value) return new Date();
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      const milliseconds = numeric < 100000000000 ? numeric * 1000 : numeric;
      const numericDate = new Date(milliseconds);
      if (!Number.isNaN(numericDate.getTime())) return numericDate;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function compareIds(left, right) {
  const a = String(left || "").replace(/\D/g, "");
  const b = String(right || "").replace(/\D/g, "");
  if (a.length !== b.length) return a.length > b.length ? 1 : -1;
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

function maxId(ids) {
  let max = null;
  for (const id of ids) {
    if (id && (!max || compareIds(id, max) > 0)) max = id;
  }
  return max;
}

function dedupeTweets(tweets) {
  return dedupeBy(tweets, tweet => tweet && tweet.id);
}

function sortTweetsNewestFirst(tweets) {
  return (tweets || []).slice().sort((left, right) => {
    const leftTime = left && left.date ? left.date.getTime() : 0;
    const rightTime = right && right.date ? right.date.getTime() : 0;
    return rightTime - leftTime;
  });
}

function dedupeBy(items, keyFunction) {
  const seen = {};
  const out = [];
  for (const item of items || []) {
    const key = keyFunction(item);
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(item);
  }
  return out;
}

function dedupeStrings(values) {
  return dedupeBy(values || [], value => value);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function firstDefined(...values) {
  return values.find(value => value != null);
}

function formatCount(value) {
  const number = finiteNumber(value);
  return number.toLocaleString("en-US");
}

function normalizedAvatar(value) {
  if (!isWebUrl(value)) return null;
  return String(value).trim();
}

function isExternalWebUrl(value) {
  if (!isWebUrl(value)) return false;
  const host = urlHost(value);
  return host && host !== "x.com" && host !== "twitter.com" && host !== "t.co";
}

function isWebUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  }
  catch (error) {
    return false;
  }
}

function urlHost(value) {
  try {
    return new URL(value).host.replace(/^www\./, "");
  }
  catch (error) {
    return null;
  }
}

function equivalentWebUrl(left, right) {
  const a = normalizedUrlForCompare(left);
  const b = normalizedUrlForCompare(right);
  return Boolean(a && b && a === b);
}

function normalizedUrlForCompare(value) {
  if (!isWebUrl(value)) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  }
  catch (error) {
    return null;
  }
}

function textWithoutCardUrl(value, hiddenUrls) {
  let text = String(value || "");
  const variantValues = [];
  for (const url of hiddenUrls || []) {
    variantValues.push(...urlVariants(url));
  }
  const variants = dedupeStrings(variantValues).sort((left, right) => right.length - left.length);

  for (const variant of variants) {
    const index = text.lastIndexOf(variant);
    if (index < 0) continue;

    const before = text.slice(0, index);
    const after = text.slice(index + variant.length);
    if (before && !/\s$/.test(before)) continue;
    if (!/^[\s),.!?:;]*$/.test(after)) continue;

    text = before.trimEnd();
    break;
  }

  return text;
}

function urlVariants(value) {
  if (!isWebUrl(value)) return [];
  const variants = [String(value)];
  try {
    const url = new URL(value);
    url.hash = "";
    variants.push(url.toString());
    if (url.pathname === "/") {
      variants.push(`${url.protocol}//${url.host}`);
    }
    else {
      const withoutTrailingSlash = url.toString().replace(/\/$/, "");
      variants.push(withoutTrailingSlash);
    }
  }
  catch (error) {
    return variants;
  }
  return variants.filter(Boolean);
}

function linkifiedText(value) {
  const text = String(value || "");
  const regex = /(https?:\/\/[^\s<]+)|(^|[^\w/])@([A-Za-z0-9_]{1,15})\b|(^|[^\w/])#([A-Za-z0-9_]+)\b|(^|[^\w/])\$([A-Za-z][A-Za-z0-9_]{0,9})\b/g;
  let html = "";
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    html += escapeHtml(text.slice(lastIndex, match.index));
    if (match[1]) {
      const parts = splitTrailingUrlPunctuation(match[1]);
      html += linkedText(parts.url, displayUrl(parts.url));
      html += escapeHtml(parts.trailing);
    }
    else if (match[3]) {
      html += escapeHtml(match[2]);
      html += linkedText(`https://x.com/${match[3]}`, `@${match[3]}`);
    }
    else if (match[5]) {
      html += escapeHtml(match[4]);
      html += linkedText(`https://x.com/hashtag/${encodeURIComponent(match[5])}`, `#${match[5]}`);
    }
    else if (match[7]) {
      html += escapeHtml(match[6]);
      html += linkedText(`https://x.com/search?q=${encodeURIComponent(`$${match[7]}`)}`, `$${match[7]}`);
    }
    lastIndex = match.index + match[0].length;
  }
  html += escapeHtml(text.slice(lastIndex));
  return html.replace(/\n/g, "<br>");
}

function linkedText(url, label) {
  return `<a href="${escapeAttribute(url)}">${escapeHtml(label)}</a>`;
}

function splitTrailingUrlPunctuation(value) {
  const match = String(value).match(/^(.+?)([),.!?:;]+)?$/);
  if (!match) return { url: value, trailing: "" };
  return {
    url: match[1],
    trailing: match[2] || ""
  };
}

function displayUrl(value) {
  try {
    const url = new URL(value);
    return `${url.host.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
  }
  catch (error) {
    return value;
  }
}

function htmlDecode(value) {
  return String(value)
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function encodeQuery(pairs) {
  return pairs
    .map(pair => `${encodeURIComponent(pair[0])}=${encodeURIComponent(pair[1])}`)
    .join("&");
}

function base64ToBytes(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = String(value || "").replace(/[^A-Za-z0-9+/=]/g, "");
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    if (char === "=") break;
    const index = alphabet.indexOf(char);
    if (index < 0) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 255);
    }
  }
  return bytes;
}

function bytesToBase64(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triple = (first << 16) | (second << 8) | third;
    result += alphabet[(triple >> 18) & 63];
    result += alphabet[(triple >> 12) & 63];
    result += index + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : "=";
    result += index + 2 < bytes.length ? alphabet[triple & 63] : "=";
  }
  return result;
}

function utf8Bytes(value) {
  const bytes = [];
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index);
    if (code < 0x80) {
      bytes.push(code);
    }
    else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    }
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        index += 1;
        code = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f)
        );
      }
    }
    else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

function sha256Bytes(value) {
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const bytes = utf8Bytes(value);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let shift = 56; shift >= 0; shift -= 8) {
    bytes.push(Math.floor(bitLength / Math.pow(2, shift)) & 255);
  }

  const words = new Array(64);
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let index = 0; index < 16; index += 1) {
      const offset = chunk + index * 4;
      words[index] = (
        (bytes[offset] << 24)
        | (bytes[offset + 1] << 16)
        | (bytes[offset + 2] << 8)
        | bytes[offset + 3]
      ) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let current = h[7];

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ ((~e) & g);
      const temp1 = (current + s1 + choose + k[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;

      current = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + current) >>> 0;
  }

  const out = [];
  for (const word of h) {
    out.push((word >>> 24) & 255, (word >>> 16) & 255, (word >>> 8) & 255, word & 255);
  }
  return out;
}

function rotateRight(value, bits) {
  return (value >>> bits) | (value << (32 - bits));
}
