const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
    const chatCompletion = await getCompletionForWrongWord("drakonion");
    // Print the completion returned by the LLM.
    console.log(chatCompletion.choices[0]?.message?.content || "");
}


async function getCompletionForWrongWord(word) {
    return groq.chat.completions.create({
        messages: [
            {
                "role": "system",
                "content": "Think of yourself as an expert in English and other languages.  You will be given a word which may not be spelled correctly.  You will need to correct the spelling and provide the correct spelling.  You will also need to provide the definition of the word.  Also, if the word is not in English, think of its meaning in other langauges and provide some output.  Don't answer for words that are offensive.  Remove any words that indicate that you are an AI model.  Just give an answer."
            },
            {
                role: "user",
                content: "This word " + word + " seems either wrongly spelt or not in English.  Please correct the spelling and provide the correct spelling.  Also, if the word is not in English, think of its meaning in other langauges and provide some output.",
            },
        ],
        model: "llama-3.3-70b-versatile",
    });
}

async function getGroqChatCompletion() {
    return groq.chat.completions.create({
        messages: [
            {
                "role": "system",
                "content": "Be a very straight to the point agent with a technical point of view.  Don't entertain any political or dark themes."
            },
            {
                role: "user",
                content: "Explain the importance of fast language models",
            },
        ],
        model: "llama-3.3-70b-versatile",
    });
}

module.exports = {
    getCompletionForWrongWord
}