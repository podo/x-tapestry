// local.x.timeline
// Transaction-id generation is adapted from x-agent-sdk's MIT-licensed implementation.

const apiBase = "https://x.com/i/api/graphql";
const xHomeUrl = "https://x.com/";
const xIconUrl = "https://x.com/favicon.ico";
const defaultSearchTimelineQueryId = "Bcw3RzK-PatNAmbnw54hFw";
const defaultBearerToken = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const browserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const syncStateKey = "syncStateV1";
const transactionCacheKey = "transactionCacheV1";
const transactionCacheTtlMilliseconds = 15 * 60 * 1000;
const maximumIncrementalPages = 5;
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

function verify() {
  verifyAsync().then(processVerification).catch(processError);
}

function load() {
  loadAsync().then(processResults).catch(processError);
}

async function verifyAsync() {
  const credentials = normalizedCredentials();
  const query = buildSearchQuery();
  const page = await searchTimelinePage(query, 1, null, credentials);
  const result = {
    displayName: `X - ${sourceLabel()}`,
    icon: xIconUrl
  };

  const firstAvatar = page.items.length > 0 ? page.items[0].authorAvatar : null;
  if (firstAvatar && normalizedSourceMode() === "handles" && normalizedHandles().length === 1) {
    result.icon = firstAvatar;
  }

  return result;
}

async function loadAsync() {
  const credentials = normalizedCredentials();
  const query = buildSearchQuery();
  const signature = currentSyncSignature(query);
  let syncState = readSyncState();
  if (syncState.signature !== signature) {
    syncState = newSyncState(signature);
  }

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

      if (syncState.highWaterId && compareIds(tweet.id, syncState.highWaterId) <= 0) {
        reachedKnownItem = true;
        continue;
      }

      tweets.push(tweet);
    }

    cursor = page.nextCursor;
    pageCount += 1;
  } while (syncState.highWaterId && cursor && !reachedKnownItem && pageCount < maximumIncrementalPages);

  const newestId = maxId(fetchedIds);
  if (newestId && (!syncState.highWaterId || compareIds(newestId, syncState.highWaterId) > 0)) {
    writeSyncState({
      signature,
      highWaterId: newestId
    });
  }
  else if (syncState.signature !== signature) {
    writeSyncState({
      signature,
      highWaterId: syncState.highWaterId || null
    });
  }

  return dedupeTweets(tweets).map(tweetToItem);
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

