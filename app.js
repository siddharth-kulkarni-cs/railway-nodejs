const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const mathRouter = require('./routes/math'); // Assuming this resolves to the compiled JS file

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json()); // Added this line

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Use the router for handling routes
app.use('/', indexRouter);
app.use('/api/math', mathRouter); // Added this line for the math API

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
