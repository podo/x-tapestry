// local.x.timeline
// Transaction-id generation is adapted from x-agent-sdk's MIT-licensed implementation.

const apiBase = "https://x.com/i/api/graphql";
const xHomeUrl = "https://x.com/";
const xIconUrl = "https://x.com/favicon.ico";
const defaultHomeLatestTimelineQueryId = "0dateTVgvXjpkf7kyBZy0g";
const defaultHomeTimelineQueryId = "7zlnp2TxC044W4C1ZUJMHw";
const defaultBookmarksQueryId = "XD0ViOeSOW4YoeNTGjVaYw";
const defaultListLatestTweetsTimelineQueryId = "FVWmROVvhgjRPC-4jAUh8A";
const defaultNotificationsTimelineQueryId = "gzC0OYBCnfdYS4M4Gue7BA";
const defaultSearchTimelineQueryId = "Yw6L66Pw54NHKuq4Dp7b4Q";
const defaultUserByScreenNameQueryId = "IGgvgiOx4QZndDHuD3x9TQ";
const defaultUserTweetsQueryId = "36rb3Xj3iJ64Q-9wKDjCcQ";
const defaultUserByRestIdQueryId = "DaeC_2LfMgwCujE03HSZtw";
const fallbackUserByRestIdQueryIds = ["xvmVfRLmnr1alc5f2dib0Q"];
const fxTwitterProfileBase = "https://api.fxtwitter.com/2/profile";
const fxTwitterStatusBase = "https://api.fxtwitter.com";
const defaultTweetDetailQueryId = "oCon7R-cgWRFy6EfZjaKfg";
const defaultFavoriteTweetQueryId = "lI07N6Otwv1PhnEgXILM7A";
const defaultUnfavoriteTweetQueryId = "ZYKSe-w7KEslx3JhSIk5LA";
const defaultCreateRetweetQueryId = "ojPdsZsimiJrUGLR1sjUtA";
const defaultDeleteRetweetQueryId = "iQtK4dl5hBmXewYZuEOKVw";
const defaultCreateBookmarkQueryId = "aoDbu3RHznuiSkQ9aNM67Q";
const defaultDeleteBookmarkQueryId = "Wlmlj2-xzyS1GN3a6cj-mQ";
const defaultBearerToken = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const browserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const accountSettingsUrl = "https://x.com/i/api/1.1/account/settings.json?include_mention_filter=true&include_nsfw_user_flag=true&include_nsfw_admin_flag=true&include_ranked_timeline=true&include_alt_text_compose=true";
const syncStateKey = "syncStateV20";
const connectorBuildId = "2026-09-01T07:05Z-1.4.11-swipe-thread";
const connectorRelease = "1.4.11";
const connectorPluginVersion = 65;
const transactionCacheKey = "transactionCacheV1";
const queryIdCacheKey = "queryIdCacheV1";
const linkPreviewCacheKey = "linkPreviewCacheV1";
const avatarCacheKey = "avatarCacheV1";
const cardCacheKey = "cardCacheV1";
const transactionCacheTtlMilliseconds = 15 * 60 * 1000;
const queryIdCacheTtlMilliseconds = 24 * 60 * 60 * 1000;
const linkPreviewCacheTtlMilliseconds = 7 * 24 * 60 * 60 * 1000;
const maximumLinkPreviewBytes = 256 * 1024;
const maximumLinkPreviewCacheEntries = 100;
const maximumIncrementalPages = 5;
const maximumEnrichmentConcurrency = 6;
const maximumTweetDetailFetchesPerLoad = 24;
const loadTimeBudgetMilliseconds = 52 * 1000;
const cardUpdateUrl = "https://x.com/i/cards/card_update";
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
  subscriptions_feature_can_gift_premium: false,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true
};

const userByScreenNameFieldToggles = {
  withAuxiliaryUserLabels: true
};

const userTimelineFieldToggles = {
  withArticlePlainText: false
};

function logConnectorBuild(phase) {
  console.log(
    `[local.x.timeline] ${phase}`
    + ` build=${connectorBuildId}`
    + ` release=${connectorRelease}`
    + ` plugin=${connectorPluginVersion}`
    + ` avatars=embedded-data-url`
    + ` entryStamp=actions._connectorBuild+body-comment`
  );
}

function connectorEntryStamp() {
  return `${connectorBuildId}@plugin${connectorPluginVersion}@${connectorRelease}`;
}

function describeAvatarState(value) {
  if (value == null || value === "") return "missing";
  const raw = String(value);
  if (raw.startsWith("data:image/")) return `data:${raw.length}`;
  try {
    const host = new URL(raw).host;
    return host ? `url:${host.replace(/^www\./, "")}` : "invalid";
  }
  catch (error) {
    const permissive = permissiveTwimgAvatar(raw);
    if (permissive) {
      const host = urlHost(permissive);
      return host ? `url:${host}` : "url:twimg";
    }
    return "invalid";
  }
}

function usableAvatarUrl(value) {
  if (value == null || value === "") return null;
  const raw = String(value);
  if (raw.startsWith("data:image/")) return raw;
  if (describeAvatarState(raw) === "invalid") return null;
  return normalizedAvatar(raw) || permissiveTwimgAvatar(raw);
}

function attachAvatarDiagnostics(actions, tweet, identity) {
  actions._authorAvatarInput = describeAvatarState(tweet && tweet.authorAvatar);
  actions._authorAvatarAssigned = describeAvatarState(identity && identity.avatar);
  if (tweet && tweet._authorAvatarLookup) actions._authorAvatarLookup = tweet._authorAvatarLookup;
  if (tweet && tweet.authorAvatarRaw) actions._timelineAvatarRaw = tweet.authorAvatarRaw;
  return actions;
}

function attachItemDiagnostics(actions, tweet, identity, bodyHtml) {
  attachAvatarDiagnostics(actions, tweet, identity);
  if (tweet && tweet._linkCardLookup) actions._linkCardLookup = tweet._linkCardLookup;
  actions._linkCardInput = describeLinkCardState(tweet);
  if (tweet && tweet._mediaLookup) actions._mediaLookup = tweet._mediaLookup;
  const html = String(bodyHtml || "");
  actions._bodyAnchorCount = String((html.match(/<a\s/gi) || []).length);
  ensureTweetExternalUrls(tweet);
  actions._externalUrlCount = String((tweet.externalUrls || []).length);
  actions._urlApi = urlApiStatus();
  return actions;
}

function describeLinkCardState(tweet) {
  const card = linkCardForTweet(tweet);
  if (!card) return "none";
  const parts = [];
  if (card.title) parts.push("title");
  if (card.subtitle) parts.push("subtitle");
  if (card.image) {
    parts.push(String(card.image).startsWith("data:image/") ? "image-data" : "image-url");
  }
  if (card.siteName) parts.push("site");
  return parts.length > 0 ? parts.join("+") : "url-only";
}

function connectorDebugBodySuffix() {
  return `<!-- local.x.timeline ${connectorEntryStamp()} -->`;
}

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
  if (actionId === "thread") {
    const value = parseActionValue(actionValue);
    const tweetId = value.tweetId || tweetIdFromUrl(value.url) || tweetIdFromUrl(item && item.uri);
    if (!tweetId) throw new Error("Could not determine the X post ID for this thread.");

    const credentials = normalizedCredentials();
    return tweetDetailItems(tweetId, credentials, { order: "oldest" });
  }

  if (actionId === "openLink") {
    return item;
  }

  if (actionId === "openQuote") {
    const value = parseActionValue(actionValue);
    const tweetId = value.tweetId || tweetIdFromUrl(value.url) || tweetIdFromUrl(item && item.uri);
    if (!tweetId) throw new Error("Could not determine the quoted X post ID.");
    const credentials = normalizedCredentials();
    return tweetDetailItems(tweetId, credentials);
  }

  if (actionId === "votePoll") {
    return performPollVoteAction(actionValue, item);
  }

  if (
    actionId === "like"
    || actionId === "unlike"
    || actionId === "repost"
    || actionId === "unrepost"
    || actionId === "bookmark"
    || actionId === "unbookmark"
  ) {
    return performEngagementAction(actionId, actionValue, item);
  }

  throw new Error(`Unsupported X action: ${actionId}`);
}

async function performEngagementAction(actionId, actionValue, item) {
  const value = parseActionValue(actionValue);
  const tweetId = value.tweetId || tweetIdFromUrl(value.url) || tweetIdFromUrl(item && item.uri);
  if (!tweetId) throw new Error("Could not determine the X post ID for this action.");

  const credentials = normalizedCredentials();
  const mutation = engagementMutationForAction(actionId);
  await graphqlPost(
    mutation.action,
    engagementQueryId(mutation.action),
    mutation.variables(tweetId),
    null,
    null,
    credentials
  );

  return updateItemEngagementState(item, actionId, tweetId);
}

function engagementMutationForAction(actionId) {
  if (actionId === "like") {
    return {
      action: "FavoriteTweet",
      variables: tweetId => ({ tweet_id: String(tweetId) })
    };
  }
  if (actionId === "unlike") {
    return {
      action: "UnfavoriteTweet",
      variables: tweetId => ({ tweet_id: String(tweetId) })
    };
  }
  if (actionId === "repost") {
    return {
      action: "CreateRetweet",
      variables: tweetId => ({ tweet_id: String(tweetId), dark_request: false })
    };
  }
  if (actionId === "unrepost") {
    return {
      action: "DeleteRetweet",
      variables: tweetId => ({ source_tweet_id: String(tweetId), dark_request: false })
    };
  }
  if (actionId === "bookmark") {
    return {
      action: "CreateBookmark",
      variables: tweetId => ({ tweet_id: String(tweetId) })
    };
  }
  if (actionId === "unbookmark") {
    return {
      action: "DeleteBookmark",
      variables: tweetId => ({ tweet_id: String(tweetId) })
    };
  }
  throw new Error(`Unsupported engagement action: ${actionId}`);
}

function engagementQueryId(action) {
  const cached = readQueryIdCache(action);
  if (cached) return cached;
  if (action === "FavoriteTweet") return defaultFavoriteTweetQueryId;
  if (action === "UnfavoriteTweet") return defaultUnfavoriteTweetQueryId;
  if (action === "CreateRetweet") return defaultCreateRetweetQueryId;
  if (action === "DeleteRetweet") return defaultDeleteRetweetQueryId;
  if (action === "CreateBookmark") return defaultCreateBookmarkQueryId;
  if (action === "DeleteBookmark") return defaultDeleteBookmarkQueryId;
  return "";
}

function updateItemEngagementState(item, actionId, tweetId) {
  const actions = { ...(item.actions || {}) };
  const payload = JSON.stringify({
    tweetId: String(tweetId),
    url: item && item.uri ? item.uri : ""
  });

  if (actionId === "like") {
    delete actions.like;
    actions.unlike = payload;
  }
  else if (actionId === "unlike") {
    delete actions.unlike;
    actions.like = payload;
  }
  else if (actionId === "repost") {
    delete actions.repost;
    actions.unrepost = payload;
  }
  else if (actionId === "unrepost") {
    delete actions.unrepost;
    actions.repost = payload;
  }
  else if (actionId === "bookmark") {
    delete actions.bookmark;
    actions.unbookmark = payload;
  }
  else if (actionId === "unbookmark") {
    delete actions.unbookmark;
    actions.bookmark = payload;
  }

  item.actions = actions;
  item.body = adjustEngagementBodyMetrics(item.body, actionId);
  return item;
}

function adjustEngagementBodyMetrics(body, actionId) {
  const html = String(body || "");
  const match = html.match(/<p class="x-meta-metrics">([\s\S]*?)<\/p>/i);
  if (!match) return body;

  const inner = String(match[1] || "").replace(/<\/?small>/gi, "");
  const metrics = parseMetricsAnnotation({ text: htmlDecode(inner) });
  if (!metrics) return body;

  if (actionId === "like") metrics.likes += 1;
  else if (actionId === "unlike") metrics.likes = Math.max(0, metrics.likes - 1);
  else if (actionId === "repost") metrics.reposts += 1;
  else if (actionId === "unrepost") metrics.reposts = Math.max(0, metrics.reposts - 1);
  else return body;

  const nextText = metricsTextFromCounts(metrics);
  if (!nextText) {
    return html.replace(match[0], "");
  }
  return html.replace(match[0], metricsMetaHtml(nextText));
}

function adjustEngagementAnnotations(annotations, actionId) {
  if (!Array.isArray(annotations) || annotations.length === 0) return annotations;

  const metrics = parseMetricsAnnotation(annotations[annotations.length - 1]);
  if (!metrics) return annotations;

  if (actionId === "like") metrics.likes += 1;
  else if (actionId === "unlike") metrics.likes = Math.max(0, metrics.likes - 1);
  else if (actionId === "repost") metrics.reposts += 1;
  else if (actionId === "unrepost") metrics.reposts = Math.max(0, metrics.reposts - 1);

  const next = annotations.slice();
  next[next.length - 1] = metricsAnnotationFromCounts(metrics);
  return next;
}

