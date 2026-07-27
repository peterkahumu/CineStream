import {
  pgTable,
  text,
  timestamp,
  integer,
  json,
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
})

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
  lastProvider: text("lastProvider"),
  updatedAt: integer("updatedAt").notNull(),
})

export const watchlist = pgTable("watchlist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tmdbId: text("tmdbId").notNull(),
  mediaType: text("mediaType").notNull(), // 'movie' | 'tv'
  title: text("title").notNull(),
  poster_path: text("poster_path"),
  addedAt: integer("addedAt").notNull(),
})

