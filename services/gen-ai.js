

async function generateContent(apiKey, word) {
    const prompt = "Explain how AI works in a few words";
    if(!apiKey){
        return ""
    }
    // implement a cache
    const cache = new Map();
    if(cache.has(word)){
        console.log('Cache hit for word for GenAI:', word);
        return cache.get(word);
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
    generateContent
};