import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, history } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // 1. Check if client provided a custom key in the Authorization header
  let customKey = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const keyCandidate = authHeader.substring(7).trim();
    if (keyCandidate && keyCandidate !== 'null' && keyCandidate !== 'undefined' && keyCandidate !== '""') {
      customKey = keyCandidate;
    }
  }

  // 2. Select keys to try
  let keysToTry = [];
  if (customKey) {
    keysToTry = [customKey];
  } else {
    const envKeys = process.env.GEMINI_API_KEYS || '';
    keysToTry = envKeys.split(',').map(k => k.trim()).filter(Boolean);
  }

  if (keysToTry.length === 0) {
    return res.status(429).json({
      error: 'DEFAULT_KEYS_EXHAUSTED',
      message: 'No server API keys are configured. Please enter your own Gemini API key to proceed.'
    });
  }

  const MODEL_NAME = 'gemini-2.5-flash';

  let lastError = null;

  // 3. Try each key until one succeeds or all fail
  while (keysToTry.length > 0) {
    const idx = Math.floor(Math.random() * keysToTry.length);
    const apiKey = keysToTry[idx];
    
    // Remove from candidate pool so we do not retry this key
    keysToTry.splice(idx, 1);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: 'You are Lisa AI, a premium, intelligent creative assistant. Your goal is to help the user design, refine, and optimize ideas into perfect creative prompts, code snippets, or artwork specs. Keep your responses structured, premium, and concise. Use clear headings, bullet points, and code blocks where appropriate. Avoid overly verbose explanations.'
      });

      const chatHistory = (history || []).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      const chat = model.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessage(prompt);
      const responseText = result.response.text();

      return res.status(200).json({ text: responseText });
    } catch (err) {
      console.error(`Gemini API Error with key index ${idx}:`, err.message);
      lastError = err;

      // Model Verification check: if a 400 or 404 error occurs, first verify if the model name is correct
      const isRateOrAuthError = err.message.includes('429') || err.message.includes('401') || err.message.includes('403') || err.message.includes('API_KEY');
      const isClientError = err.message.includes('400') || err.message.includes('404');
      
      if (isClientError && !isRateOrAuthError) {
        if (MODEL_NAME !== 'gemini-2.5-flash') {
          return res.status(400).json({
            error: 'MODEL_VERIFICATION_FAILED',
            message: `Model name verification failed: Expected 'gemini-1.5-flash' but configured '${MODEL_NAME}'.`
          });
        }
      }

      // If this is the user's custom key, fail immediately instead of trying defaults
      if (customKey) {
        return res.status(400).json({
          error: 'USER_KEY_ERROR',
          message: `Your custom API key failed: ${err.message}`
        });
      }
    }
  }

  // 4. If all keys fail (e.g., all 429'd or rate limited)
  return res.status(429).json({
    error: 'DEFAULT_KEYS_EXHAUSTED',
    message: `All server-side default API keys are exhausted or rate-limited. ${lastError ? lastError.message : ''}`
  });
}
