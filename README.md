# 🎨 Collaborative Drawing Board

A real-time collaborative drawing application built with React, Node.js, and Socket.IO. Draw together with up to 2 users simultaneously, featuring multiple drawing tools, voice notes, and seamless collaboration.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![React](https://img.shields.io/badge/react-19.1.1-blue.svg)

## ✨ Features

### 🖌️ **Drawing Tools**
- **Pen Tool**: Free-form drawing with customizable stroke width and color
- **Shape Tools**: Rectangle, Circle, Diamond, Line, and Arrow
- **Text Tool**: Add text annotations anywhere on the canvas
- **Eraser**: Remove drawings with animated eraser trail
- **Hand Tool**: Pan and navigate around the canvas

### 🎨 **Customization**
- **Color Palette**: 10 predefined stroke colors and 10 background colors
- **Stroke Width**: 3 different stroke widths (1px, 2px, 4px)
- **Opacity Control**: Adjustable opacity from 0-100%
- **Background Colors**: Change canvas background in real-time

### 🔊 **Voice Notes**
- **Record**: Click and hold to record voice messages
- **Playback**: Click voice note indicators to play back
- **Positioning**: Voice notes appear at cursor location
- **Drag & Drop**: Move voice notes around the canvas

### 🔧 **Canvas Controls**
- **Zoom**: Zoom in/out with mouse wheel or controls (25%-300%)
- **Pan**: Hand tool or drag to navigate large canvases
- **Grid**: Visual grid dots for precise positioning
- **Reset**: One-click zoom and pan reset

### 👥 **Real-time Collaboration**
- **2-User Limit**: Maximum 2 users per session
- **Live Drawing**: See drawings appear in real-time
- **Synchronized State**: All drawing data synchronized across users
- **Room Management**: Automatic room full detection

### 🏗️ **Technical Features**
- **Modular Architecture**: Clean component-based structure
- **Custom Hooks**: Reusable logic for drawing, events, and socket handling
- **TypeScript Support**: Type definitions included
- **Hot Module Replacement**: Fast development experience
- **Responsive Design**: Works on different screen sizes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd collaborative-drawing-board
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```
   Server will start on `http://localhost:3001`

5. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will be available on `http://localhost:5173`

6. **Open multiple browser tabs** to test collaboration features

## 📁 Project Structure

```
collaborative-drawing-board/
├── backend/
│   ├── server.js              # Express + Socket.IO server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Canvas.jsx     # Main canvas container
│   │   │   ├── Toolbar.jsx    # Top toolbar with tools
│   │   │   ├── Sidebar.jsx    # Color and stroke controls
│   │   │   ├── ZoomControls.jsx # Zoom and pan controls
│   │   │   ├── VoiceNotes.jsx   # Voice note indicators
│   │   │   ├── EraserCursor.jsx # Custom eraser cursor
│   │   │   ├── TextInput.jsx    # Text input overlay
│   │   │   ├── DrawingCanvas.jsx # Main drawing area
│   │   │   └── RoomFull.jsx     # Room full error screen
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useCanvasDrawing.js    # Canvas drawing logic
│   │   │   ├── useCanvasEvents.js     # Mouse/drawing events
│   │   │   ├── useEraserCursor.js     # Eraser cursor management
│   │   │   ├── useSocketHandler.js    # Socket.IO communication
│   │   │   └── useVoiceRecording.js   # Voice recording functionality
│   │   ├── utils/
│   │   │   └── canvasUtils.js  # Canvas utility functions
│   │   ├── styles/
│   │   │   └── Canvas.css      # Component styles
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🛠️ Technical Stack

### Frontend
- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.2
- **Icons**: Lucide React 0.544.0
- **Real-time**: Socket.IO Client 4.8.1
- **Styling**: CSS3 with CSS Variables
- **Development**: ESLint, Hot Module Replacement

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5.1.0
- **Real-time**: Socket.IO 4.8.1
- **CORS**: Enabled for cross-origin requests

## 🎯 Usage Guide

### Drawing
1. **Select a tool** from the top toolbar
2. **Choose colors** from the left sidebar
3. **Adjust stroke width** and opacity as needed
4. **Start drawing** on the canvas

### Voice Notes
1. **Click the microphone** icon in the toolbar
2. **Allow microphone access** when prompted
3. **Click and hold** to record (up to ~30 seconds)
4. **Voice note appears** at cursor location
5. **Click to play back** or **drag to reposition**

### Collaboration
1. **Share the URL** with another person
2. **Both users can draw** simultaneously
3. **All actions sync** in real-time
4. **Maximum 2 users** per session

## 🔧 Development

### Available Scripts

**Backend:**
```bash
npm start      # Start production server
npm run dev    # Start development server
```

**Frontend:**
```bash
npm run dev      # Start development server with HMR
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Code Architecture

The project follows a modular architecture with clear separation of concerns:

- **Components**: Focused, single-responsibility React components
- **Hooks**: Reusable logic for state management and side effects
- **Utils**: Pure utility functions for canvas operations
- **Styles**: Centralized CSS with component-specific styles

### Key Design Patterns

1. **Custom Hooks Pattern**: Logic extraction into reusable hooks
2. **Component Composition**: Small, composable components
3. **Event-Driven Architecture**: Socket.IO for real-time communication
4. **Separation of Concerns**: Clear boundaries between UI, logic, and data

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Backend (3001)
lsof -ti:3001 | xargs kill -9

# Frontend (5173)  
lsof -ti:5173 | xargs kill -9
```

**Voice Notes Not Working**
- Ensure microphone permissions are granted
- Check if browser supports MediaRecorder API
- Works best in Chrome/Edge/Firefox

**Drawing Not Syncing**
- Check if both frontend and backend are running
- Verify network connectivity
- Check browser console for Socket.IO errors

**Canvas Not Responsive**
- Try refreshing the page
- Check if WebGL is supported
- Clear browser cache if needed

## 🔮 Future Enhancements

- [ ] **User Authentication**: Login and user profiles
- [ ] **Room Management**: Create/join specific rooms
- [ ] **Drawing History**: Undo/redo functionality
- [ ] **Export Options**: Save as PNG/SVG/PDF
- [ ] **More Tools**: Brush, spray paint, text formatting
- [ ] **Layer Support**: Multiple drawing layers
- [ ] **Mobile Support**: Touch-friendly interface
- [ ] **Persistence**: Save drawings to database
- [ ] **Real-time Chat**: Text chat alongside drawing
- [ ] **Screen Sharing**: Share screen while drawing

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and patterns
- Add comments for complex logic
- Test new features thoroughly
- Update README if needed
- Keep commits atomic and well-described

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Lucide React** for beautiful icons
- **Socket.IO** for real-time communication
- **Vite** for fast development experience
- **React Team** for the amazing framework

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing issues
3. Create a new issue with detailed description
4. Include browser version and error messages

---

**Made with ❤️ by the Collaborative Drawing Board Team**

*Happy Drawing! 🎨*