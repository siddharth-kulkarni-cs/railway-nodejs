const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const mathRouterJs = require('./routes/math'); // Renamed variable

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Use the router for handling routes
app.use('/', indexRouter);
// Use .default if it exists (for ES module default export compatibility)
app.use('/api/math', mathRouterJs.default || mathRouterJs); // Modified this line

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
