const express = require('express');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const indexRouter = require('./routes/index');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  const interval = setInterval(() => {
    ws.send(`Server time: ${new Date().toLocaleTimeString()}`);
  }, 5000);

  const timeout = setTimeout(() => {
    clearInterval(interval);
    console.log('Stopped sending messages after 5 minutes.');
  }, 300000); // 5 minutes in milliseconds

  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
    ws.send(`Echo: ${message}`);
  });
  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
    clearTimeout(timeout);
  });
});

const PORT = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Use the router for handling routes
app.use('/', indexRouter);

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  });

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
