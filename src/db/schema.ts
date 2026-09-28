import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/*  KrishiSense AI — database schema                                   */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  state: text("state"),
  district: text("district"),
  village: text("village"),
  language: text("language").default("en"),
  farmSizeAcres: real("farm_size_acres"),
  soilType: text("soil_type"),
  preferredCrops: text("preferred_crops"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fields = pgTable("fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  areaAcres: real("area_acres").notNull().default(1),
  location: text("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  soilType: text("soil_type"),
  nitrogen: real("nitrogen"),
  phosphorus: real("phosphorus"),
  potassium: real("potassium"),
  ph: real("ph"),
  currentCrop: text("current_crop"),
  previousCrop: text("previous_crop"),
  season: text("season"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const predictions = pgTable("predictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // crop | disease | yield | fertilizer | rotation | profit | whatif
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedAdvisories = pgTable("saved_advisories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  note: text("note"),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    severity: text("severity").notNull(), // critical | high | medium | low
    category: text("category").notNull(), // weather | pest | market | agronomy
    title: text("title").notNull(),
    message: text("message").notNull(),
    dismissed: boolean("dismissed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("alerts_user_key_idx").on(t.userId, t.key)]
);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  reports: integer("reports").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Field = typeof fields.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type SavedAdvisory = typeof savedAdvisories.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
