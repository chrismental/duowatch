import { 
  users, type User, type InsertUser,
  sessions, type Session, type InsertSession,
  participants, type Participant, type InsertParticipant,
  messages, type Message, type InsertMessage,
  playlists, type Playlist, type InsertPlaylist,
  playlistItems, type PlaylistItem, type InsertPlaylistItem
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  getActiveSessions(): Promise<Session[]>;
  getSessionsByUserId(userId: number): Promise<Session[]>;
  updateSession(id: number, updates: Partial<Session>): Promise<Session | undefined>;
  
  // Participant methods
  addParticipant(participant: InsertParticipant): Promise<Participant>;
  getSessionParticipants(sessionId: number): Promise<Participant[]>;
  getParticipantsByUserId(userId: number): Promise<Participant[]>;
  removeParticipant(sessionId: number, userId: number): Promise<void>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getSessionMessages(sessionId: number): Promise<Message[]>;
  
  // Playlist methods
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  getPlaylistsByUserId(userId: number): Promise<Playlist[]>;
  getPlaylist(id: number): Promise<Playlist | undefined>;
  
  // Playlist item methods
  addPlaylistItem(item: InsertPlaylistItem): Promise<PlaylistItem>;
  getPlaylistItems(playlistId: number): Promise<PlaylistItem[]>;
  removePlaylistItem(id: number): Promise<void>;
  updatePlaylistItemOrder(playlistId: number, itemIds: number[]): Promise<void>;
}

import { db } from "./db";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        createdAt: new Date()
      })
      .returning();
    return user;
  }

  // Session methods
  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values({
        ...insertSession,
        createdAt: new Date(),
        active: true
      })
      .returning();
    return session;
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async getActiveSessions(): Promise<Session[]> {
    return db.select().from(sessions).where(eq(sessions.active, true));
  }

  async getSessionsByUserId(userId: number): Promise<Session[]> {
    // Get sessions where user is host
    const hostedSessions = await db.select().from(sessions).where(eq(sessions.hostId, userId));
    
    // Get sessions where user is participant
    const participatedSessions = await db
      .select({
        session: sessions
      })
      .from(sessions)
      .innerJoin(participants, eq(sessions.id, participants.sessionId))
      .where(eq(participants.userId, userId));
    
    // Combine and remove duplicates
    const sessionMap = new Map<number, Session>();
    
    for (const session of hostedSessions) {
      sessionMap.set(session.id, session);
    }
    
    for (const { session } of participatedSessions) {
      if (!sessionMap.has(session.id)) {
        sessionMap.set(session.id, session);
      }
    }
    
    return Array.from(sessionMap.values());
  }

  async updateSession(id: number, updates: Partial<Session>): Promise<Session | undefined> {
    const [updatedSession] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();
    return updatedSession;
  }

  // Participant methods
  async addParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    // Check if participant already exists
    const [existingParticipant] = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.sessionId, insertParticipant.sessionId),
          eq(participants.userId, insertParticipant.userId)
        )
      );
    
    if (existingParticipant) {
      return existingParticipant;
    }
    
    const [participant] = await db
      .insert(participants)
      .values({
        ...insertParticipant,
        joinedAt: new Date()
      })
      .returning();
    return participant;
  }

  async getSessionParticipants(sessionId: number): Promise<Participant[]> {
    return db
      .select()
      .from(participants)
      .where(eq(participants.sessionId, sessionId));
  }

  async getParticipantsByUserId(userId: number): Promise<Participant[]> {
    return db
      .select()
      .from(participants)
      .where(eq(participants.userId, userId));
  }

  async removeParticipant(sessionId: number, userId: number): Promise<void> {
    await db
      .delete(participants)
      .where(
        and(
          eq(participants.sessionId, sessionId),
          eq(participants.userId, userId)
        )
      );
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        sentAt: new Date()
      })
      .returning();
    return message;
  }

  async getSessionMessages(sessionId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.sentAt));
  }

  // Playlist methods
  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const [playlist] = await db
      .insert(playlists)
      .values({
        ...insertPlaylist,
        createdAt: new Date()
      })
      .returning();
    return playlist;
  }

  async getPlaylistsByUserId(userId: number): Promise<Playlist[]> {
    return db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, userId));
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, id));
    return playlist;
  }

  // Playlist item methods
  async addPlaylistItem(insertItem: InsertPlaylistItem): Promise<PlaylistItem> {
    // Calculate the max order
    const [maxOrderResult] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${playlistItems.order}), 0)` })
      .from(playlistItems)
      .where(eq(playlistItems.playlistId, insertItem.playlistId));
    
    const maxOrder = maxOrderResult?.maxOrder || 0;
    
    const [item] = await db
      .insert(playlistItems)
      .values({
        ...insertItem,
        order: maxOrder + 1
      })
      .returning();
    
    return item;
  }

  async getPlaylistItems(playlistId: number): Promise<PlaylistItem[]> {
    return db
      .select()
      .from(playlistItems)
      .where(eq(playlistItems.playlistId, playlistId))
      .orderBy(asc(playlistItems.order));
  }

  async removePlaylistItem(id: number): Promise<void> {
    await db
      .delete(playlistItems)
      .where(eq(playlistItems.id, id));
  }

  async updatePlaylistItemOrder(playlistId: number, itemIds: number[]): Promise<void> {
    // Update each item's order in a transaction
    for (let i = 0; i < itemIds.length; i++) {
      await db
        .update(playlistItems)
        .set({ order: i + 1 })
        .where(
          and(
            eq(playlistItems.id, itemIds[i]),
            eq(playlistItems.playlistId, playlistId)
          )
        );
    }
  }
}

// Add demo users to database on startup
async function seedDemoUsers() {
  // Check if demo users already exist
  const [demoUser] = await db.select().from(users).where(eq(users.username, "demo"));
  const [partnerUser] = await db.select().from(users).where(eq(users.username, "partner"));
  
  if (!demoUser) {
    await db.insert(users).values({
      username: "demo",
      password: "password",
      displayName: "Demo User",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
      createdAt: new Date()
    });
  }
  
  if (!partnerUser) {
    await db.insert(users).values({
      username: "partner",
      password: "password",
      displayName: "Partner",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=partner",
      createdAt: new Date()
    });
  }
}

// Seed the database with initial users
seedDemoUsers().catch(console.error);

export const storage = new DatabaseStorage();
