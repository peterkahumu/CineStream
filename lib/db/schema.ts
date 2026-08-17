import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  json,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

// NOTE: `updatedAt`/`addedAt`/`occurredAt` below store `Date.now()` (epoch-ms, ~13
// digits) from the client. Postgres `integer` tops out at 2,147,483,647 (~10 digits),
// so these must be `bigint` — using `integer` here silently overflows every write.
export const watchProgress = pgTable("watch_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tmdbId: text("tmdbId").notNull(),
  mediaType: text("mediaType").notNull(), // 'movie' | 'tv'
  title: text("title").notNull(),
  poster_path: text("poster_path"),
  backdrop_path: text("backdrop_path"),
  watched: integer("watched").default(0),
  duration: integer("duration").default(0),
  season: integer("season"),
  episode: integer("episode"),
  show_progress: json("show_progress"), // Record<string, EpisodeProgress>
  genres: json("genres"), // { id: number, name: string }[] | null — captured at watch time
  lastProvider: text("lastProvider"),
  // What Continue Watching should point at once season/episode finishes:
  // `s{n}e{n}`, or 'end' when it was the series finale. Null = not resolved yet.
  nextEpisodeKey: text("nextEpisodeKey"),
  // Set when the user removes the title from Continue Watching. The row is kept
  // (stats are computed from it) — only the Continue Watching row filters on this.
  dismissedAt: bigint("dismissedAt", { mode: "number" }),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
})

/**
 * "My List" — one row per (userId, tmdbId, mediaType), enforced in application
 * logic rather than a DB constraint (same approach as `watchProgress`). Mutable
 * fields (`watchedAt`, `folderName`) make this closer to `watchProgress` than
 * the append-only `watchHistory` log — sync-watchlist upserts by last-updatedAt-wins.
 */
export const watchlist = pgTable("watchlist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tmdbId: text("tmdbId").notNull(),
  mediaType: text("mediaType").notNull(), // 'movie' | 'tv'
  title: text("title").notNull(),
  poster_path: text("poster_path"),
  backdrop_path: text("backdrop_path"),
  addedAt: bigint("addedAt", { mode: "number" }).notNull(),
  watchedAt: bigint("watchedAt", { mode: "number" }),
  folderName: text("folderName"),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
})

/**
 * Watch history log — distinct from `watchProgress` (the mutable resume pointer
 * behind Continue Watching). One row per (userId, episode/movie), holding its
 * latest "started"/"completed" status — not append-only, so rewatching or
 * resuming an episode updates its existing row instead of piling up duplicates.
 * `episodeKey` is `${mediaType}-${tmdbId}-${season ?? 'x'}-${episode ?? 'x'}`
 * (see lib/progressTracker.ts), giving each episode/movie a stable identity to
 * upsert against.
 *
 * This is also the durable ledger Profile stats are computed from: `watchedSeconds`
 * lives here rather than only inside `watchProgress.show_progress`, so removing a
 * title from Continue Watching costs you a resume point and nothing else.
 */
export const watchHistory = pgTable("watch_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tmdbId: text("tmdbId").notNull(),
  mediaType: text("mediaType").notNull(), // 'movie' | 'tv'
  title: text("title").notNull(),
  poster_path: text("poster_path"),
  season: integer("season"),
  episode: integer("episode"),
  event: text("event").notNull(), // 'started' | 'completed'
  genres: json("genres"), // { id: number, name: string }[] | null
  // Furthest position reached in this episode/movie, and its runtime. Position is
  // merged with GREATEST on conflict — monotonic, so devices can't undo each
  // other's progress. Runtime is not monotonic and is last-write-wins; together
  // they are what determines whether the episode counts as completed.
  watchedSeconds: integer("watchedSeconds").default(0),
  runtimeSeconds: integer("runtimeSeconds").default(0),
  // When the current "started"/"completed" state was reached — drives the activity
  // timeline, so it deliberately does NOT move when only the seconds change.
  occurredAt: bigint("occurredAt", { mode: "number" }).notNull(),
  // Any change at all, including seconds-only ones. Conflict resolution for the
  // mutable fields uses this rather than occurredAt.
  updatedAt: bigint("updatedAt", { mode: "number" }),
  episodeKey: text("episodeKey").notNull(),
}, (t) => [
  uniqueIndex("watch_history_user_episode_idx").on(t.userId, t.episodeKey),
])

/** Cross-device preference sync for signed-in users (see lib/settings.ts UserSettings). */
export const userSettings = pgTable("user_settings", {
  userId: text("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  settings: json("settings").notNull(), // UserSettings blob
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
})