function parseMetricsAnnotation(annotation) {
  if (!annotation || typeof annotation.text !== "string") return null;
  const text = annotation.text;
  const metrics = { replies: 0, reposts: 0, quotes: 0, likes: 0, views: 0, hasViews: false };

  const replies = text.match(/([\d,.]+[KMB]?)\s+repl(?:y|ies)/i);
  if (replies) metrics.replies = parseCountToken(replies[1]);

  const reposts = text.match(/([\d,.]+[KMB]?)\s+reposts?/i);
  if (reposts) metrics.reposts = parseCountToken(reposts[1]);

  const quotes = text.match(/([\d,.]+[KMB]?)\s+quotes?/i);
  if (quotes) metrics.quotes = parseCountToken(quotes[1]);

  const likes = text.match(/([\d,.]+[KMB]?)\s+likes?/i);
  if (likes) metrics.likes = parseCountToken(likes[1]);

  const views = text.match(/([\d,.]+[KMB]?)\s+views?/i);
  if (views) {
    metrics.views = parseCountToken(views[1]);
    metrics.hasViews = true;
  }

  if (!replies && !reposts && !quotes && !likes && !views) return null;
  return metrics;
}

function metricsAnnotationFromCounts(metrics) {
  return Annotation.createWithText(metricsTextFromCounts(metrics));
}

function metricsTextFromCounts(metrics) {
  const details = [];
  if (metrics.replies > 0) details.push(`${formatCount(metrics.replies)} ${metrics.replies === 1 ? "reply" : "replies"}`);
  if (metrics.reposts > 0) details.push(`${formatCount(metrics.reposts)} reposts`);
  if (metrics.quotes > 0) details.push(`${formatCount(metrics.quotes)} quotes`);
  if (metrics.likes > 0) details.push(`${formatCount(metrics.likes)} likes`);
  if (metrics.hasViews && metrics.views > 0) details.push(`${formatCount(metrics.views)} views`);
  return details.join(" - ");
}

function parseCountToken(value) {
  const normalized = String(value || "").replace(/,/g, "").trim();
  const match = normalized.match(/^([\d.]+)([KMB])?$/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;
  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "K") return Math.round(amount * 1000);
  if (suffix === "M") return Math.round(amount * 1000000);
  if (suffix === "B") return Math.round(amount * 1000000000);
  return Math.round(amount);
}

