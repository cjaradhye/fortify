require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const proxyRoutes = require("./routes/proxyRoutes");
const http = require('http');
const { Server } = require('socket.io');
require("./config/passport");

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL, 
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({ 
    secret: process.env.SESSION_SECRET, 
    resave: false, 
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/proxy', proxyRoutes);
app.use("/auth", authRoutes);


// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('analyzeContract', async (contractAddress) => {
    try {
      socket.emit('progress', { message: 'Fetching contract', progress: 20 })
      const contractDetails = await fetchContractDetails(contractAddress);
      socket.emit('progress', { message: 'Processing source code', progress: 50 });
      const mlAnalysis = await analyzeWithML(contractDetails.sourceCode);
      socket.emit('progress', { message: 'Finalizing analysis', progress: 80 });
      socket.emit('progress', { message: 'Analysis complete', progress: 100 });
      socket.emit('analysisComplete', results);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: 'error', 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database Connection & Server Start
connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});