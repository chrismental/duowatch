import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  avatarUrl: true,
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hostId: integer("host_id").notNull().references(() => users.id),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title"),
  videoThumbnail: text("video_thumbnail"),
  createdAt: timestamp("created_at").defaultNow(),
  active: boolean("active").default(true),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  name: true,
  hostId: true,
  videoId: true,
  videoTitle: true,
  videoThumbnail: true,
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertParticipantSchema = createInsertSchema(participants).pick({
  sessionId: true,
  userId: true,
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  sessionId: true,
  userId: true,
  content: true,
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlaylistSchema = createInsertSchema(playlists).pick({
  name: true,
  userId: true,
});

export const playlistItems = pgTable("playlist_items", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull().references(() => playlists.id),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title"),
  videoThumbnail: text("video_thumbnail"),
  videoDuration: text("video_duration"),
  order: integer("order").notNull(),
});

export const insertPlaylistItemSchema = createInsertSchema(playlistItems).pick({
  playlistId: true,
  videoId: true,
  videoTitle: true,
  videoThumbnail: true,
  videoDuration: true,
  order: true,
});

// WebSocket message types
export const videoSyncMessageSchema = z.object({
  type: z.literal("videoSync"),
  sessionId: z.number(),
  action: z.enum(["play", "pause", "seek"]),
  timestamp: z.number().optional(),
  currentTime: z.number().optional(),
});

export const chatMessageSchema = z.object({
  type: z.literal("chat"),
  sessionId: z.number(),
  userId: z.number(),
  username: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export const sessionUpdateSchema = z.object({
  type: z.literal("sessionUpdate"),
  sessionId: z.number(),
  participants: z.array(z.object({
    userId: z.number(),
    username: z.string(),
  })),
});

export const wsMessageSchema = z.discriminatedUnion("type", [
  videoSyncMessageSchema,
  chatMessageSchema,
  sessionUpdateSchema,
]);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlists.$inferSelect;

export type InsertPlaylistItem = z.infer<typeof insertPlaylistItemSchema>;
export type PlaylistItem = typeof playlistItems.$inferSelect;

export type VideoSyncMessage = z.infer<typeof videoSyncMessageSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type SessionUpdateMessage = z.infer<typeof sessionUpdateSchema>;
export type WsMessage = z.infer<typeof wsMessageSchema>;
