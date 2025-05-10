const express = require('express');
const path = require('path');
const router = express.Router();

// Serve the index.html file for the root route
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

router.get('/word-usage', async (req, res) => {
    const word = req.query.word;
    console.log('Word:', word);
    if(!word || word.length === 0){
      console.log('No word provided');
      res.sendFile(path.join(__dirname, '../views/404.html'));
    }

    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await response.json();
    console.log('Data:', data);
     if(!data || data.length === 0 || !data[0] || !data[0].meanings || !data[0].meanings[0] || !data[0].meanings[0].definitions || !data[0].meanings[0].definitions[0]){
      console.log('No data found');
      res.sendFile(path.join(__dirname, '../views/404.html'));
      return
    }
    console.log('Data:', data[0].meanings[0].definitions[0].definition);
   


    // Example usage
    res.json({
        word: word,
        message: `Analyzing usage of "${word}"`,
        meaning: data[0].meanings[0].definitions[0].definition
    });
});

module.exports = router;
