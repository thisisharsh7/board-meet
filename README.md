# Collaborative Whiteboard with Voice Notes

A real-time collaborative whiteboard app that supports drawing and voice notes.

## Features
- Real-time drawing synchronization between up to 2 users
- Voice recording with canvas coordinate attachment
- Simple pen drawing (black, fixed size)
- Clear canvas functionality
- Voice notes playback by clicking blue indicators

## Setup and Running

### Backend Server
```bash
cd backend
npm install
npm start
```
Server runs on http://localhost:3001

### Frontend (React App)
```bash
cd frontend
npm install
npm run dev
```
App runs on http://localhost:5173

## Usage
1. Start the backend server first
2. Start the frontend development server
3. Open http://localhost:5173 in up to 2 browser windows/tabs
4. Draw on the canvas - drawings sync in real-time
5. Click "Record Voice Note" to record audio that gets attached to the canvas
6. Click blue circles on canvas to play voice notes
7. Use "Clear Canvas" to reset everything

## Tech Stack
- Frontend: React + Vite + Socket.io Client
- Backend: Node.js + Express + Socket.io
- Real-time: Socket.io for drawing sync and voice notes
- Audio: Web Audio API for voice recording

## Limitations (MVP)
- Maximum 2 concurrent users
- No authentication or user accounts
- No data persistence (clears on server restart)
- Single drawing color and pen size
- Voice notes positioned at canvas center