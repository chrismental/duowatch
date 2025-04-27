# DuoWatch - Synchronized YouTube Watching Platform

A real-time synchronized YouTube video watching platform for couples with shared controls and playlists.

## Features

- Watch YouTube videos together in perfect sync
- Real-time chat during video playback
- Create and manage playlists
- User authentication and session management
- Persistent data storage with PostgreSQL

## Technologies Used

- Frontend: React, Tailwind CSS, shadcn/ui components
- Backend: Express.js, WebSockets (ws)
- Database: PostgreSQL with Drizzle ORM
- API Integration: YouTube Data API v3

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- YouTube API key

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=your_postgresql_connection_string
YOUTUBE_API_KEY=your_youtube_api_key
```

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/duowatch.git
cd duowatch
```

2. Install dependencies:
```
npm install
```

3. Push the database schema:
```
npm run db:push
```

4. Start the development server:
```
npm run dev
```

5. Open your browser and navigate to `http://localhost:5000`

## Deployment

The application can be deployed to any platform that supports Node.js and PostgreSQL.

## License

MIT License