async function verifyAsync() {
  logConnectorBuild("verify");
  const credentials = normalizedCredentials();
  const result = {
    displayName: feedDisplayName(),
    icon: xIconUrl
  };

  await assertSessionHealthy(credentials);

  const mode = normalizedSourceMode();
  if (mode === "following" || mode === "for_you") {
    await homeFeedPage(mode, 1, null, credentials);
  }
  else if (mode === "bookmarks") {
    await bookmarksTimelinePage(1, null, credentials);
  }
  else if (mode === "list") {
    await listTimelinePage(normalizedListId(), 1, null, credentials);
  }
  else if (mode === "mentions") {
    await mentionsTimelinePage(1, null, credentials);
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
      result.displayName = `X · @${profiles[0].username || handles[0]}`;
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
  logConnectorBuild("load");
  resetLoadCycleCaches();
  const credentials = normalizedCredentials();
  await assertSessionHealthy(credentials);
  const mode = normalizedSourceMode();
  if (mode === "following" || mode === "for_you") {
    return loadHomeFeedTimeline(mode, credentials);
  }
  if (mode === "bookmarks") {
    return loadCursorFeedTimeline("bookmarks", (limit, cursor) => bookmarksTimelinePage(limit, cursor, credentials), credentials);
  }
  if (mode === "list") {
    const listId = normalizedListId();
    return loadCursorFeedTimeline(`list:${listId}`, (limit, cursor) => listTimelinePage(listId, limit, cursor, credentials), credentials);
  }
  if (mode === "mentions") {
    return loadCursorFeedTimeline("mentions", (limit, cursor) => mentionsTimelinePage(limit, cursor, credentials), credentials);
  }
  if (mode === "handles") {
    return loadHandleTimelines(credentials);
  }
  return loadSearchTimeline(credentials);
}

async function loadHomeFeedTimeline(mode, credentials) {
  const syncKey = mode === "for_you" ? "for_you" : "following";
  return loadCursorFeedTimeline(syncKey, (limit, cursor, state) => {
    const seen = mode === "for_you" ? (state.seenTweetIdsBySource && state.seenTweetIdsBySource[syncKey]) || [] : [];
    return homeFeedPage(mode, limit, cursor, credentials, seen);
  }, credentials, { trackSeenForYou: mode === "for_you" });
}

async function loadCursorFeedTimeline(syncKey, pageFn, credentials, options = {}) {
  const signature = currentSyncSignature(syncKey);
  const syncState = syncStateForSignature(signature);
  const highWaterId = syncHighWater(syncState, syncKey);

  const limit = normalizedBatchSize();
  const tweets = [];
  const fetchedIds = [];
  let cursor = null;
  let pageCount = 0;
  let reachedKnownItem = false;

  do {
    const page = await pageFn(limit, cursor, syncState);
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
  if (options.trackSeenForYou) {
    if (!syncState.seenTweetIdsBySource) syncState.seenTweetIdsBySource = {};
    syncState.seenTweetIdsBySource[syncKey] = fetchedIds.slice(0, 40);
  }

  writeSyncState(syncState);
  return tweetsToItems(tweets, credentials);
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
  return tweetsToItems(tweets, credentials);
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
  return tweetsToItems(tweets, credentials);
}

let loadAvatarCache = null;
let loadAvatarDataUrlCache = null;
let profileLookupCache = null;
let loadCycleStartedAt = 0;
let loadTweetDetailCache = null;
let loadTweetDetailFetchCount = 0;

function resetAvatarCache() {
  loadAvatarCache = new Map();
  loadAvatarDataUrlCache = new Map();
  profileLookupCache = new Map();
}

function resetLoadCycleCaches() {
  loadCycleStartedAt = Date.now();
  loadTweetDetailCache = new Map();
  loadTweetDetailFetchCount = 0;
}

function loadBudgetExceeded() {
  return loadCycleStartedAt > 0 && (Date.now() - loadCycleStartedAt) >= loadTimeBudgetMilliseconds;
}

function canFetchTweetDetail() {
  return loadTweetDetailFetchCount < maximumTweetDetailFetchesPerLoad && !loadBudgetExceeded();
}

function shortRequestError(error) {
  if (!error) return "unknown";
  const status = error.status || error.statusCode;
  if (status) return String(status);
  const message = String(error.message || error).trim();
  return message ? message.slice(0, 48).replace(/\s+/g, "-") : "unknown";
}

async function resolveAvatarForUsername(username, credentials, restId) {
  const handle = sanitizeHandle(username);
  if (!handle) return { avatar: null, lookup: "no-username" };
  if (!credentials) return { avatar: null, lookup: "profile-skipped-no-creds" };
  if (!loadAvatarCache) resetAvatarCache();
  if (loadAvatarCache.has(handle)) {
    return {
      avatar: loadAvatarCache.get(handle),
      lookup: profileLookupCache.get(handle) || "profile-cache"
    };
  }

  const persisted = persistedAvatarForHandle(handle);
  if (persisted) {
    loadAvatarCache.set(handle, persisted.avatar);
    profileLookupCache.set(handle, persisted.lookup || "profile-persisted");
    return { avatar: persisted.avatar, lookup: persisted.lookup || "profile-persisted" };
  }

  let lookup = "profile-miss";
  let avatar = null;
  let graphqlProfile = null;

  try {
    graphqlProfile = await userProfileByHandle(handle, credentials);
    if (graphqlProfile && graphqlProfile.avatar) {
      avatar = graphqlProfile.avatar;
      lookup = "profile+graphql";
    }
    else {
      lookup = "profile-miss:graphql-empty";
    }
  }
  catch (error) {
    lookup = `profile-miss:graphql-${shortRequestError(error)}`;
  }

  const targetRestId = restId || (graphqlProfile && graphqlProfile.id);
  if (!avatar && targetRestId) {
    try {
      const restProfile = await userProfileByRestId(targetRestId, credentials);
      if (restProfile && restProfile.avatar) {
        avatar = restProfile.avatar;
        lookup = graphqlProfile ? "profile+restid" : "profile+restid-only";
      }
      else if (lookup === "profile-miss:graphql-empty") {
        lookup = "profile-miss:restid-empty";
      }
    }
    catch (error) {
      lookup = lookup.startsWith("profile-miss:graphql")
        ? `${lookup}+restid-${shortRequestError(error)}`
        : `profile-miss:restid-${shortRequestError(error)}`;
    }
  }

  if (!avatar) {
    const xAvatar = await avatarFromXProfilePage(handle, credentials);
    if (xAvatar) {
      avatar = xAvatar;
      lookup = "profile+xcom";
    }
    else if (lookup.startsWith("profile-miss")) {
      lookup = `${lookup}+xcom-miss`;
    }
  }

  if (!avatar) {
    const fxAvatar = await avatarFromFxTwitter(handle);
    if (fxAvatar) {
      avatar = fxAvatar;
      lookup = "profile+fxtwitter";
    }
    else if (lookup.startsWith("profile-miss")) {
      lookup = `${lookup}+fxtwitter-miss`;
    }
  }

  if (avatar) {
    loadAvatarCache.set(handle, avatar);
    profileLookupCache.set(handle, lookup);
    writePersistedAvatarEntry(handle, avatar, lookup);
  }
  return { avatar, lookup };
}

async function avatarFromXProfilePage(handle, credentials) {
  const username = sanitizeHandle(handle);
  if (!username) return null;

  try {
    const headers = {
      "User-Agent": browserUserAgent,
      "Accept": "text/html,application/xhtml+xml"
    };
    if (credentials && credentials.cookie) headers.Cookie = credentials.cookie;

    const text = await sendRequest(
      `https://x.com/${encodeURIComponent(username)}`,
      "GET",
      null,
      headers,
      true
    );
    const html = responseText(text);
    if (!html) return null;

    const patterns = [
      /"profile_image_url_https"\s*:\s*"([^"\\]+)/,
      /"profile_image_url"\s*:\s*"([^"\\]+)/,
      /https:\\\\\/\\\\\/pbs\.twimg\.com\\\\\/profile_images\\\\\/[^"\\]+/,
      /https:\/\/pbs\.twimg\.com\/profile_images\/[^\s"'\\]+/i,
      /pbs\.twimg\.com\/profile_images\/[^\s"'\\]+/i
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match) continue;
      const candidate = match[1] || match[0];
      const avatar = normalizedAvatar(candidate.replace(/\\\/\//g, "/").replace(/\\\//g, "/"));
      if (avatar) return avatar;
    }
    return null;
  }
  catch (error) {
    return null;
  }
}

function responseText(text) {
  const wrapped = statusWrappedResponse(text);
  if (!wrapped) return String(text || "");
  if (wrapped.status >= 400) return "";
  if (typeof wrapped.body === "string") return wrapped.body;
  if (wrapped.body == null) return "";
  return JSON.stringify(wrapped.body);
}

function readPersistedAvatarCache() {
  try {
    const raw = getItem(avatarCacheKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  }
  catch (error) {
    return {};
  }
}

function writePersistedAvatarEntry(handle, avatar, lookup) {
  const key = sanitizeHandle(handle);
  if (!key || !avatar) return;

  const cache = readPersistedAvatarCache();
  cache[key.toLowerCase()] = {
    avatar,
    lookup: lookup || "profile-cache",
    at: Date.now()
  };

  const keys = Object.keys(cache);
  if (keys.length > 500) {
    keys.sort((left, right) => (cache[left].at || 0) - (cache[right].at || 0));
    for (let index = 0; index < keys.length - 500; index += 1) {
      delete cache[keys[index]];
    }
  }

  setItem(avatarCacheKey, JSON.stringify(cache));
}

function persistedAvatarForHandle(handle) {
  const key = sanitizeHandle(handle);
  if (!key) return null;
  const entry = readPersistedAvatarCache()[key.toLowerCase()];
  if (!entry || !entry.avatar) return null;
  return entry;
}

async function avatarFromFxTwitter(handle) {
  const username = sanitizeHandle(handle);
  if (!username) return null;

  try {
    const text = await sendRequest(
      `${fxTwitterProfileBase}/${encodeURIComponent(username)}`,
      "GET",
      null,
      {
        "User-Agent": browserUserAgent,
        "Accept": "application/json"
      },
      true
    );
    const json = parseJsonResponse(text);
    if (json && json.code && Number(json.code) >= 400) return null;
    const user = json && json.user ? json.user : json;
    return normalizedAvatar(
      user && (user.avatar_url || user.profile_image_url_https || user.profile_image_url)
    );
  }
  catch (error) {
    return null;
  }
}

function parseJsonResponse(text) {
  const wrapped = statusWrappedResponse(text);
  const raw = wrapped
    ? (typeof wrapped.body === "string" ? wrapped.body : JSON.stringify(wrapped.body))
    : text;
  return JSON.parse(raw);
}

async function cachedAvatarForUsername(username, credentials, restId) {
  return (await resolveAvatarForUsername(username, credentials, restId)).avatar;
}

function shouldEmbedAvatarUrl(url) {
  const host = urlHost(url);
  return Boolean(host && /\.twimg\.com$/i.test(host));
}

async function avatarDataUrlForUrl(url) {
  const normalized = normalizedAvatar(url);
  if (!normalized || !shouldEmbedAvatarUrl(normalized)) return normalized;
  if (!loadAvatarDataUrlCache) resetAvatarCache();
  if (loadAvatarDataUrlCache.has(normalized)) return loadAvatarDataUrlCache.get(normalized);

  try {
    const text = await sendRequest(normalized, "GET", null, {
      "User-Agent": browserUserAgent,
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
    }, true);
    const wrapped = statusWrappedResponse(text);
    if (!wrapped || wrapped.status < 200 || wrapped.status >= 400 || !wrapped.body) {
      loadAvatarDataUrlCache.set(normalized, normalized);
      return normalized;
    }

    const contentType = headerValue(wrapped.headers, "content-type") || "image/jpeg";
    const mime = String(contentType).split(";")[0].trim() || "image/jpeg";
    const bytes = responseBodyBytes(wrapped);
    if (bytes.length === 0) {
      loadAvatarDataUrlCache.set(normalized, normalized);
      return normalized;
    }

    const dataUrl = `data:${mime};base64,${bytesToBase64(bytes)}`;
    loadAvatarDataUrlCache.set(normalized, dataUrl);
    return dataUrl;
  }
  catch (error) {
    loadAvatarDataUrlCache.set(normalized, normalized);
    return normalized;
  }
}

async function embedTweetAvatars(tweet) {
  if (!tweet) return;

  if (tweet.authorAvatar) {
    tweet.authorAvatar = await avatarDataUrlForUrl(tweet.authorAvatar);
  }
  if (tweet.repostedByAvatar) {
    tweet.repostedByAvatar = await avatarDataUrlForUrl(tweet.repostedByAvatar);
  }
  if (tweet.quoted) await embedTweetAvatars(tweet.quoted);
}

async function enrichTweetAuthor(tweet, credentials) {
  if (!tweet) return;

  if (!usableAvatarUrl(tweet.authorAvatar) && tweet.authorAvatarRaw) {
    tweet.authorAvatar = timelineAvatarFromHint(tweet.authorAvatarRaw);
  }

  if (usableAvatarUrl(tweet.authorAvatar)) {
    tweet._authorAvatarLookup = "timeline";
  }
  else if (!tweet.authorUsername) {
    tweet._authorAvatarLookup = "no-username";
  }
  else if (!credentials) {
    const xAvatar = await avatarFromXProfilePage(tweet.authorUsername, null);
    if (xAvatar) {
      tweet.authorAvatar = xAvatar;
      tweet._authorAvatarLookup = "xcom-no-creds";
    }
    else {
      const fxAvatar = await avatarFromFxTwitter(tweet.authorUsername);
      if (fxAvatar) {
        tweet.authorAvatar = fxAvatar;
        tweet._authorAvatarLookup = "fxtwitter-no-creds";
      }
      else {
        tweet._authorAvatarLookup = "profile-skipped-no-creds";
      }
    }
  }
  else {
    const resolved = await resolveAvatarForUsername(tweet.authorUsername, credentials, tweet.authorRestId);
    tweet.authorAvatar = resolved.avatar;
    const timelineHint = tweet.authorUserShape ? `timeline-miss:${tweet.authorUserShape}` : "timeline-miss";
    tweet._authorAvatarLookup = tweet.authorAvatar
      ? resolved.lookup
      : `${timelineHint}+${resolved.lookup}`;
  }

  if (!tweet.repostedByAvatar && tweet.repostedByUsername) {
    if (credentials) {
      tweet.repostedByAvatar = await cachedAvatarForUsername(
        tweet.repostedByUsername,
        credentials,
        tweet.repostedByRestId
      );
    }
    else {
      tweet.repostedByAvatar = await avatarFromFxTwitter(tweet.repostedByUsername);
    }
  }
  if (tweet.quoted) await enrichTweetAuthor(tweet.quoted, credentials);

  const beforeEmbed = tweet.authorAvatar;
  await embedTweetAvatars(tweet);
  if (beforeEmbed && tweet.authorAvatar && String(tweet.authorAvatar).startsWith("data:image/")) {
    tweet._authorAvatarLookup = `${tweet._authorAvatarLookup || "unknown"}+embed`;
    if (tweet.authorUsername) {
      writePersistedAvatarEntry(tweet.authorUsername, tweet.authorAvatar, tweet._authorAvatarLookup);
    }
  }
  else if (beforeEmbed && !tweet.authorAvatar) {
    tweet._authorAvatarLookup = `${tweet._authorAvatarLookup || "unknown"}+embed-lost`;
  }
}

async function tweetsToItems(tweets, credentials, options = {}) {
  resetAvatarCache();
  if (!loadCycleStartedAt) resetLoadCycleCaches();
  const deduped = dedupeTweets(tweets);
  const order = options && options.order === "oldest" ? "oldest" : "newest";
  const normalized = order === "oldest"
    ? sortTweetsOldestFirst(deduped)
    : sortTweetsNewestFirst(deduped);
  return mapPool(normalized, maximumEnrichmentConcurrency, async (tweet) => {
    await enrichTweetAuthor(tweet, credentials);
    await enrichTweetMedia(tweet, credentials);
    await embedTweetMediaThumbnails(tweet);
    await enrichTweetLinkCard(tweet, credentials);
    finalizeTweetPresentation(tweet);
    return tweetToItem(tweet);
  });
}

async function mapPool(items, concurrency, worker) {
  const list = Array.isArray(items) ? items : [];
  const limit = Math.max(1, Number(concurrency) || 1);
  const results = new Array(list.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < list.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(list[index], index);
    }
  }

  const runners = [];
  for (let i = 0; i < Math.min(limit, list.length); i += 1) runners.push(run());
  await Promise.all(runners);
  return results;
}

async function enrichTweetMedia(tweet, credentials) {
  if (!tweet) return;
  ensureMediaPlaceholderHiddenUrls(tweet);
  if (tweet.quoted) await enrichTweetMedia(tweet.quoted, credentials);
  if (!showMedia()) return;
  if (hasRenderableMedia(tweet) || !tweetNeedsMediaBackfill(tweet)) return;

  if (credentials && tweet.id) {
    try {
      const detailTweet = await loadTweetDetailForTweet(tweet, credentials);
      if (detailTweet && hasRenderableMedia(detailTweet)) {
        tweet.media = detailTweet.media;
        tweet.hiddenUrls = dedupeStrings((tweet.hiddenUrls || []).concat(detailTweet.hiddenUrls || []));
        tweet._mediaLookup = "tweetdetail";
        return;
      }
    }
    catch (error) {
      console.log(`Unable to backfill media from TweetDetail for ${tweet.id}: ${error.message || error}`);
    }
  }

  if (tweet.authorUsername && tweet.id && !loadBudgetExceeded()) {
    const fxMedia = await mediaFromFxTwitterStatus(tweet.authorUsername, tweet.id);
    if (fxMedia.length > 0) {
      tweet.media = fxMedia;
      tweet.hiddenUrls = dedupeStrings((tweet.hiddenUrls || []).concat(
        fxMedia.flatMap(item => item.hiddenUrls || []),
        placeholderUrlsFromTweetText(tweet.text)
      ));
      tweet._mediaLookup = "fxtwitter";
    }
  }

  if (hasRenderableMedia(tweet)) {
    tweet.hiddenUrls = dedupeStrings((tweet.hiddenUrls || []).concat(
      placeholderUrlsFromTweetText(tweet.text)
    ));
  }
}

function placeholderUrlsFromTweetText(text) {
  const urls = [];
  const value = String(text || "");
  for (const match of value.match(/https?:\/\/t\.co\/\w+/gi) || []) urls.push(match);
  for (const match of value.match(/(?<![/\w])t\.co\/\w+/gi) || []) {
    urls.push(match, `https://${match}`);
  }
  return urls;
}

function tweetHasMedia(tweet) {
  return Boolean(tweet && Array.isArray(tweet.media) && tweet.media.length > 0);
}

function tweetHasVideoMedia(tweet) {
  return Boolean(
    tweetHasMedia(tweet)
    && (tweet.media || []).some(item => item.type === "video" || item.type === "animated_gif")
  );
}

function ensureMediaPlaceholderHiddenUrls(tweet) {
  if (!tweetHasMedia(tweet) && !tweet._mediaLookup) return;
  tweet.hiddenUrls = dedupeStrings((tweet.hiddenUrls || []).concat(
    placeholderUrlsFromTweetText(tweet.text)
  ));
}

function finalizeTweetPresentation(tweet) {
  if (!tweet) return;
  if (tweet.quoted) finalizeTweetPresentation(tweet.quoted);
  ensureTweetExternalUrls(tweet);
}

function ensureTweetExternalUrls(tweet) {
  if (!tweet) return;
  tweet.externalUrls = dedupeStrings([
    ...(tweet.externalUrls || []),
    ...externalUrlsFromText(tweet.text)
  ]);
}

function externalUrlsFromText(text) {
  const urls = [];
  const value = normalizeTextForUrlMatching(text);
  for (const match of value.match(/https?:\/\/[^\s<]+/gi) || []) {
    const parts = splitTrailingUrlPunctuation(match);
    const url = canonicalizeHarvestedUrl(parts.url);
    if (isExternalWebUrl(url)) urls.push(url);
  }
  for (const match of value.match(/(?:^|[\s(])((?:www\.)[^\s<]+)/gi) || []) {
    const bare = match.replace(/^(?:[\s(])/, "");
    const parts = splitTrailingUrlPunctuation(bare);
    const url = canonicalizeHarvestedUrl(parts.url);
    if (isExternalWebUrl(url)) urls.push(url);
  }
  return urls;
}

function canonicalizeHarvestedUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return raw;
}

function normalizeTextForUrlMatching(value) {
  let text = String(value || "");
  if (typeof text.normalize === "function") text = text.normalize("NFC");
  // Strip bidi/format/zero-width chars that break URL regexes in Loom/JSC copies.
  text = text.replace(/[\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/g, "");
  // Repair `https:// www.` — never leave whitespace inside the scheme/authority.
  text = text.replace(/(https?:\/\/)\s+/gi, "$1");
  // ponytail: emoji-glued URLs (`👉https://…`) miss some parsers; insert a break.
  text = text.replace(/([^\s])(https?:\/\/)/gi, "$1 $2");
  // Bare www glued to text/emoji — but do NOT split `https://www.`
  text = text.replace(/([^\s/:])(www\.)/gi, "$1 $2");
  return text;
}

function stripMediaPlaceholderUrls(text, tweet) {
  if (!text) return "";
  if (!tweetHasMedia(tweet) && !tweet._mediaLookup) return text;
  return String(text)
    .replace(/[ \t]*https?:\/\/t\.co\/\w+/gi, "")
    .replace(/[ \t]*t\.co\/\w+/gi, "");
}

function primaryVideoMedia(tweet) {
  const media = tweet && tweet.media ? tweet.media : [];
  return media.find(item => item.type === "video" || item.type === "animated_gif")
    || media.find(item => /video\/mp4|^video$/i.test(String(item.mimeType || "")))
    || media.find(item => /video\.twimg\.com/i.test(String(item.url || "")));
}

function videoPosterUrl(media) {
  if (!media) return null;
  if (media.thumbnail) {
    const poster = usableVideoPosterUrl(media.thumbnail);
    if (poster) return poster;
  }
  return null;
}

async function embedTweetMediaThumbnails(tweet) {
  if (!tweet || !Array.isArray(tweet.media)) return;
  for (const media of tweet.media) {
    if (media.thumbnail && shouldEmbedAvatarUrl(media.thumbnail)) {
      media.thumbnail = await avatarDataUrlForUrl(normalizedPhotoUrl(media.thumbnail));
    }
  }
  if (tweet.quoted) await embedTweetMediaThumbnails(tweet.quoted);
}

function tweetNeedsMediaBackfill(tweet) {
  if (!tweet || hasRenderableMedia(tweet)) return false;
  const text = String(tweet.text || "");
  if (/[\u{1F3A5}\u{1F4F9}]/u.test(text)) return true;
  if (/\bt\.co\/\w+/i.test(text) && !linkCardForTweet(tweet) && !cardHasMetadata(tweet.card)) return true;
  const placeholderUrls = (tweet.hiddenUrls || []).filter(url => isMediaPlaceholderUrl(url));
  return placeholderUrls.length > 0;
}

async function loadTweetDetailForTweet(tweet, credentials) {
  if (!tweet || !tweet.id || !credentials) return null;
  if (tweet._detailTweet !== undefined) return tweet._detailTweet;

  const cacheKey = String(tweet.id);
  if (loadTweetDetailCache && loadTweetDetailCache.has(cacheKey)) {
    tweet._detailTweet = loadTweetDetailCache.get(cacheKey);
    return tweet._detailTweet;
  }
  if (!canFetchTweetDetail()) {
    tweet._detailTweet = null;
    if (loadTweetDetailCache) loadTweetDetailCache.set(cacheKey, null);
    return null;
  }

  loadTweetDetailFetchCount += 1;
  let detailTweet = null;
  try {
    detailTweet = await tweetFromTweetDetail(tweet.id, credentials);
  }
  catch (error) {
    console.log(`Unable to load TweetDetail for ${tweet.id}: ${error.message || error}`);
  }

  tweet._detailTweet = detailTweet;
  if (loadTweetDetailCache) loadTweetDetailCache.set(cacheKey, detailTweet);
  return detailTweet;
}

async function tweetFromTweetDetail(tweetId, credentials) {
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
  const tweets = extractTweetsFromInstructions(tweetDetailInstructions(data));
  return tweets.find(entry => entry && String(entry.id) === String(tweetId)) || null;
}

async function mediaFromFxTwitterStatus(username, tweetId) {
  const handle = sanitizeHandle(username);
  if (!handle || !tweetId) return [];

  try {
    const text = await sendRequest(
      `${fxTwitterStatusBase}/${encodeURIComponent(handle)}/status/${encodeURIComponent(tweetId)}`,
      "GET",
      null,
      {
        "User-Agent": browserUserAgent,
        "Accept": "application/json"
      },
      true
    );
    const json = parseJsonResponse(text);
    if (json && json.code && Number(json.code) >= 400) return [];

    const mediaRoot = json && json.tweet && json.tweet.media;
    return fxTwitterMediaItems(mediaRoot);
  }
  catch (error) {
    return [];
  }
}

function fxTwitterMediaItems(mediaRoot) {
  if (!mediaRoot) return [];
  const rawItems = [];
  for (const source of [mediaRoot.all, mediaRoot.videos, mediaRoot.photos]) {
    if (Array.isArray(source) && source.length > 0) rawItems.push(...source);
  }
  return dedupeBy(rawItems.map(fxTwitterMediaItem).filter(Boolean), item => item.url);
}

function fxTwitterMediaItem(item) {
  if (!item || !item.url) return null;

  const rawType = String(item.type || "photo").toLowerCase();
  const type = rawType === "gif" ? "animated_gif" : rawType;
  const url = String(item.url);
  const thumbnail = item.thumbnail_url ? String(item.thumbnail_url) : null;

  return {
    url,
    type,
    thumbnail,
    mimeType: item.format || mediaMimeType(type, url),
    width: finiteNumber(item.width),
    height: finiteNumber(item.height),
    altText: null,
    hiddenUrls: dedupeStrings([url, thumbnail].filter(Boolean))
  };
}

async function enrichTweetLinkCard(tweet, credentials) {
  if (!tweet) return;
  if (tweet.quoted) await enrichTweetLinkCard(tweet.quoted, credentials);
  if (!showLinkCards() || !nativeLinkAvailable()) return;

  ensureTweetExternalUrls(tweet);
  ensureLinkCardShell(tweet);

  let lookup = cardHasMetadata(tweet.card) ? "native" : "native-miss";
  const cachedCard = readCardCache(tweet.id);
  if (!cardHasMetadata(tweet.card) && cachedCard) {
    tweet.card = mergeCards(tweet.card, cachedCard.card);
    lookup = cachedCard.lookup || "card-cache";
  }

  if (!cardHasMetadata(tweet.card) && tweetWantsLinkCardEnrichment(tweet) && credentials && tweet.id) {
    try {
      const detailCard = await cardFromTweetDetail(tweet, credentials);
      if (cardHasMetadata(detailCard)) {
        tweet.card = mergeCards(tweet.card, detailCard);
        lookup = "tweetdetail";
        writeCardCache(tweet.id, tweet.card, lookup);
      }
      else if (lookup === "native-miss") {
        lookup = "native-miss:tweetdetail-empty";
      }
    }
    catch (error) {
      lookup = lookup === "native-miss"
        ? `native-miss:tweetdetail-${shortRequestError(error)}`
        : lookup;
    }
  }

  if (!cardHasMetadata(tweet.card) && tweetWantsLinkCardEnrichment(tweet) && tweet.authorUsername && tweet.id && !loadBudgetExceeded()) {
    const fxCard = await cardFromFxTwitterStatus(tweet.authorUsername, tweet.id);
    if (cardHasMetadata(fxCard)) {
      tweet.card = mergeCards(tweet.card, fxCard);
      lookup = "fxtwitter";
      writeCardCache(tweet.id, tweet.card, lookup);
    }
    else if (lookup.startsWith("native-miss")) {
      lookup = `${lookup}+fxtwitter-miss`;
    }
  }

  if (fetchLinkPreviews() && !loadBudgetExceeded()) {
    const shell = linkCardForTweet(tweet);
    if (shell && cardNeedsPreview(shell)) {
      const preview = await linkPreviewForUrl(shell.url);
      if (preview) {
        tweet.card = mergeCardPreview(tweet.card || {}, preview, shell);
        lookup = lookup.includes("miss") ? "og" : `${lookup}+og`;
        writeCardCache(tweet.id, tweet.card, lookup);
      }
      else if (lookup.includes("miss")) {
        lookup = `${lookup}+og-miss`;
      }
    }
  }

  ensureMinimalLinkCard(tweet);

  if (tweet.card && tweet.card.image && shouldEmbedAvatarUrl(tweet.card.image)) {
    tweet.card.image = await avatarDataUrlForUrl(normalizedPhotoUrl(tweet.card.image));
  }

  tweet._linkCardLookup = lookup;
}

async function cardFromTweetDetail(tweet, credentials) {
  const detailTweet = await loadTweetDetailForTweet(tweet, credentials);
  return detailTweet && detailTweet.card ? detailTweet.card : null;
}

async function cardFromFxTwitterStatus(username, tweetId) {
  const handle = sanitizeHandle(username);
  if (!handle || !tweetId) return null;

  try {
    const text = await sendRequest(
      `${fxTwitterStatusBase}/${encodeURIComponent(handle)}/status/${encodeURIComponent(tweetId)}`,
      "GET",
      null,
      {
        "User-Agent": browserUserAgent,
        "Accept": "application/json"
      },
      true
    );
    const json = parseJsonResponse(text);
    if (json && json.code && Number(json.code) >= 400) return null;

    const card = json && json.tweet && json.tweet.card;
    if (!card || !card.url) return null;

    const image = fxTwitterCardImage(card.image);
    return {
      url: card.url,
      type: "website",
      title: normalizedCardText(card.title || ""),
      subtitle: normalizedCardText(card.description || card.subtitle || ""),
      siteName: normalizedCardText(card.domain || urlHost(card.url) || ""),
      authorName: "",
      image: image.url,
      aspectSize: image.aspectSize,
      hiddenUrls: buildLinkHiddenUrls({ externalUrls: [card.url] }, card.url)
    };
  }
  catch (error) {
    return null;
  }
}

function fxTwitterCardImage(image) {
  const rawUrl = typeof image === "string" ? image : (image && image.url);
  const url = rawUrl ? normalizedPhotoUrl(normalizedAvatar(rawUrl) || rawUrl) : null;
  const width = image && finiteNumber(image.width);
  const height = image && finiteNumber(image.height);
  return {
    url,
    aspectSize: width > 0 && height > 0 ? { width, height } : null
  };
}

function ensureLinkCardShell(tweet) {
  const url = linkCardSourceUrl(tweet);
  if (!isExternalWebUrl(url)) return;
  tweet.card = mergeCards(tweet.card || {}, {
    url,
    type: "",
    title: "",
    subtitle: "",
    siteName: "",
    authorName: "",
    image: null,
    aspectSize: null,
    hiddenUrls: buildLinkHiddenUrls(tweet, url)
  });
}

function ensureMinimalLinkCard(tweet) {
  if (!tweet || !tweet.card || !isExternalWebUrl(tweet.card.url)) return;
  if (!tweet.card.siteName) tweet.card.siteName = urlHost(tweet.card.url) || "";
  if (!tweet.card.hiddenUrls || tweet.card.hiddenUrls.length === 0) {
    tweet.card.hiddenUrls = buildLinkHiddenUrls(tweet, tweet.card.url);
  }
}

function buildLinkHiddenUrls(tweet, url) {
  const urls = [url];
  for (const external of tweet.externalUrls || []) {
    if (equivalentWebUrl(external, url)) urls.push(external);
  }
  for (const hidden of tweet.hiddenUrls || []) {
    if (equivalentWebUrl(hidden, url) || equivalentWebUrl(url, hidden)) urls.push(hidden);
  }
  for (const candidate of urls.slice()) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`);
      urls.push(`${parsed.host}${parsed.pathname}${parsed.search}`);
      if (parsed.pathname.length > 1) {
        urls.push(`${parsed.host}${parsed.pathname.replace(/\/$/, "")}${parsed.search}`);
      }
    }
    catch (error) {
      continue;
    }
  }
  return dedupeStrings(urls.filter(Boolean));
}

function isLinkOnlyTweet(tweet) {
  return Boolean(
    tweet
    && !hasRenderableMedia(tweet)
    && !hasRenderablePoll(tweet)
    && isExternalWebUrl(linkCardSourceUrl(tweet))
  );
}

function tweetWantsLinkCardEnrichment(tweet) {
  // Any external URL gets a card shell + openLink; metadata enrich is best-effort.
  return Boolean(isExternalWebUrl(linkCardSourceUrl(tweet)));
}

function linkCardSourceUrl(tweet) {
  if (!tweet) return null;
  const article = articleUrlForTweet(tweet);
  if (article) return article;
  return (tweet.card && tweet.card.url) || firstExternalUrl(tweet.externalUrls);
}

function articleUrlForTweet(tweet) {
  const candidates = dedupeStrings([
    tweet && tweet.card && tweet.card.url,
    ...(tweet && tweet.externalUrls ? tweet.externalUrls : [])
  ]);
  for (const value of candidates) {
    if (!isExternalWebUrl(value)) continue;
    if (isVideoPlaceholderUrl(value)) continue;
    return value;
  }
  return null;
}

function isVideoPlaceholderUrl(value) {
  const host = urlHost(value);
  if (host === "t.co") return true;
  if (!host && /t\.co\//i.test(String(value || ""))) return true;
  if (host === "x.com" || host === "twitter.com") {
    return /\/status\/\d+\/(video|photo)\/\d+/i.test(value)
      || /\/(video|photo)\/\d+/i.test(value);
  }
  return false;
}

function cardHasMetadata(card) {
  if (!card || !isExternalWebUrl(card.url)) return false;
  return Boolean(card.title || card.subtitle || card.image);
}

function mergeCards(current, incoming) {
  if (!incoming) return current || null;
  const base = current || {};
  return {
    url: base.url || incoming.url,
    type: base.type || incoming.type || "website",
    title: base.title || incoming.title || "",
    subtitle: base.subtitle || incoming.subtitle || "",
    siteName: base.siteName || incoming.siteName || "",
    authorName: base.authorName || incoming.authorName || "",
    image: base.image || incoming.image || null,
    aspectSize: base.aspectSize || incoming.aspectSize || null,
    hiddenUrls: dedupeStrings((base.hiddenUrls || []).concat(incoming.hiddenUrls || [incoming.url]))
  };
}

function mergeCardPreview(current, preview, shell) {
  return {
    url: current.url || shell.url || preview.url,
    type: current.type || preview.type || shell.type || "website",
    title: current.title || preview.title || shell.title || "",
    subtitle: current.subtitle || preview.subtitle || shell.subtitle || "",
    siteName: current.siteName || preview.siteName || shell.siteName || urlHost(shell.url) || "",
    authorName: current.authorName || preview.authorName || shell.authorName || "",
    image: current.image || preview.image || shell.image || null,
    aspectSize: current.aspectSize || preview.aspectSize || shell.aspectSize || null,
    hiddenUrls: dedupeStrings((current.hiddenUrls || shell.hiddenUrls || [shell.url]).concat(preview.hiddenUrls || []))
  };
}

function readCardCache(tweetId) {
  if (!tweetId) return null;
  try {
    const cache = JSON.parse(safeGetItem(cardCacheKey) || "{}");
    const entry = cache[String(tweetId)];
    if (!entry || !entry.card) return null;
    if (!entry.builtAt || Date.now() - Number(entry.builtAt) >= linkPreviewCacheTtlMilliseconds) return null;
    return entry;
  }
  catch (error) {
    return null;
  }
}

function writeCardCache(tweetId, card, lookup) {
  if (!tweetId || !card || !cardHasMetadata(card)) return;
  try {
    const cache = JSON.parse(safeGetItem(cardCacheKey) || "{}");
    cache[String(tweetId)] = {
      card,
      lookup: lookup || "card-cache",
      builtAt: Date.now()
    };
    safeSetItem(cardCacheKey, JSON.stringify(pruneCardCache(cache)));
  }
  catch (error) {
    return;
  }
}

function pruneCardCache(cache) {
  const entries = Object.entries(cache || {});
  if (entries.length <= 200) return cache;
  entries.sort((left, right) => (left[1].builtAt || 0) - (right[1].builtAt || 0));
  const next = {};
  for (const [key, value] of entries.slice(-200)) next[key] = value;
  return next;
}

function cardNeedsPreview(card) {
  // Enrichment budget: skip OG when title+image already present (subtitle/site optional).
  return Boolean(
    card
    && isExternalWebUrl(card.url)
    && (!card.title || !card.image)
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

async function homeFeedPage(mode, count, cursor, credentials, seenTweetIds = []) {
  const isFollowing = mode === "following";
  const variables = {
    count,
    includePromotedContent: false,
    latestControlAvailable: true,
    requestContext: "launch",
    withCommunity: true,
    seenTweetIds: Array.isArray(seenTweetIds) ? seenTweetIds.slice(0, 40).map(String) : []
  };
  if (isFollowing) variables.enableRanking = false;
  if (cursor) variables.cursor = cursor;

  const data = await graphqlPost(
    isFollowing ? "HomeLatestTimeline" : "HomeTimeline",
    isFollowing ? normalizedHomeLatestTimelineQueryId() : normalizedHomeTimelineQueryId(),
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

async function homeLatestTimelinePage(count, cursor, credentials) {
  return homeFeedPage("following", count, cursor, credentials);
}

async function bookmarksTimelinePage(count, cursor, credentials) {
  const variables = {
    count,
    includePromotedContent: false
  };
  if (cursor) variables.cursor = cursor;
  const data = await graphqlGet(
    "Bookmarks",
    normalizedBookmarksQueryId(),
    variables,
    readFeatures,
    null,
    credentials
  );
  const instructions = bookmarksTimelineInstructions(data);
  return {
    items: extractTweetsFromInstructions(instructions),
    nextCursor: bottomCursor(instructions)
  };
}

async function listTimelinePage(listId, count, cursor, credentials) {
  if (!listId) throw new Error("Enter a numeric X list ID in Handles / Search Query for List Feed.");
  const variables = {
    listId: String(listId),
    count
  };
  if (cursor) variables.cursor = cursor;
  const data = await graphqlGet(
    "ListLatestTweetsTimeline",
    normalizedListLatestTweetsTimelineQueryId(),
    variables,
    readFeatures,
    null,
    credentials
  );
  const instructions = listTimelineInstructions(data);
  return {
    items: extractTweetsFromInstructions(instructions),
    nextCursor: bottomCursor(instructions)
  };
}

async function mentionsTimelinePage(count, cursor, credentials) {
  const variables = {
    timeline_type: "Mentions",
    count
  };
  if (cursor) variables.cursor = cursor;
  try {
    const data = await graphqlGet(
      "NotificationsTimeline",
      normalizedNotificationsTimelineQueryId(),
      variables,
      readFeatures,
      null,
      credentials
    );
    const instructions = notificationsTimelineInstructions(data);
    const items = extractTweetsFromInstructions(instructions);
    if (items.length > 0 || !cursor) {
      return { items, nextCursor: bottomCursor(instructions) };
    }
  }
  catch (error) {
    console.log(`Mentions NotificationsTimeline failed, falling back to search: ${error.message || error}`);
  }

  const identity = await currentAccountIdentity(credentials);
  const handle = identity && identity.username ? String(identity.username).replace(/^@/, "") : null;
  if (!handle) throw new Error("Could not resolve your X username for Mentions Feed.");
  return searchTimelinePage(`(@${handle}) OR to:${handle}`, count, cursor, credentials);
}

async function assertSessionHealthy(credentials) {
  try {
    const text = await requestText(accountSettingsUrl, "GET", null, restHeaders(credentials), "AccountSettings");
    let settings = null;
    try {
      settings = JSON.parse(text);
    }
    catch (error) {
      settings = null;
    }
    if (!settings || !(settings.screen_name || settings.screenName || settings.username)) {
      console.log("X account settings probe returned no screen_name; continuing with provided cookies.");
    }
  }
  catch (error) {
    const message = String(error && error.message || error);
    if (/401|403|unauthorized|forbidden|rejected the session|Refresh auth_token/i.test(message)) {
      throw new Error("X session expired or rejected. Re-paste auth_token and ct0, then Verify again.");
    }
    // X often answers account/settings with HTTP 404 / code 34 even when GraphQL auth still works.
    console.log(`X account settings probe failed (${message}); continuing with provided cookies.`);
  }
}

async function performPollVoteAction(actionValue, item) {
  const value = parseActionValue(actionValue);
  const tweetId = value.tweetId || tweetIdFromUrl(value.url) || tweetIdFromUrl(item && item.uri);
  const choice = Number(value.choice || value.selectedChoice || value.option || 0);
  const cardUri = value.cardUri || value.card_uri || "";
  if (!tweetId) throw new Error("Could not determine the X post ID for this poll.");
  if (!(choice >= 1 && choice <= 4)) throw new Error("Poll votes need choice 1-4 in the action value.");
  if (!cardUri) throw new Error("This poll is missing card_uri; reload the feed and try again.");

  const credentials = normalizedCredentials();
  const parameters = {
    card_uri: String(cardUri),
    selected_choice: String(choice),
    tweet_id: String(tweetId)
  };
  await requestText(cardUpdateUrl, "POST", parameters, restHeaders(credentials), "CardUpdate");
  return item;
}

async function userProfileByHandle(handle, credentials) {
  const variables = {
    screen_name: handle,
    withSafetyModeUserFields: true
  };
  const queryId = normalizedUserByScreenNameQueryId();
  let data;
  try {
    data = await graphqlGet(
      "UserByScreenName",
      queryId,
      variables,
      userByScreenNameFeatures,
      userByScreenNameFieldToggles,
      credentials
    );
  }
  catch (getError) {
    data = await graphqlPost(
      "UserByScreenName",
      queryId,
      variables,
      userByScreenNameFeatures,
      userByScreenNameFieldToggles,
      credentials
    );
  }
  return userProfileFromGraphql(data, handle);
}

async function userProfileByRestId(userId, credentials) {
  const variables = {
    userId: String(userId),
    withSafetyModeUserFields: true
  };
  const queryIds = userByRestIdQueryIds();
  let lastError = null;

  for (const queryId of queryIds) {
    try {
      let data;
      try {
        data = await graphqlGet(
          "UserByRestId",
          queryId,
          variables,
          userByScreenNameFeatures,
          userByScreenNameFieldToggles,
          credentials
        );
      }
      catch (getError) {
        data = await graphqlPost(
          "UserByRestId",
          queryId,
          variables,
          userByScreenNameFeatures,
          userByScreenNameFieldToggles,
          credentials
        );
      }
      const rawUser = data && data.data && data.data.user && data.data.user.result;
      const profile = normalizeUserProfile(rawUser);
      if (profile.id) {
        writeQueryIdCache("UserByRestId", queryId);
        return profile;
      }
    }
    catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Could not resolve user ${userId}.`);
}

function userByRestIdQueryIds() {
  const ids = [
    normalizedUserByRestIdQueryId(),
    defaultUserByRestIdQueryId,
    ...fallbackUserByRestIdQueryIds
  ];
  const discovered = readQueryIdCache("UserByRestId");
  if (discovered) ids.unshift(discovered);
  return dedupeStrings(ids);
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
    const embeddedAvatar = avatar ? await avatarDataUrlForUrl(avatar) : null;
    return createIdentity(name, `@${handle}`, embeddedAvatar, `https://x.com/${handle}`);
  }
  catch (error) {
    console.log(`Unable to load X account identity: ${error.message || error}`);
    return null;
  }
}

async function tweetDetailItems(tweetId, credentials, options = {}) {
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
  const items = await tweetsToItems(tweets, credentials, options);
  if (items.length > 0) return items;
  throw new Error("X did not return a conversation for this post.");
}

function userProfileFromGraphql(data, requestedHandle) {
  const rawUser = data && data.data && data.data.user && data.data.user.result;
  const profile = normalizeUserProfile(rawUser);
  if (!profile.id && !profile.username) {
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
      if (attempt < 2 && isTransientHttpError(error)) {
        await delayMilliseconds(750 * (attempt + 1));
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
      if (attempt < 2 && isTransientHttpError(error)) {
        await delayMilliseconds(750 * (attempt + 1));
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
  else if (status === 404 && action !== "LinkPreview" && action !== "AccountSettings") {
    message = `X returned HTTP 404 for ${action || "GraphQL"}. The query ID is likely stale; clear or update the advanced ${action || "GraphQL"} query ID.`;
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
  else if (status === 503) {
    message = "X is temporarily unavailable (HTTP 503). Try again in a moment.";
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

function isTransientHttpError(error) {
  const status = error && error.xStatus;
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function delayMilliseconds(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isQueryIdRetryableError(error) {
  const status = error && error.xStatus;
  const message = error && error.message ? error.message : "";
  return status === 400
    || status === 404
    || /query ID|query id|must be defined|validation|PersistedQuery|operation|page does not exist/i.test(message);
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

function bookmarksTimelineInstructions(data) {
  const root = data && data.data && (
    (data.data.bookmark_timeline_v2 && data.data.bookmark_timeline_v2.timeline)
    || (data.data.bookmark_timeline && data.data.bookmark_timeline.timeline)
  );
  return root && Array.isArray(root.instructions) ? root.instructions : [];
}

function listTimelineInstructions(data) {
  const list = data && data.data && data.data.list;
  const root = list && (
    (list.tweets_timeline && list.tweets_timeline.timeline)
    || (list.timeline && list.timeline.timeline)
    || list.timeline
  );
  return root && Array.isArray(root.instructions) ? root.instructions : [];
}

function notificationsTimelineInstructions(data) {
  const root = data && data.data && (
    (data.data.viewer_v2 && data.data.viewer_v2.user_results && data.data.viewer_v2.user_results.result
      && data.data.viewer_v2.user_results.result.notification_timeline
      && data.data.viewer_v2.user_results.result.notification_timeline.timeline)
    || (data.data.viewer && data.data.viewer.user_results && data.data.viewer.user_results.result
      && data.data.viewer.user_results.result.notification_timeline
      && data.data.viewer.user_results.result.notification_timeline.timeline)
    || (data.data.notifications_timeline && data.data.notifications_timeline.timeline)
    || (data.data.notification_timeline && data.data.notification_timeline.timeline)
  );
  if (root && Array.isArray(root.instructions)) return root.instructions;
  // Fallback: deep-scan for the first instructions array under data.
  return findInstructionsDeep(data && data.data) || [];
}

function findInstructionsDeep(node, depth = 0) {
  if (!node || depth > 8) return null;
  if (Array.isArray(node.instructions)) return node.instructions;
  if (typeof node !== "object") return null;
  for (const value of Object.values(node)) {
    if (!value || typeof value !== "object") continue;
    const found = findInstructionsDeep(value, depth + 1);
    if (found) return found;
  }
  return null;
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
  const rawUser = userResult || null;
  const user = normalizeUser(rawUser);
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
    retweeted.repostedByRestId = user.id || null;
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
  const externalUrls = dedupeStrings([
    ...extractExternalUrls(urlMappings),
    ...externalUrlsFromText(text)
  ]);
  const card = extractCard(result, externalUrls, urlMappings);
  const poll = extractPoll(result);
  const quotedRaw = result.quoted_status_result && result.quoted_status_result.result;
  const quoted = includeQuoted && quotedRaw ? normalizeTweet(quotedRaw, false) : null;
  const counts = result.counts || result.metrics || {};
  const replyStatusId = (legacy && legacy.in_reply_to_status_id_str)
    || (details && details.in_reply_to_status_id_str);
  const replyUsername = (legacy && legacy.in_reply_to_screen_name)
    || (details && details.in_reply_to_screen_name);

  const authorAvatarRaw = describeTimelineAvatarRaw(rawUser);

  return {
    id,
    text,
    date,
    url: user.username ? `https://x.com/${user.username}/status/${id}` : `https://x.com/i/web/status/${id}`,
    authorName: user.name || user.username || "X",
    authorUsername: user.username || null,
    authorRestId: user.id || null,
    authorAvatar: user.avatar || timelineAvatarFromHint(authorAvatarRaw) || null,
    authorAvatarRaw,
    authorUserShape: describeUserShape(rawUser),
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
    favorited: Boolean(legacy && legacy.favorited),
    retweeted: Boolean(legacy && legacy.retweeted),
    bookmarked: Boolean(legacy && legacy.bookmarked),
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
    id: profile.id,
    username: profile.username,
    name: profile.name,
    avatar: profile.avatar
  };
}

function normalizeUserProfile(rawUser) {
  const layers = flattenUserLayers(rawUser);
  const user = layers[layers.length - 1] || rawUser;
  const typeName = String(user && user.__typename || "").toLowerCase();
  if (typeName.includes("unavailable") || typeName.includes("limited")) {
    return {
      id: null,
      username: null,
      name: "X",
      avatar: null,
      url: null,
      protected: false
    };
  }

  let mergedCore = {};
  let mergedLegacy = {};
  for (const layer of layers) {
    if (layer && layer.core) mergedCore = { ...mergedCore, ...layer.core };
    if (layer && layer.legacy) mergedLegacy = { ...mergedLegacy, ...layer.legacy };
  }

  const core = user && user.core ? { ...mergedCore, ...user.core } : mergedCore;
  const legacy = user && user.legacy ? { ...mergedLegacy, ...user.legacy } : mergedLegacy;
  const username = core.screen_name || legacy.screen_name || null;
  const name = core.name || legacy.name || username;
  let avatar = avatarFromUserRecord(user, core, legacy);
  if (!avatar) {
    for (const layer of layers) {
      avatar = avatarFromUserRecord(
        layer,
        layer && layer.core ? { ...mergedCore, ...layer.core } : core,
        layer && layer.legacy ? { ...mergedLegacy, ...layer.legacy } : legacy
      );
      if (avatar) break;
      avatar = deepAvatarUrl(layer);
      if (avatar) break;
    }
  }
  if (!avatar) avatar = deepAvatarUrl(rawUser);

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

function flattenUserLayers(rawUser) {
  const layers = [];
  let current = rawUser;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    layers.push(current);
    if (current.result && typeof current.result === "object" && current.result !== current) {
      current = current.result;
      continue;
    }
    break;
  }
  return layers.length > 0 ? layers : (rawUser ? [rawUser] : []);
}

function avatarFromUserRecord(user, core, legacy) {
  return normalizedAvatar(userAvatarUrl(user, core, legacy));
}

function timelineAvatarFromHint(rawHint) {
  if (!rawHint || rawHint === "none" || rawHint.startsWith("obj:") || rawHint.startsWith("typeof:")) {
    return null;
  }
  return normalizedAvatar(rawHint);
}

function cleanAvatarString(value) {
  return String(value || "").replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "").trim();
}

function permissiveTwimgAvatar(raw) {
  const cleaned = cleanAvatarString(raw);
  if (!cleaned || !/profile_images\//.test(cleaned) || !/\.twimg\.com/i.test(cleaned)) return null;
  const match = cleaned.match(/(?:https?:\/\/)?(?:[\w.-]+\.)?twimg\.com\/profile_images\/[^\s"'<>]+/i);
  if (!match) return null;
  let url = match[0];
  if (url.startsWith("//")) url = `https:${url}`;
  else if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return upgradeTwimgProfileAvatar(url.replace(/^http:\/\//i, "https://"));
}

function describeTimelineAvatarRaw(rawUser) {
  const layers = flattenUserLayers(rawUser);
  for (const layer of layers) {
    const legacy = layer && layer.legacy ? layer.legacy : {};
    const core = layer && layer.core ? layer.core : {};
    const candidates = [
      legacy.profile_image_url_https,
      legacy.profile_image_url,
      core.profile_image_url_https,
      core.profile_image_url,
      layer && layer.avatar,
      layer && layer.profile_image_url_https,
      layer && layer.profile_image_url
    ];
    for (const candidate of candidates) {
      const described = describeRawAvatarCandidate(candidate);
      if (described) return described;
    }
  }
  const deep = deepAvatarUrl(rawUser);
  return deep ? deep.slice(0, 120) : "none";
}

function describeRawAvatarCandidate(value) {
  if (value == null || value === false) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 120) : null;
  }
  if (typeof value === "object") {
    const resolved = profileImageFieldValue(value);
    if (resolved) return resolved.slice(0, 120);
    return `obj:${Object.keys(value).slice(0, 4).join(",")}`;
  }
  return `typeof:${typeof value}`;
}

function profileImageFieldValue(value) {
  if (value == null || value === false) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value !== "object") return null;
  return firstDefined(
    value.image_url,
    value.image_url_https,
    value.imageUrl,
    value.url,
    value.profile_image_url_https,
    value.profile_image_url,
    value.avatar_url
  );
}

function describeUserShape(user) {
  if (!user || typeof user !== "object") return "none";
  const parts = [];
  if (user.legacy && user.legacy.profile_image_url_https) parts.push("legacy-pi");
  if (user.avatar && typeof user.avatar === "object" && user.avatar.image_url) parts.push("avatar-obj");
  if (user.rest_id || user.id_str) parts.push("rest_id");
  if (user.legacy) parts.push("legacy");
  if (user.core) parts.push("core");
  if (parts.length > 0) return parts.join("+");
  return Object.keys(user).slice(0, 5).join(",");
}

function userAvatarUrl(user, core, legacy) {
  if (typeof user === "string" && user.trim()) return user;
  if (typeof user?.avatar === "string" && user.avatar.trim()) return user.avatar;

  const avatar = user && user.avatar && typeof user.avatar === "object" ? user.avatar : {};
  const coreAvatar = core && core.avatar ? core.avatar : {};
  const shapeUrl = profileImageShapeUrl(user && user.profile_image_shape);
  return firstProfileImageUrl(
    avatar.image_url,
    avatar.image_url_https,
    avatar.imageUrl,
    avatar.url,
    coreAvatar.image_url,
    coreAvatar.image_url_https,
    coreAvatar.imageUrl,
    coreAvatar.url,
    shapeUrl,
    user?.profile_image_url_https,
    user?.profile_image_url,
    user?.avatar_url,
    core?.profile_image_url_https,
    core?.profile_image_url,
    core?.avatar_url,
    legacy?.profile_image_url_https,
    legacy?.profile_image_url,
    legacy?.avatar_url
  );
}

function firstProfileImageUrl(...values) {
  for (const value of values) {
    const resolved = profileImageFieldValue(value);
    if (resolved) return resolved;
  }
  return null;
}

function profileImageShapeUrl(shape) {
  if (!shape || typeof shape !== "object") return null;
  for (const value of Object.values(shape)) {
    if (typeof value === "string" && value.trim()) return value;
    if (!value || typeof value !== "object") continue;
    const url = value.image_url
      || value.image_url_https
      || value.imageUrl
      || value.url;
    if (url) return url;
  }
  return null;
}

function deepAvatarUrl(value, depth) {
  const level = depth || 0;
  if (!value || level > 6) return null;
  if (typeof value === "string") {
    return /profile_images\//.test(value) && /\.twimg\.com/.test(value)
      ? normalizedAvatar(value)
      : null;
  }
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = deepAvatarUrl(entry, level + 1);
      if (found) return found;
    }
    return null;
  }
  for (const key of ["profile_image_url_https", "profile_image_url", "image_url_https", "image_url", "imageUrl", "url"]) {
    if (typeof value[key] === "string" && value[key]) {
      const avatar = normalizedAvatar(value[key]);
      if (avatar) return avatar;
    }
  }
  for (const nested of Object.values(value)) {
    const found = deepAvatarUrl(nested, level + 1);
    if (found) return found;
  }
  return null;
}

function responseBodyBytes(wrapped) {
  const body = wrapped && wrapped.body;
  if (body == null) return [];
  if (Array.isArray(body)) return body.map(value => Number(value) & 255);
  if (typeof body === "object" && Array.isArray(body.data)) {
    return body.data.map(value => Number(value) & 255);
  }
  if (typeof body !== "string") return [];
  const trimmed = body.trim();
  if (trimmed.startsWith("data:image/")) {
    const comma = trimmed.indexOf(",");
    return comma >= 0 ? base64ToBytes(trimmed.slice(comma + 1)) : [];
  }
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && trimmed.length >= 24 && trimmed.length % 4 === 0) {
    const decoded = base64ToBytes(trimmed);
    if (decoded.length > 0) return decoded;
  }
  return binaryStringToBytes(body);
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
  const topExtended = mediaEntityEntries(result && result.extended_entities && result.extended_entities.media);
  const topEntities = mediaEntityEntries(result && result.entities && result.entities.media);
  const attached = mediaEntityEntries(result && result.attachments && result.attachments.media);
  const scanned = mediaEntityEntries(mediaNodesFromResult(result));
  const entries = extended.concat(direct, noteMedia, modern, topExtended, topEntities, attached, scanned);

  for (const entry of entries) {
    const item = mediaFromEntity(entry);
    if (item) media.push(item);
  }

  return dedupeBy(media, item => item.url);
}

function mediaNodesFromResult(result) {
  const nodes = [];
  const seen = new Set();
  collectMediaNodes(result, nodes, seen, 0);
  return nodes;
}

function collectMediaNodes(node, nodes, seen, depth) {
  if (!node || typeof node !== "object" || depth > 5 || seen.has(node)) return;
  seen.add(node);

  if (node.media_results || node.media_info || node.video_info) {
    nodes.push(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectMediaNodes(item, nodes, seen, depth + 1);
    return;
  }

  for (const key of Object.keys(node)) {
    if (key === "quoted_status_result" || key === "quoted") continue;
    collectMediaNodes(node[key], nodes, seen, depth + 1);
  }
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
  const cardUri = cardString(values.card_uri)
    || cardString(values.card_url)
    || (result && result.card && (result.card.url || result.card.rest_id))
    || "";
  return {
    options,
    endDate: pollEndDate(end),
    cardUri: cardUri || null
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

  let body = tweetBody(tweet);
  body = forceLinkifyPlainUrlsInHtml(body);
  armTweetLinksFromBody(tweet, body);
  if (body) item.body = body + connectorDebugBodySuffix();

  if (tweet.contentWarning) item.contentWarning = tweet.contentWarning;

  const annotations = tweetAnnotations(tweet);
  if (annotations.length > 0) item.annotations = annotations;

  const attachments = tweetAttachments(tweet);
  if (attachments.length > 0) item.attachments = attachments;

  // Assign author last — matches Bluesky/Mastodon and Loom identity quirks.
  const author = tweetIdentity(tweet);
  item.author = author;
  item.actions = attachItemDiagnostics(tweetActions(tweet, body), tweet, author, body);

  return item;
}

function armTweetLinksFromBody(tweet, bodyHtml) {
  if (!tweet) return;
  const plain = htmlDecode(String(bodyHtml || "").replace(/<[^>]+>/g, " "));
  tweet.externalUrls = dedupeStrings([
    ...(tweet.externalUrls || []),
    ...externalUrlsFromText(tweet.text),
    ...externalUrlsFromText(plain)
  ]);
  ensureLinkCardShell(tweet);
  ensureMinimalLinkCard(tweet);
  fillLinkCardImageFromMedia(tweet);
}

function tweetBody(tweet) {
  const text = tweetBodyText(tweet);
  const trimmed = trimBodyText(text);
  let body = buildSplitLinkBody(trimmed);
  body += videoPreviewHtml(tweet);
  body = scrubMediaPlaceholderUrlsFromBody(body, tweet);
  body = forceLinkifyPlainUrlsInHtml(body);
  body += externalLinkBodySuffix(body, tweet);
  body = tweetMetaHtml(tweet) + body;
  if (!inlineMediaFallbackNeeded(tweet)) return body;

  const media = tweet.media
    .slice(0, 4)
    .map(media => inlineMediaFallback(media))
    .filter(Boolean)
    .join("");
  return body + media;
}

function buildSplitLinkBody(text) {
  const value = normalizeTextForUrlMatching(htmlDecode(String(text || "")));
  if (!value) return "";

  const urls = [];
  let caption = value.replace(/https?:\/\/[^\s<]+/gi, (match) => {
    const parts = splitTrailingUrlPunctuation(match);
    const url = canonicalizeHarvestedUrl(parts.url);
    if (shouldOmitBodyUrl(url)) return "";
    if (looksLikeHttpUrl(url)) {
      urls.push(url);
      return parts.trailing || "";
    }
    return match;
  });
  caption = String(caption || "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^\s+|\s+$/g, "");

  const blocks = [];
  if (caption) blocks.push(`<p>${linkifiedText(caption)}</p>`);

  const seen = {};
  for (const url of urls) {
    const key = normalizedUrlForCompare(url) || String(url);
    if (seen[key]) continue;
    seen[key] = true;
    blocks.push(`<p>${linkedText(url, url)}</p>`);
  }

  if (blocks.length === 0) return `<p>${linkifiedText(value)}</p>`;
  return blocks.join("");
}

function forceLinkifyPlainUrlsInHtml(html) {
  return String(html || "").replace(/https?:\/\/[^\s<]+/gi, (match, offset, full) => {
    const preceding = full.slice(0, offset);
    // Already inside an HTML tag (e.g. src="/href=") — leave the attribute alone.
    if (preceding.lastIndexOf("<") > preceding.lastIndexOf(">")) return match;
    const lastOpen = preceding.lastIndexOf("<a ");
    const lastClose = preceding.lastIndexOf("</a>");
    if (lastOpen > lastClose) return match;

    const parts = splitTrailingUrlPunctuation(match);
    const url = canonicalizeHarvestedUrl(parts.url);
    if (shouldOmitBodyUrl(url) || !looksLikeHttpUrl(url)) return match;
    return linkedText(url, url) + (parts.trailing || "");
  });
}

function fillLinkCardImageFromMedia(tweet) {
  if (!tweet || !tweet.card || !isExternalWebUrl(tweet.card.url)) return;
  if (tweet.card.image) return;

  const photo = (tweet.media || []).find(item => (
    item
    && item.url
    && (item.type === "photo" || (!item.type && !/video/i.test(String(item.mimeType || ""))))
  ));
  const video = primaryVideoMedia(tweet);
  const image = (photo && photo.url) || videoPosterUrl(video);
  if (!image) return;

  tweet.card.image = image;
  if (photo && photo.width > 0 && photo.height > 0) {
    tweet.card.aspectSize = { width: photo.width, height: photo.height };
  }
  else if (video && video.width > 0 && video.height > 0) {
    tweet.card.aspectSize = { width: video.width, height: video.height };
  }
}

function externalLinkBodySuffix(body, tweet) {
  const url = articleUrlForTweet(tweet) || firstExternalUrl(externalUrlsFromText(
    htmlDecode(String(body || "").replace(/<[^>]+>/g, " "))
  ));
  if (!isExternalWebUrl(url)) return "";
  const html = String(body || "");
  const href = escapeAttribute(url);
  if (html.includes(`href="${href}"`)) return "";
  const plain = htmlDecode(html.replace(/<[^>]+>/g, " "));
  if (!plain.includes(url) && !/(?:https?:\/\/)?t\.co\/\w+/i.test(plain)) return "";
  return `<p><a href="${href}">${escapeHtml(url)}</a></p>`;
}

function videoPreviewHtml(tweet) {
  if (!showMedia() || (!tweetHasMedia(tweet) && !tweet._mediaLookup)) return "";

  const video = primaryVideoMedia(tweet);
  const poster = videoPosterUrl(video);
  if (!poster) return "";

  // ponytail: Loom shows "Player for URL" for native video; inline poster improves timeline preview
  return `<p><img src="${escapeAttribute(poster)}" alt="${escapeAttribute(mediaDescription(video, tweet))}"></p>`;
}

function scrubMediaPlaceholderUrlsFromBody(body, tweet) {
  if (!body || (!tweetHasMedia(tweet) && !tweet._mediaLookup)) return body;
  return String(body)
    .replace(/\s*https?:\/\/t\.co\/\w+/gi, "")
    .replace(/\s*t\.co\/\w+/gi, "");
}

function usableVideoPosterUrl(thumbnail) {
  const value = String(thumbnail || "");
  if (value.startsWith("data:image/")) return value;
  if (isWebUrl(value) && shouldEmbedAvatarUrl(value)) {
    return normalizedPhotoUrl(value);
  }
  return null;
}

function inlineMediaFallbackNeeded(tweet) {
  return Boolean(
    tweet
    && Array.isArray(tweet.media)
    && tweet.media.length > 0
    && !nativeMediaAvailable()
  );
}

function nativeMediaAvailable() {
  return typeof MediaAttachment !== "undefined"
    && typeof MediaAttachment.createWithUrl === "function";
}

function nativeLinkAvailable() {
  return typeof LinkAttachment !== "undefined"
    && typeof LinkAttachment.createWithUrl === "function";
}

function inlineMediaFallback(media) {
  if (!media || !isWebUrl(media.url)) return "";
  const source = escapeAttribute(media.url);
  const alt = escapeAttribute(media.altText || "Image from X");
  if (media.type === "video" || media.type === "animated_gif") {
    const poster = media.thumbnail && isWebUrl(media.thumbnail)
      ? ` poster="${escapeAttribute(media.thumbnail)}"`
      : "";
    return `<p><video controls preload="metadata"${poster}><source src="${source}" type="${escapeAttribute(media.mimeType || "video/mp4")}"></video></p>`;
  }
  return `<p><img src="${source}" alt="${alt}"></p>`;
}

function tweetBodyText(tweet) {
  let text = tweet && tweet.text ? tweet.text : "";
  text = stripLeadingReplyMentions(text, tweet);
  // ponytail: keep external article URLs in body so <a> stays clickable in detail
  // (LinkAttachment is timeline-only). Only strip media/t.co placeholders.
  const hidden = dedupeStrings([
    ...(tweet.hiddenUrls || []).filter(url => isMediaPlaceholderUrl(url)),
    ...(tweetHasMedia(tweet) || tweet._mediaLookup ? placeholderUrlsFromTweetText(text) : [])
  ]);
  if (hidden.length > 0) text = textWithoutCardUrl(text, hidden);

  // Expand leftover t.co placeholders to the article URL so linkify can emit <a>
  ensureTweetExternalUrls(tweet);
  const article = articleUrlForTweet(tweet);
  if (article && /(?:https?:\/\/)?t\.co\/\w+/i.test(text)) {
    text = text
      .replace(/https?:\/\/t\.co\/\w+/gi, article)
      .replace(/(?<![/\w])t\.co\/\w+/gi, article);
  }
  return normalizeTextForUrlMatching(String(text || "").replace(/[ \t]+$/gm, ""));
}

function isMediaPlaceholderUrl(value) {
  if (!value) return false;
  if (/t\.co\//i.test(String(value))) return true;
  return isVideoPlaceholderUrl(value);
}

function trimBodyText(value) {
  return String(value || "").replace(/^[ \t]+/, "").replace(/[ \t]+$/, "");
}

function stripLeadingReplyMentions(text, tweet) {
  if (!tweet || !tweet.isReply) return text;

  let remaining = String(text || "").trimStart();
  let changed = true;
  while (changed) {
    changed = false;
    const match = remaining.match(/^@([A-Za-z0-9_]{1,15})(?:\s+|$)/);
    if (!match) break;
    remaining = remaining.slice(match[0].length).trimStart();
    changed = true;
  }

  return remaining;
}

function tweetIdentity(tweet) {
  const username = tweet.authorUsername ? `@${tweet.authorUsername}` : null;
  const uri = tweet.authorUsername ? `https://x.com/${tweet.authorUsername}` : "https://x.com";
  return createIdentity(tweet.authorName || "X", username, tweet.authorAvatar, uri);
}

function createIdentity(name, username, avatar, uri) {
  const avatarUrl = avatarForIdentity(avatar);
  const handle = username || null;
  const profileUri = uri || null;

  if (typeof Identity !== "undefined" && typeof Identity.create === "function") {
    const identity = Identity.create(name, handle, avatarUrl, profileUri);
    if (handle) identity.username = handle;
    if (profileUri) identity.uri = profileUri;
    if (avatarUrl != null) identity.avatar = avatarUrl;
    return identity;
  }

  if (typeof Identity === "undefined" || typeof Identity.createWithName !== "function") {
    throw new Error("Loom does not provide Identity.createWithName.");
  }

  const identity = Identity.createWithName(name);
  if (handle) identity.username = handle;
  if (profileUri) identity.uri = profileUri;
  if (avatarUrl != null) identity.avatar = avatarUrl;
  return identity;
}

function tweetAnnotations(tweet) {
  const annotations = [];

  // Loom renders native annotations above Service/Author. Keep only arrival context.
  // Feed type lives in plugin-config service_name (Service chrome size), not here.
  if (tweet.repostedByUsername || tweet.repostedByName) {
    const text = tweet.repostedByUsername
      ? `Reposted by @${tweet.repostedByUsername}`
      : `Reposted by ${tweet.repostedByName}`;
    const annotation = Annotation.createWithText(text);
    if (tweet.repostedByAvatar) annotation.icon = tweet.repostedByAvatar;
    if (tweet.repostedByUsername) annotation.uri = `https://x.com/${tweet.repostedByUsername}`;
    annotations.push(annotation);
  }
  if (tweet.isReply) {
    const text = tweet.replyToUsername ? `Reply to @${tweet.replyToUsername}` : "Reply";
    const reply = Annotation.createWithText(text);
    if (tweet.replyToUsername) reply.uri = `https://x.com/${tweet.replyToUsername}`;
    annotations.push(reply);
  }
  return annotations;
}

function feedDisplayName() {
  return `X · ${sourceLabel()}`;
}

function tweetMetaHtml(tweet) {
  const blocks = [];
  // Article host is not duplicated here: caption keeps clickable <a> and LinkAttachment
  // covers timeline cards. Only engagement metrics belong under Author.
  if (showMetrics()) {
    const metrics = {
      replies: finiteNumber(tweet.replies),
      reposts: finiteNumber(tweet.reposts),
      quotes: finiteNumber(tweet.quotes),
      likes: finiteNumber(tweet.likes),
      views: finiteNumber(tweet.views),
      hasViews: finiteNumber(tweet.views) > 0
    };
    const text = metricsTextFromCounts(metrics);
    if (text) blocks.push(metricsMetaHtml(text));
  }

  return blocks.join("");
}

function metricsMetaHtml(text) {
  // <small> matches Loom annotation chrome size (e.g. "Reply to @…").
  return `<p class="x-meta-metrics"><small>${escapeHtml(text)}</small></p>`;
}

function tweetAttachments(tweet) {
  const attachments = [];

  attachments.push(...tweetMediaAttachments(tweet));

  const poll = tweetPollAttachment(tweet);
  if (poll) attachments.push(poll);

  const link = tweetLinkAttachment(tweet);
  if (link) attachments.push(link);

  const quote = quotedTweetAttachment(tweet);
  if (quote) attachments.push(quote);

  return attachments;
}

function tweetMediaAttachments(tweet) {
  const attachments = [];
  if (!showMedia() || !nativeMediaAvailable() || !tweet.media || tweet.media.length === 0) {
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
  fillLinkCardImageFromMedia(tweet);
  const card = linkCardForTweet(tweet);
  if (!card) return null;

  const attachment = LinkAttachment.createWithUrl(card.url);
  if (card.type) attachment.type = card.type;
  // Always set a title so Loom shows a tappable link card (URL-only shells were easy to miss).
  attachment.title = card.title || card.siteName || urlHost(card.url) || card.url;
  if (card.subtitle) attachment.subtitle = card.subtitle;
  if (card.siteName) attachment.siteName = card.siteName;
  if (card.authorName) attachment.authorName = card.authorName;
  if (card.image) attachment.image = card.image;
  if (card.aspectSize) attachment.aspectSize = card.aspectSize;
  return attachment;
}

function linkCardForTweet(tweet) {
  if (!showLinkCards() || !nativeLinkAvailable() || !tweet) return null;
  if (hasRenderablePoll(tweet)) return null;

  const card = tweet.card || {};
  const url = linkCardSourceUrl(tweet);
  if (!isExternalWebUrl(url)) return null;

  const hasMeta = cardHasMetadata({ ...card, url });
  const hasXCard = Boolean(card.url);

  return {
    url,
    type: hasXCard || hasMeta ? (card.type || "website") : "website",
    title: card.title || "",
    subtitle: card.subtitle || "",
    siteName: card.siteName || urlHost(url) || "",
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
    && nativeMediaAvailable()
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
  if (body) quote.body = body + connectorDebugBodySuffix();
  if (tweet.quoted.contentWarning) quote.contentWarning = tweet.quoted.contentWarning;

  const attachments = tweetMediaAttachments(tweet.quoted);
  if (attachments.length === 0) {
    const link = tweetLinkAttachment(tweet.quoted);
    if (link) attachments.push(link);
  }
  if (attachments.length > 0) quote.attachments = attachments;

  const author = tweetIdentity(tweet.quoted);
  quote.author = author;
  quote.actions = attachItemDiagnostics(tweetActions(tweet.quoted, body), tweet.quoted, author, body);

  return quote;
}

function tweetActions(tweet, bodyHtml) {
  const actions = {
    _connectorBuild: connectorEntryStamp()
  };
  if (!tweet || !tweet.id) return actions;

  const payload = JSON.stringify({
    tweetId: tweet.id,
    url: tweet.url
  });
  if (tweetHasConversation(tweet)) actions.thread = payload;
  if (tweet.poll && tweet.poll.cardUri) {
    actions.votePoll = JSON.stringify({
      tweetId: tweet.id,
      url: tweet.url,
      cardUri: tweet.poll.cardUri,
      choice: 1
    });
  }

  const engagement = engagementActionsForTweet(tweet);
  if (engagement.like) actions.like = engagement.like;
  if (engagement.unlike) actions.unlike = engagement.unlike;
  if (engagement.repost) actions.repost = engagement.repost;
  if (engagement.unrepost) actions.unrepost = engagement.unrepost;
  if (engagement.bookmark) actions.bookmark = engagement.bookmark;
  if (engagement.unbookmark) actions.unbookmark = engagement.unbookmark;

  const plainBody = htmlDecode(String(bodyHtml || "").replace(/<[^>]+>/g, " "));
  tweet.externalUrls = dedupeStrings([
    ...(tweet.externalUrls || []),
    ...externalUrlsFromText(tweet.text),
    ...externalUrlsFromText(plainBody)
  ]);
  ensureLinkCardShell(tweet);
  ensureMinimalLinkCard(tweet);
  fillLinkCardImageFromMedia(tweet);

  const card = linkCardForTweet(tweet);
  const openUrl = (card && card.url)
    || articleUrlForTweet(tweet)
    || firstExternalUrl(tweet.externalUrls)
    || firstExternalUrl(externalUrlsFromText(tweet.text))
    || firstExternalUrl(externalUrlsFromText(plainBody));
  if (isExternalWebUrl(openUrl)) {
    actions.openLink = JSON.stringify({ url: openUrl });
  }

  return actions;
}

function tweetHasConversation(tweet) {
  return Boolean(tweet && (tweet.isReply || finiteNumber(tweet.replies) > 0));
}

function engagementActionsForTweet(tweet) {
  const payload = JSON.stringify({
    tweetId: tweet.id,
    url: tweet.url
  });
  return {
    like: tweet.favorited ? null : payload,
    unlike: tweet.favorited ? payload : null,
    repost: tweet.retweeted ? null : payload,
    unrepost: tweet.retweeted ? payload : null,
    bookmark: tweet.bookmarked ? null : payload,
    unbookmark: tweet.bookmarked ? payload : null
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
    homeTimelineQueryId: normalizedHomeTimelineQueryId(),
    bookmarksQueryId: normalizedBookmarksQueryId(),
    listLatestTweetsTimelineQueryId: normalizedListLatestTweetsTimelineQueryId(),
    notificationsTimelineQueryId: normalizedNotificationsTimelineQueryId(),
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
  if (!input && mode !== "following" && mode !== "for_you" && mode !== "bookmarks" && mode !== "mentions") {
    throw new Error("Enter one or more X handles, a list ID, or switch Source Mode to Search Query and enter a query.");
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
  if (mode === "for_you") return "For You Feed";
  if (mode === "following") return "Following Feed";
  if (mode === "bookmarks") return "Bookmarks";
  if (mode === "list") return `List ${normalizedListId() || ""}`.trim();
  if (mode === "mentions") return "Mentions";
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
  const authToken = stringInput("auth_token").trim();
  const csrf = stringInput("ct0").trim();
  if (!authToken || !csrf) {
    throw new Error("Enter both auth_token and ct0 from a logged-in x.com session.");
  }

  return {
    authToken,
    ct0: csrf,
    cookie: `auth_token=${authToken}; ct0=${csrf}`
  };
}

function normalizedSourceMode() {
  const value = normalizedChoice(stringInput("source_mode"));
  if (value === "for you feed" || value === "for you" || value === "foryou" || value === "for_you") return "for_you";
  if (value === "following feed" || value === "feed" || value === "following") return "following";
  if (value === "bookmarks" || value === "bookmarks feed") return "bookmarks";
  if (value === "list feed" || value === "list" || value === "lists") return "list";
  if (value === "mentions" || value === "mentions feed") return "mentions";
  if (value === "search query" || value === "search") return "search query";
  return "handles";
}

function normalizedListId() {
  const raw = stringInput("x_sources").trim();
  if (!raw) return null;
  const fromUrl = raw.match(/(?:x|twitter)\.com\/i\/lists\/(\d+)/i) || raw.match(/lists\/(\d+)/i);
  if (fromUrl) return fromUrl[1];
  if (/^\d{4,}$/.test(raw)) return raw;
  const first = raw.split(/[,\s]+/).find(part => /^\d{4,}$/.test(part));
  return first || null;
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

function normalizedHomeTimelineQueryId() {
  const value = stringInput("home_timeline_query_id").trim();
  return value || defaultHomeTimelineQueryId;
}

function normalizedBookmarksQueryId() {
  const value = stringInput("bookmarks_query_id").trim();
  return value || readQueryIdCache("Bookmarks") || defaultBookmarksQueryId;
}

function normalizedListLatestTweetsTimelineQueryId() {
  const value = stringInput("list_latest_tweets_timeline_query_id").trim();
  return value || readQueryIdCache("ListLatestTweetsTimeline") || defaultListLatestTweetsTimelineQueryId;
}

function normalizedNotificationsTimelineQueryId() {
  const value = stringInput("notifications_timeline_query_id").trim();
  return value || readQueryIdCache("NotificationsTimeline") || defaultNotificationsTimelineQueryId;
}

function normalizedSearchQueryId() {
  const value = stringInput("search_query_id").trim();
  return value || defaultSearchTimelineQueryId;
}

function normalizedUserByScreenNameQueryId() {
  const value = stringInput("user_by_screen_name_query_id").trim();
  return value || defaultUserByScreenNameQueryId;
}

function normalizedUserByRestIdQueryId() {
  const configured = stringInput("user_by_rest_id_query_id").trim();
  if (configured) return configured;
  const cached = readQueryIdCache("UserByRestId");
  return cached || defaultUserByRestIdQueryId;
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
  return sortTweetsByDate(tweets, "newest");
}

function sortTweetsOldestFirst(tweets) {
  return sortTweetsByDate(tweets, "oldest");
}

function sortTweetsByDate(tweets, order) {
  const newestFirst = order !== "oldest";
  return (tweets || []).slice().sort((left, right) => {
    const leftTime = left && left.date ? left.date.getTime() : 0;
    const rightTime = right && right.date ? right.date.getTime() : 0;
    return newestFirst ? rightTime - leftTime : leftTime - rightTime;
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

function upgradeTwimgProfileAvatar(value) {
  if (!value || !/\/profile_images\//.test(value) || !/\.twimg\.com/i.test(value)) {
    return value;
  }
  return value.replace(/_normal(?=\.|$|\?)/, "_400x400");
}

function coerceWebUrlCandidate(raw) {
  const trimmed = String(raw).trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (!/^https?:\/\//i.test(trimmed) && /^[\w.-]+\.twimg\.com\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function normalizedAvatar(value) {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  const raw = cleanAvatarString(value);
  if (!raw) return null;
  if (raw.startsWith("data:image/")) return raw;

  const candidate = coerceWebUrlCandidate(raw);
  if (isWebUrl(candidate)) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" && /\.twimg\.com$/i.test(url.hostname.replace(/^www\./, ""))) {
        url.protocol = "https:";
        return upgradeTwimgProfileAvatar(url.toString());
      }
      return upgradeTwimgProfileAvatar(candidate);
    }
    catch (error) {
      const fallback = upgradeTwimgProfileAvatar(candidate.replace(/^http:\/\//i, "https://"));
      if (fallback) return fallback;
    }
  }

  return permissiveTwimgAvatar(raw);
}

function avatarForIdentity(value) {
  if (value == null) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = String(value).trim();
  if (raw.startsWith("data:image/")) return raw;
  return normalizedAvatar(raw);
}

function binaryStringToBytes(value) {
  const bytes = [];
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    bytes.push(text.charCodeAt(index) & 255);
  }
  return bytes;
}

function isExternalWebUrl(value) {
  if (!looksLikeHttpUrl(value) && !isWebUrl(value)) return false;
  const host = urlHost(value);
  return Boolean(host && host !== "x.com" && host !== "twitter.com" && host !== "t.co");
}

function isInternalPostUrl(value) {
  if (!looksLikeHttpUrl(value) && !isWebUrl(value)) return false;
  const host = urlHost(value);
  return host === "t.co" || host === "x.com" || host === "twitter.com";
}

// Only strip media/t.co placeholders from body — keep x.com status/article/profile URLs as <a>.
function shouldOmitBodyUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  const host = urlHost(raw);
  if (host === "t.co" || /^https?:\/\/t\.co\//i.test(raw) || /^t\.co\//i.test(raw)) return true;
  if (host === "x.com" || host === "twitter.com") return isVideoPlaceholderUrl(raw);
  return false;
}

function urlApiStatus() {
  return typeof URL !== "undefined" ? "ok" : "missing";
}

function looksLikeHttpUrl(value) {
  return /^https?:\/\/[^\s<]+$/i.test(String(value || "").trim());
}

function isWebUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  if (typeof URL !== "undefined") {
    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") return true;
    }
    catch (error) {
      // Fall through to regex — Loom/JSC can throw on otherwise usable URLs.
    }
  }
  return looksLikeHttpUrl(value);
}

function urlHost(value) {
  if (typeof URL !== "undefined") {
    try {
      return new URL(value).host.replace(/^www\./, "");
    }
    catch (error) {
      // Fall through.
    }
  }
  const match = String(value || "").trim().match(/^https?:\/\/([^/:?#]+)/i);
  return match ? match[1].replace(/^www\./i, "").toLowerCase() : null;
}

function equivalentWebUrl(left, right) {
  const a = normalizedUrlForCompare(left);
  const b = normalizedUrlForCompare(right);
  return Boolean(a && b && a === b);
}

function normalizedUrlForCompare(value) {
  if (!isWebUrl(value)) return null;
  if (typeof URL !== "undefined") {
    try {
      const url = new URL(value);
      url.hash = "";
      url.hostname = url.hostname.toLowerCase();
      if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
      return url.toString();
    }
    catch (error) {
      // Fall through to string normalize when URL ctor rejects.
    }
  }
  return String(value || "")
    .trim()
    .replace(/#.*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase() || null;
}

function textWithoutCardUrl(value, hiddenUrls) {
  let text = String(value || "");
  const variants = dedupeStrings((hiddenUrls || []).flatMap(url => urlVariants(url)))
    .sort((left, right) => right.length - left.length);

  let changed = true;
  while (changed) {
    changed = false;
    for (const variant of variants) {
      const index = text.lastIndexOf(variant);
      if (index < 0) continue;

      const before = text.slice(0, index);
      const after = text.slice(index + variant.length);
      if (before && !/\s$/.test(before)) continue;
      if (!/^[\s),.!?:;]*$/.test(after)) continue;

      text = before.trimEnd();
      changed = true;
      break;
    }
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
  // Instagram-style: escape first, then wrap URLs/mentions on the escaped string.
  const text = normalizeTextForUrlMatching(htmlDecode(String(value || "")));
  let html = escapeHtml(text);

  // Drop consecutive duplicate URL tokens (common on X cards) before wrapping.
  html = html.replace(/(https?:\/\/[^\s<]+)(?:\s+\1)+/g, "$1");

  html = html.replace(/https?:\/\/[^\s<]+/g, (match) => {
    const parts = splitTrailingUrlPunctuation(match);
    const url = canonicalizeHarvestedUrl(parts.url);
    if (shouldOmitBodyUrl(url)) return "";
    // Regex already matched http(s); do not require `new URL()` (Loom/JSC can reject valid URLs).
    if (!looksLikeHttpUrl(url)) return match;
    return linkedText(url, url) + (parts.trailing || "");
  });

  html = html.replace(/(^|[\s(])((?:www\.)[^\s<]+)/g, (match, prefix, bare) => {
    const parts = splitTrailingUrlPunctuation(bare);
    const url = canonicalizeHarvestedUrl(parts.url);
    if (shouldOmitBodyUrl(url) || !looksLikeHttpUrl(url)) return match;
    return `${prefix}${linkedText(url, url)}${parts.trailing || ""}`;
  });

  html = html.replace(/(^|[\s(])@([A-Za-z0-9_]{1,15})\b/g, (match, prefix, username) => (
    `${prefix}${linkedText(`https://x.com/${username}`, `@${username}`)}`
  ));
  // Prefix must not be `&` or we linkify inside escaped entities like &#39;
  html = html.replace(/(^|[\s(])#([A-Za-z0-9_]+)\b/g, (match, prefix, tag) => (
    `${prefix}${linkedText(`https://x.com/hashtag/${encodeURIComponent(tag)}`, `#${tag}`)}`
  ));
  html = html.replace(/(^|[\s(])\$([A-Za-z][A-Za-z0-9_]{0,9})\b/g, (match, prefix, ticker) => (
    `${prefix}${linkedText(`https://x.com/search?q=${encodeURIComponent(`$${ticker}`)}`, `$${ticker}`)}`
  ));

  return html.replace(/\n/g, "<br>");
}

function linkedText(url, label) {
  const text = label || url;
  return `<a href="${escapeAttribute(url)}">${escapeHtml(text)}</a>`;
}

function splitTrailingUrlPunctuation(value) {
  let url = String(value || "");
  let trailing = "";
  // Peel repeated trailing punctuation (Instagram peels one; Loom captions often stack).
  while (/[),.!?:;]+$/.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }
  return { url, trailing };
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
  let text = String(value);
  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = text
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    if (decoded === text) return text;
    text = decoded;
  }
  return text;
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
