/**
 * Centralized API utility with:
 * - In-memory cache with TTL (prevents redundant network calls)
 * - Request deduplication (parallel identical calls resolved once)
 * - Keep-alive ping (prevents Render free-tier cold starts)
 * - AsyncStorage workspace cache for instant load on app open
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── In-Memory Cache ──────────────────────────────────────────────────────────
const memCache = new Map(); // key → { data, expiry }
const pendingRequests = new Map(); // key → Promise (deduplication)

const CACHE_TTL = {
  workspaces: 5 * 60 * 1000,   // 5 min
  tasks:      2 * 60 * 1000,   // 2 min
  projects:   3 * 60 * 1000,   // 3 min
  channels:   10 * 60 * 1000,  // 10 min
  members:    10 * 60 * 1000,  // 10 min
};

function getCacheKey(url) {
  return url;
}

function getTTL(url) {
  if (url.includes('/workspaces') && !url.includes('/projects') && !url.includes('/tasks')) return CACHE_TTL.workspaces;
  if (url.includes('/my-tasks') || url.includes('/tasks')) return CACHE_TTL.tasks;
  if (url.includes('/projects')) return CACHE_TTL.projects;
  if (url.includes('/channels')) return CACHE_TTL.channels;
  if (url.includes('/members') || url.includes('/teams')) return CACHE_TTL.members;
  return 60 * 1000; // default 1 min
}

/**
 * Cached GET with deduplication
 * @param {string} url - API endpoint path
 * @param {boolean} force - bypass cache
 */
export async function cachedGet(url, force = false) {
  const key = getCacheKey(url);

  // Return cached data if fresh
  if (!force && memCache.has(key)) {
    const { data, expiry } = memCache.get(key);
    if (Date.now() < expiry) {
      return data;
    }
    memCache.delete(key);
  }

  // Deduplicate: if same request already in-flight, wait for it
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Start new request
  const promise = axios.get(url).then(res => {
    memCache.set(key, { data: res.data, expiry: Date.now() + getTTL(url) });
    pendingRequests.delete(key);
    return res.data;
  }).catch(err => {
    pendingRequests.delete(key);
    throw err;
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Invalidate a cached URL (call after mutations)
 */
export function invalidateCache(urlPattern) {
  for (const key of memCache.keys()) {
    if (key.includes(urlPattern)) memCache.delete(key);
  }
}

// ── AsyncStorage Workspace Cache ─────────────────────────────────────────────
const WS_CACHE_KEY = '@mw_workspace_cache';
const WS_CACHE_TTL = 30 * 60 * 1000; // 30 min

export async function saveWorkspaceCache(data) {
  try {
    await AsyncStorage.setItem(WS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}
}

export async function loadWorkspaceCache() {
  try {
    const raw = await AsyncStorage.getItem(WS_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > WS_CACHE_TTL) return null;
    return data;
  } catch (_) {
    return null;
  }
}

// ── Keep-Alive Ping ───────────────────────────────────────────────────────────
let pingInterval = null;
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes

export function startKeepAlive(baseURL) {
  if (pingInterval) return; // already started
  // Initial ping on startup to wake server
  axios.get(`${baseURL}/ping`).catch(() => {});
  pingInterval = setInterval(() => {
    axios.get(`${baseURL}/ping`).catch(() => {});
  }, PING_INTERVAL);
}

export function stopKeepAlive() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}
