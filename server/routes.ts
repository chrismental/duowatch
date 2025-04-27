import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import axios from "axios";
import session from "express-session";
import {
  insertUserSchema,
  insertSessionSchema,
  insertParticipantSchema,
  insertMessageSchema,
  insertPlaylistSchema,
  insertPlaylistItemSchema,
  wsMessageSchema,
  videoSyncMessageSchema,
  chatMessageSchema,
  sessionUpdateSchema,
  type User
} from "@shared/schema";
import { ZodError } from "zod";

// Extend the express-session types
declare module "express-session" {
  interface SessionData {
    userId: number;
    authenticated: boolean;
  }
}

// Store active WebSocket connections by session and user
interface Connection {
  userId: number;
  socket: WebSocket;
}

interface SessionConnections {
  [sessionId: number]: Connection[];
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Keep track of active connections by session
  const sessionConnections: SessionConnections = {};

  // WebSocket connection handler
  wss.on('connection', (ws: WebSocket) => {
    let userId: number | undefined;
    let sessionId: number | undefined;

    ws.on('message', async (message: string) => {
      try {
        const parsedMessage = JSON.parse(message);
        const validatedMessage = wsMessageSchema.parse(parsedMessage);
        
        // Handle different message types
        switch (validatedMessage.type) {
          case 'videoSync': {
            const syncMessage = videoSyncMessageSchema.parse(validatedMessage);
            sessionId = syncMessage.sessionId;
            
            // Broadcast to all other clients in the same session
            if (sessionConnections[sessionId]) {
              for (const connection of sessionConnections[sessionId]) {
                if (connection.userId !== userId && connection.socket.readyState === WebSocket.OPEN) {
                  connection.socket.send(JSON.stringify(syncMessage));
                }
              }
            }
            break;
          }
          
          case 'chat': {
            const chatMsg = chatMessageSchema.parse(validatedMessage);
            sessionId = chatMsg.sessionId;
            userId = chatMsg.userId;
            
            // Store the message in the database
            await storage.createMessage({
              sessionId: chatMsg.sessionId,
              userId: chatMsg.userId,
              content: chatMsg.message
            });
            
            // Broadcast to all clients in the same session
            if (sessionConnections[sessionId]) {
              for (const connection of sessionConnections[sessionId]) {
                if (connection.socket.readyState === WebSocket.OPEN) {
                  connection.socket.send(JSON.stringify(chatMsg));
                }
              }
            }
            break;
          }
          
          case 'sessionUpdate': {
            // Handle session participant updates
            const updateMsg = sessionUpdateSchema.parse(validatedMessage);
            sessionId = updateMsg.sessionId;
            
            // Broadcast to all clients in the session
            if (sessionConnections[sessionId]) {
              for (const connection of sessionConnections[sessionId]) {
                if (connection.socket.readyState === WebSocket.OPEN) {
                  connection.socket.send(JSON.stringify(updateMsg));
                }
              }
            }
            break;
          }
        }
        
        // Register connection if not already done
        if (userId && sessionId && !sessionConnections[sessionId]?.some(conn => conn.userId === userId)) {
          if (!sessionConnections[sessionId]) {
            sessionConnections[sessionId] = [];
          }
          sessionConnections[sessionId].push({ userId, socket: ws });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        if (error instanceof ZodError) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            details: error.errors
          }));
        }
      }
    });

    ws.on('close', () => {
      // Remove the connection when it's closed
      if (sessionId && userId) {
        if (sessionConnections[sessionId]) {
          sessionConnections[sessionId] = sessionConnections[sessionId].filter(
            conn => !(conn.userId === userId && conn.socket === ws)
          );
          
          // Clean up empty sessions
          if (sessionConnections[sessionId].length === 0) {
            delete sessionConnections[sessionId];
          } else {
            // Notify other participants that someone left
            const remainingUsers = sessionConnections[sessionId].map(conn => ({
              userId: conn.userId,
              username: 'User' // Ideally get this from the session info
            }));
            
            const updateMessage: Record<string, any> = {
              type: 'sessionUpdate',
              sessionId,
              participants: remainingUsers
            };
            
            for (const connection of sessionConnections[sessionId]) {
              if (connection.socket.readyState === WebSocket.OPEN) {
                connection.socket.send(JSON.stringify(updateMessage));
              }
            }
          }
        }
      }
    });
  });

  // Authentication routes
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const user = await storage.createUser(userData);
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      req.session.userId = user.id;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Don't return the password
      const { password: _, ...userWithoutPassword } = user;
      
      req.session.userId = user.id;
      return res.json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to log out' });
      }
      
      res.clearCookie('connect.sid');
      return res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      return res.json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Session routes
  app.post('/api/sessions', async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const sessionData = insertSessionSchema.parse({
        ...req.body,
        hostId: userId
      });
      
      const session = await storage.createSession(sessionData);
      
      // Automatically add the host as a participant
      await storage.addParticipant({
        sessionId: session.id,
        userId: userId
      });
      
      return res.status(201).json(session);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/sessions', async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const sessions = await storage.getSessionsByUserId(userId);
      return res.json(sessions);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/sessions/:id', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      return res.json(session);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/sessions/:id/join', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Check if user is already a participant
      const participants = await storage.getSessionParticipants(sessionId);
      const isParticipant = participants.some(p => p.userId === userId);
      
      if (!isParticipant) {
        await storage.addParticipant({
          sessionId,
          userId
        });
      }
      
      return res.json({ message: 'Joined session successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/sessions/:id/leave', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }
      
      await storage.removeParticipant(sessionId, userId);
      
      // If the host leaves, close the session
      const session = await storage.getSession(sessionId);
      if (session && session.hostId === userId) {
        await storage.updateSession(sessionId, { active: false });
      }
      
      return res.json({ message: 'Left session successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Participant routes
  app.get('/api/sessions/:id/participants', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }
      
      const participants = await storage.getSessionParticipants(sessionId);
      
      // Get user details for each participant
      const participantsWithDetails = await Promise.all(
        participants.map(async (participant) => {
          const user = await storage.getUser(participant.userId);
          return {
            ...participant,
            user: user ? { 
              id: user.id, 
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl
            } : undefined
          };
        })
      );
      
      return res.json(participantsWithDetails);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Message routes
  app.get('/api/sessions/:id/messages', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }
      
      const messages = await storage.getSessionMessages(sessionId);
      
      // Get user details for each message
      const messagesWithUser = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return {
            ...message,
            user: user ? { 
              id: user.id, 
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl
            } : undefined
          };
        })
      );
      
      return res.json(messagesWithUser);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/sessions/:id/messages', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        sessionId,
        userId
      });
      
      const message = await storage.createMessage(messageData);
      
      // Get user details
      const user = await storage.getUser(userId);
      
      const messageWithUser = {
        ...message,
        user: user ? { 
          id: user.id, 
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        } : undefined
      };
      
      return res.status(201).json(messageWithUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Playlist routes
  app.post('/api/playlists', async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const playlistData = insertPlaylistSchema.parse({
        ...req.body,
        userId
      });
      
      const playlist = await storage.createPlaylist(playlistData);
      return res.status(201).json(playlist);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/playlists', async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const playlists = await storage.getPlaylistsByUserId(userId);
      return res.json(playlists);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/playlists/:id', async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      if (isNaN(playlistId)) {
        return res.status(400).json({ message: 'Invalid playlist ID' });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: 'Playlist not found' });
      }
      
      const items = await storage.getPlaylistItems(playlistId);
      
      return res.json({
        ...playlist,
        items
      });
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/playlists/:id/items', async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (isNaN(playlistId)) {
        return res.status(400).json({ message: 'Invalid playlist ID' });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: 'Playlist not found' });
      }
      
      if (playlist.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to add items to this playlist' });
      }
      
      // Get current items to determine the next order
      const currentItems = await storage.getPlaylistItems(playlistId);
      const nextOrder = currentItems.length > 0
        ? Math.max(...currentItems.map(item => item.order)) + 1
        : 0;
      
      const itemData = insertPlaylistItemSchema.parse({
        ...req.body,
        playlistId,
        order: nextOrder
      });
      
      const item = await storage.addPlaylistItem(itemData);
      return res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/playlists/:playlistId/items/:itemId', async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.playlistId);
      const itemId = parseInt(req.params.itemId);
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (isNaN(playlistId) || isNaN(itemId)) {
        return res.status(400).json({ message: 'Invalid playlist or item ID' });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: 'Playlist not found' });
      }
      
      if (playlist.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to remove items from this playlist' });
      }
      
      await storage.removePlaylistItem(itemId);
      return res.json({ message: 'Item removed successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/playlists/:id/reorder', async (req: Request, res: Response) => {
    try {
      const playlistId = parseInt(req.params.id);
      const userId = req.session.userId;
      const { itemIds } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (isNaN(playlistId)) {
        return res.status(400).json({ message: 'Invalid playlist ID' });
      }
      
      if (!Array.isArray(itemIds)) {
        return res.status(400).json({ message: 'Item IDs must be an array' });
      }
      
      const playlist = await storage.getPlaylist(playlistId);
      
      if (!playlist) {
        return res.status(404).json({ message: 'Playlist not found' });
      }
      
      if (playlist.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to reorder this playlist' });
      }
      
      await storage.updatePlaylistItemOrder(playlistId, itemIds);
      return res.json({ message: 'Playlist reordered successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // YouTube API proxy
  app.get('/api/youtube/search', async (req: Request, res: Response) => {
    try {
      const { q, maxResults = 10 } = req.query;
      
      if (!q) {
        return res.status(400).json({ message: 'Query parameter is required' });
      }
      
      // Use YouTube Data API v3 to search for videos
      const API_KEY = process.env.YOUTUBE_API_KEY;
      if (!API_KEY) {
        return res.status(500).json({ message: 'YouTube API key not configured' });
      }
      
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q,
          maxResults,
          type: 'video',
          key: API_KEY
        }
      });
      
      return res.json(response.data);
    } catch (error) {
      console.error('YouTube API error:', error);
      return res.status(500).json({ message: 'Failed to fetch videos from YouTube' });
    }
  });

  app.get('/api/youtube/videos/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'Video ID is required' });
      }
      
      // Use YouTube Data API v3 to get video details
      const API_KEY = process.env.YOUTUBE_API_KEY;
      if (!API_KEY) {
        return res.status(500).json({ message: 'YouTube API key not configured' });
      }
      
      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet,contentDetails',
          id,
          key: API_KEY
        }
      });
      
      if (!response.data.items || response.data.items.length === 0) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      return res.json(response.data.items[0]);
    } catch (error) {
      console.error('YouTube API error:', error);
      return res.status(500).json({ message: 'Failed to fetch video details from YouTube' });
    }
  });

  return httpServer;
}