async function graphqlGet(action, queryId, variables, features, fieldToggles, credentials) {
  const path = `/i/api/graphql/${queryId}/${action}`;
  const parameters = [
    ["variables", JSON.stringify(variables)]
  ];
  if (features) parameters.push(["features", JSON.stringify(features)]);
  if (fieldToggles) parameters.push(["fieldToggles", JSON.stringify(fieldToggles)]);

  const url = `${apiBase}/${queryId}/${action}?${encodeQuery(parameters)}`;
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const headers = await graphQlHeaders("GET", path, credentials);
    let text;
    try {
      text = await requestText(url, "GET", null, headers);
      return parseGraphqlResponse(text, action);
    }
    catch (error) {
      lastError = error;
      if (attempt === 0 && isTransactionRetryableError(error)) {
        clearTransactionCache();
        continue;
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

async function requestText(url, method, body, headers) {
  let text;
  try {
    text = await sendRequest(url, method, body, headers, true);
  }
  catch (error) {
    throw normalizedRequestError(error);
  }

  const wrapped = statusWrappedResponse(text);
  if (wrapped) {
    if (wrapped.status >= 400) throw statusError(wrapped.status, wrapped.body, wrapped.headers);
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

function statusError(status, body, headers) {
  let message = `X returned HTTP ${status}.`;
  if (status === 400) {
    message = "X rejected the SearchTimeline request. The query ID may have rotated; update SearchTimeline Query ID.";
  }
  else if (status === 401 || status === 403) {
    message = "X rejected the session cookies. Refresh auth_token and ct0 from a logged-in x.com session.";
  }
  else if (status === 429) {
    const retryAfter = headerValue(headers, "retry-after");
    const reset = headerValue(headers, "x-rate-limit-reset");
    message = retryAfter
      ? `X rate limit reached. Try again in ${retryAfter} seconds.`
      : reset
        ? `X rate limit reached. Try again after ${new Date(Number(reset) * 1000).toISOString()}.`
        : "X rate limit reached. Try again later.";
  }

  const detail = firstGraphqlErrorMessage(body);
  if (detail && status !== 401 && status !== 403) message += ` ${detail}`;

  const error = new Error(message);
  error.xStatus = status;
  return error;
}

function normalizedRequestError(error) {
  const message = error && error.message ? error.message : String(error);
  if (/\b(401|403)\b/.test(message)) return statusError(401);
  if (/\b429\b/.test(message)) return statusError(429);
  if (/\b400\b/.test(message)) return statusError(400);
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
      message = `${message} The SearchTimeline query ID may have rotated.`;
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
  collectTweetFromItemContent(entry.content.itemContent, tweets);

  const items = Array.isArray(entry.content.items) ? entry.content.items : [];
  for (const item of items) {
    collectTweetFromItemContent(item && item.item && item.item.itemContent, tweets);
  }
}

function collectTweetFromItemContent(itemContent, tweets) {
  const result = itemContent && itemContent.tweet_results && itemContent.tweet_results.result;
  const tweet = normalizeTweet(result, true);
  if (tweet) tweets.push(tweet);
}

function normalizeTweet(rawResult, includeQuoted) {
  const result = unwrapTweetResult(rawResult);
  const legacy = result && result.legacy;
  if (!result || !legacy) return null;

  const id = legacy.id_str || result.rest_id;
  if (!id) return null;

  const user = normalizeUser(result.core && result.core.user_results && result.core.user_results.result);
  const date = tweetDate(legacy.created_at);
  const media = extractMedia(result, legacy);
  const externalUrls = dedupeStrings(extractExternalUrls(result, legacy));
  const note = result.note_tweet
    && result.note_tweet.note_tweet_results
    && result.note_tweet.note_tweet_results.result;
  const text = expandedTweetText(legacy.full_text || "", legacy.entities, note);
  const quotedRaw = result.quoted_status_result && result.quoted_status_result.result;
  const quoted = includeQuoted && quotedRaw ? normalizeTweet(quotedRaw, false) : null;

  return {
    id,
    text,
    date,
    url: user.username ? `https://x.com/${user.username}/status/${id}` : `https://x.com/i/web/status/${id}`,
    authorName: user.name || user.username || "X",
    authorUsername: user.username || null,
    authorAvatar: user.avatar || null,
    likes: finiteNumber(legacy.favorite_count),
    reposts: finiteNumber(legacy.retweet_count),
    replies: finiteNumber(legacy.reply_count),
    quotes: finiteNumber(legacy.quote_count),
    views: finiteNumber(result.views && result.views.count),
    media,
    externalUrls,
    isReply: Boolean(legacy.in_reply_to_status_id_str || legacy.in_reply_to_user_id_str),
    isRetweet: Boolean(legacy.retweeted_status_result || /^RT @/.test(legacy.full_text || "")),
    quoted
  };
}

function unwrapTweetResult(result) {
  if (!result || typeof result !== "object") return null;
  if (result.tweet && result.tweet.legacy) return result.tweet;
  if (result.result && result.result.legacy) return result.result;
  return result;
}

function normalizeUser(rawUser) {
  const user = rawUser && rawUser.result ? rawUser.result : rawUser;
  const core = user && user.core ? user.core : {};
  const legacy = user && user.legacy ? user.legacy : {};
  const username = core.screen_name || legacy.screen_name || null;
  const name = core.name || legacy.name || username;
  const avatar = normalizedAvatar(
    core.profile_image_url
    || core.profile_image_url_https
    || legacy.profile_image_url_https
    || legacy.profile_image_url
  );
  return { username, name, avatar };
}

function expandedTweetText(fullText, legacyEntities, note) {
  let text = note && note.text ? note.text : fullText;
  const mappings = [];
  mappings.push(...urlMappings(legacyEntities && legacyEntities.urls));
  if (note && note.entity_set) mappings.push(...urlMappings(note.entity_set.urls));
  mappings.sort((left, right) => right.source.length - left.source.length);

  for (const mapping of mappings) {
    if (!mapping.source || !mapping.expanded) continue;
    text = text.split(mapping.source).join(mapping.expanded);
  }

  return text || "";
}

function urlMappings(urls) {
  if (!Array.isArray(urls)) return [];
  return urls.map(url => ({
    source: url && url.url ? String(url.url) : "",
    expanded: url && (url.expanded_url || url.url) ? String(url.expanded_url || url.url) : ""
  })).filter(mapping => mapping.source && mapping.expanded);
}

function extractExternalUrls(result, legacy) {
  const urls = [];
  const entities = legacy && legacy.entities ? legacy.entities : {};
  const note = result && result.note_tweet
    && result.note_tweet.note_tweet_results
    && result.note_tweet.note_tweet_results.result;
  for (const mapping of urlMappings(entities.urls)) {
    if (isExternalWebUrl(mapping.expanded)) urls.push(mapping.expanded);
  }
  if (note && note.entity_set) {
    for (const mapping of urlMappings(note.entity_set.urls)) {
      if (isExternalWebUrl(mapping.expanded)) urls.push(mapping.expanded);
    }
  }
  return urls;
}

function extractMedia(result, legacy) {
  const media = [];
  const extended = legacy && legacy.extended_entities && Array.isArray(legacy.extended_entities.media)
    ? legacy.extended_entities.media
    : null;
  const direct = legacy && legacy.entities && Array.isArray(legacy.entities.media)
    ? legacy.entities.media
    : null;
  const entries = extended || direct || [];

  for (const entry of entries) {
    const item = mediaFromEntity(entry);
    if (item) media.push(item);
  }

  return dedupeBy(media, item => item.url);
}

function mediaFromEntity(entry) {
  if (!entry || typeof entry !== "object") return null;
  let url = null;
  let type = entry.type || "photo";

  if (type === "photo") {
    url = entry.media_url_https || entry.media_url;
  }
  else if ((type === "video" || type === "animated_gif") && entry.video_info) {
    const variants = Array.isArray(entry.video_info.variants) ? entry.video_info.variants : [];
    const mp4s = variants
      .filter(variant => variant && variant.url && /video\/mp4/i.test(variant.content_type || ""))
      .sort((left, right) => finiteNumber(right.bitrate) - finiteNumber(left.bitrate));
    if (mp4s.length > 0) url = mp4s[0].url;
  }

  if (!isWebUrl(url)) return null;

  const original = entry.original_info || {};
  return {
    url,
    type,
    width: finiteNumber(original.width),
    height: finiteNumber(original.height),
    altText: entry.ext_alt_text || entry.alt_text || null
  };
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
  item.body = tweetBody(tweet);

  const identity = Identity.createWithName(tweet.authorName || "X");
  identity.uri = tweet.authorUsername ? `https://x.com/${tweet.authorUsername}` : "https://x.com";
  if (tweet.authorUsername) identity.username = `@${tweet.authorUsername}`;
  if (tweet.authorAvatar) identity.avatar = tweet.authorAvatar;
  item.author = identity;

  const annotations = tweetAnnotations(tweet);
  if (annotations.length > 0) item.annotations = annotations;

  const attachments = tweetAttachments(tweet);
  if (attachments.length > 0) item.attachments = attachments;

  return item;
}

function tweetBody(tweet) {
  let body = `<p>${linkifiedText(tweet.text || "")}</p>`;
  if (tweet.quoted) {
    const quotedName = tweet.quoted.authorName || tweet.quoted.authorUsername || "X";
    body += `<blockquote><strong>${escapeHtml(quotedName)}:</strong> ${linkifiedText(tweet.quoted.text || "")}</blockquote>`;
  }
  body += `<p><a href="${escapeAttribute(tweet.url)}">Open on X</a></p>`;
  return body;
}

function tweetAnnotations(tweet) {
  const annotations = [];
  const details = [];
  if (tweet.isReply) details.push("Reply");
  if (tweet.isRetweet) details.push("Repost");
  if (showMetrics()) {
    if (tweet.replies > 0) details.push(`${formatCount(tweet.replies)} replies`);
    if (tweet.reposts > 0) details.push(`${formatCount(tweet.reposts)} reposts`);
    if (tweet.quotes > 0) details.push(`${formatCount(tweet.quotes)} quotes`);
    if (tweet.likes > 0) details.push(`${formatCount(tweet.likes)} likes`);
    if (tweet.views > 0) details.push(`${formatCount(tweet.views)} views`);
  }
  if (details.length > 0) annotations.push(Annotation.createWithText(details.join(" - ")));
  return annotations;
}

function tweetAttachments(tweet) {
  const attachments = [];
  if (showMedia() && typeof MediaAttachment !== "undefined" && tweet.media.length > 0) {
    for (const media of tweet.media.slice(0, 4)) {
      const attachment = MediaAttachment.createWithUrl(media.url);
      if (media.width > 0 && media.height > 0) {
        attachment.aspectSize = { width: media.width, height: media.height };
      }
      attachment.text = media.altText || `Media from ${tweet.authorName || "X"}`;
      attachments.push(attachment);
    }
    return attachments;
  }

  if (showLinkCards() && typeof LinkAttachment !== "undefined" && tweet.externalUrls.length > 0) {
    const url = tweet.externalUrls[0];
    const attachment = LinkAttachment.createWithUrl(url);
    attachment.type = "website";
    attachment.title = urlHost(url) || "Link";
    attachment.subtitle = tweet.text || "";
    if (tweet.media.length > 0) attachment.image = tweet.media[0].url;
    attachments.push(attachment);
  }

  return attachments;
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
    includeReplies: includeReplies(),
    includeRetweets: includeRetweets(),
    showMetrics: showMetrics(),
    showMedia: showMedia(),
    showLinkCards: showLinkCards(),
    batchSize: normalizedBatchSize(),
    queryId: normalizedSearchQueryId(),
    transactionHeader: useTransactionHeader()
  });
}

function newSyncState(signature) {
  return {
    signature,
    highWaterId: null
  };
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

function writeSyncState(state) {
  safeSetItem(syncStateKey, JSON.stringify(state));
}

function buildSearchQuery() {
  const mode = normalizedSourceMode();
  const input = stringInput("x_sources").trim();
  if (!input) {
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
  if (normalizedSourceMode() === "search query") return "Search";
  const handles = normalizedHandles();
  if (handles.length === 0) return "Handles";
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
  return value === "search query" ? "search query" : "handles";
}

function normalizedSearchProduct() {
  const value = normalizedChoice(stringInput("search_product"));
  return value === "top" ? "Top" : "Latest";
}

function normalizedBatchSize() {
  const value = parseInt(stringInput("batch_size"), 10);
  return [20, 50, 100].includes(value) ? value : 50;
}

function normalizedSearchQueryId() {
  const value = stringInput("search_query_id").trim();
  return value || defaultSearchTimelineQueryId;
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

function formatCount(value) {
  const number = finiteNumber(value);
  return number.toLocaleString("en-US");
}

function normalizedAvatar(value) {
  if (!isWebUrl(value)) return null;
  return String(value).replace("_normal.", "_400x400.");
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

function linkifiedText(value) {
  const text = String(value || "");
  const regex = /(https?:\/\/[^\s<]+)/g;
  let html = "";
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    html += escapeHtml(text.slice(lastIndex, match.index));
    const url = match[0];
    html += `<a href="${escapeAttribute(url)}">${escapeHtml(displayUrl(url))}</a>`;
    lastIndex = match.index + url.length;
  }
  html += escapeHtml(text.slice(lastIndex));
  return html.replace(/\n/g, "<br>");
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
