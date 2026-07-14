require("dotenv").config();

const getGeminiAPIResponse = async (message, mode = 'balanced') => {
    if (!message || typeof message !== 'string' || message.trim() === '') {
        throw new Error('Message is required');
    }

    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is missing');
    }

    const stylePrompts = {
        balanced: 'Respond in a balanced, helpful way with clarity and friendly tone.',
        creative: 'Respond with creative ideas, imaginative phrasing, and friendly personality.',
        precise: 'Respond concisely with accurate, direct, and practical information.'
    };

    const promptStyle = stylePrompts[mode] || stylePrompts.balanced;
    const clarityInstruction = `Respond in a clear, easy-to-understand way. Do not use markdown headings, dollar-delimited math, LaTeX, code fences, JSON, YAML, or XML. Use plain text only. If you need to show math, write it in ASCII form like sin(x), cos(x), sqrt(3), and x^2.`;
    const payloadText = `${promptStyle}\n\n${clarityInstruction}\n\n${message}`;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: payloadText
                        }
                    ]
                }
            ]
        })
    };

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            options
        );

        const data = await response.json();

        if (!response.ok) {
            const errorText = data?.error?.message || "Unknown Gemini API error";
            throw new Error(`Gemini API error ${response.status}: ${errorText}`);
        }

        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) {
            throw new Error("No response text received from Gemini API");
        }

        return reply;
    } catch (err) {
        console.error("Gemini API request failed:", err);
        throw err;
    }
};

module.exports = getGeminiAPIResponse;