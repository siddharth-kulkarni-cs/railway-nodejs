


// implement a cache
const cache = new Map();
const wordCache = new Map();
async function generateContent(apiKey, word) {
    const prompt = "Explain how AI works in a few words";
    if(!apiKey){
        return ""
    }

    if(wordCache.has(word)){
        console.log('Cache hit for word for GenAI:', word);
        return wordCache.get(word);
    }

    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Thik of yourself as an expert English language historian and grammarian.  For the word " + word + " give an interesting historical fact and etymology.  Keep it very short and concise.  Remove any words that indicate that you are an AI model.  Just give an answer."
                    }]
                }]
            })
        });
        
        const data = await response.json();
        wordCache.set(word, data);
        if(wordCache.size > 100){
            wordCache.delete(wordCache.keys().next().value);
        }
        console.log('Response:', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error:', error);
        return ""
    }
}

async function generateJoke(apiKey, word) {
    const prompt = "Explain how AI works in a few words";
    if(!apiKey){
        return ""
    }
    if(cache.has(word)){
        console.log('Cache hit for word for GenAI:', word);
        return cache.get(word);
    }
    console.log('Cache miss for word for GenAI:', word);

    try {
        const random = Math.random();
        let model = "gemini-2.5-flash";
        if(random < 0.5){
            model = "gemini-2.0-flash"
        }

        console.log('Using Gemini model:', model);

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key=' + apiKey, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Think of yourself as an expert comedian.  You will be given a topic and you will need to tell a joke about it.  Remove any words that indicate that you are an AI model.  Just give an answer.  Be creative and funny.  The topic of joke is " + word    
                    }]
                }]
            })
        });
        
        const data = await response.json();
        cache.set(word, data);
        if(cache.size > 100){
            cache.delete(cache.keys().next().value);
        }
        console.log('Response:', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error:', error);
        return ""
    }
}


module.exports = {
    generateContent,
    generateJoke
};