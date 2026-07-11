export const generateLisaResponseStream = async (messages, onChunk, activeFlow) => {
  // 1. Setup API Key Queue for 6 keys
  const keys = [
    import.meta.env.VITE_GROQ_KEY_1,
    import.meta.env.VITE_GROQ_KEY_2,
    import.meta.env.VITE_GROQ_KEY_3,
    import.meta.env.VITE_GROQ_KEY_4,
    import.meta.env.VITE_GROQ_KEY_5,
    import.meta.env.VITE_GROQ_KEY_6
  ].filter(Boolean);

  if (keys.length === 0) {
    throw new Error("No Groq API keys found. Please check VITE_GROQ_KEY_1 to 6 in your .env file.");
  }

  // 1. Basic Sanitization
  const safeMessages = messages.map(msg => {
    let safeRole = 'user';
    if (msg.role === 'model' || msg.role === 'bot' || msg.role === 'assistant' || msg.role === 'ai') {
      safeRole = 'assistant';
    } else if (msg.role === 'system') {
      safeRole = 'system';
    }
    return {
      role: safeRole,
      content: String(msg.content || msg.text || '').trim()
    };
  }).filter(msg => msg.content !== '');

  // 2. Advanced Llama 3 Sequence Fix: Merge consecutive messages of the same role
  const formattedMessages = [];
  for (const msg of safeMessages) {
    if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === msg.role) {
      // Append to previous message if role is exactly the same
      formattedMessages[formattedMessages.length - 1].content += '\n\n' + msg.content;
    } else {
      formattedMessages.push(msg);
    }
  }

  // 3. The First Message Rule Fix: Ensure it doesn't start with 'assistant'
  if (formattedMessages.length > 0 && formattedMessages[0].role === 'assistant') {
    // Prepend a silent system/user context so Llama doesn't crash
    formattedMessages.unshift({
      role: 'system',
      content: 'You are Lisa Pro, a helpful AI assistant. The conversation begins now.'
    });
  }

  let flowInstruction = "";

  if (activeFlow === 'prompt') {
    flowInstruction = `You are the Prompt Architect, an expert in high-fidelity, ultra-realistic image and video generation.
    
    You MUST strictly follow these 3 sequential phases:
    
    PHASE 1: GATHERING (1-by-1 MCQ)
    Ask ONLY ONE question at a time to build the visual concept. 
    - e.g., Question 1 might be about visual tone (Cinematic vintage, Retro film-like, etc.).
    - e.g., Question 2 might be about framing (Close-up, David LaChapelle style wide-shot, etc.).
    Wait for the user to answer before moving to the next question. Do NOT generate the final prompt yet.
    
    PHASE 2: THE PREVIEW & CONFIRMATION
    Once you have gathered enough details (after 2 or 3 questions), DO NOT output the final prompt.
    Instead, show a summary of what you are about to generate.
    Example: "Here are the elements I will include in the final prompt: [List Elements]. Shall I generate it now?"
    You MUST provide these exact options for confirmation:
    [A] Yes, generate the final prompt
    [B] No, let's change/add something
    [E] Custom (I will type my own)
    
    PHASE 3: THE FINAL PROMPT
    ONLY AFTER the user explicitly selects "Yes" in Phase 2, you may output the final, highly-detailed prompt text.
    
    CRITICAL FORMATTING: Whenever you ask a multiple-choice question in Phase 1 or Phase 2, you MUST format the options EXACTLY like this on new lines:
    [A] <Option 1>
    [B] <Option 2>
    [C] <Option 3>
    [D] <Option 4>
    [E] Custom (I will type my own)`;
  } else if (activeFlow === 'code') {
    flowInstruction = `You are the Code Builder. You must adapt to either Software or Hardware engineering based on the user's first choice.
  
  RULE 1: Ask ONLY ONE multiple-choice question at a time. Wait for the user to answer before asking the next.
  
  RULE 2: Your FIRST question must ALWAYS determine the engineering domain:
  "What is the primary domain for this code?"
  [A] Web Frontend (UI, React, JS, CSS)
  [B] Backend / API (Node, Python, DBs)
  [C] Hardware / IoT (ESP32, Arduino, Sensors)
  [D] AI / Data Processing (Python, Models)
  [E] Custom (I will type my own)
  
  RULE 3: Based on the user's answer to Q1, tailor Q2 and Q3 to that specific domain. 
  (e.g., If they choose Frontend, ask about frameworks/styling like Tailwind/React. If they choose IoT, ask about microcontrollers).
  
  RULE 4: Once you have enough context, generate the final output. The output MUST contain:
  - The clean, well-commented code snippet.
  - A brief explanation using extremely simple, one-line points.
  
  CRITICAL FORMATTING: Whenever you ask a multiple-choice question, you MUST format the options EXACTLY like this on new lines:
  [A] <Option 1>
  [B] <Option 2>
  [C] <Option 3>
  [D] <Option 4>
  [E] Custom (I will type my own)`;
  } else if (activeFlow === 'mail') {
    flowInstruction = `You are the Mail Drafter. Ask strictly ONE multiple choice question at a time regarding tone, recipient, and core message before drafting the email. Draft the following email in professional English based on the user's request.`;
  } else {
    flowInstruction = `You are Lisa PRO, an elite, highly advanced AI system architect and copilot. 
    
    Your personality is sharp, highly intelligent, concise, and professional (similar to an advanced sci-fi AI like Jarvis or Friday).
    
    CRITICAL RULES FOR GENERAL CHAT:
    1. NEVER use generic, robotic greetings like "I am an AI...", "As an AI language model...", or "How can I assist you today?".
    2. If the user simply says "Hi", "Hello", or greets you, reply with a short, cool, and elite acknowledgment. (e.g., "Systems online. What are we building today?", or "Ready. Awaiting your command.").
    3. Keep all general answers extremely direct, zero-fluff, and highly technical. 
    4. If the user asks you to write code, draft an email, or generate an image prompt in this general chat, briefly provide the answer but subtly remind them that you have dedicated 'Code Builder', 'Mail & Docs', and 'Prompt Architect' modules optimized for those exact tasks.`;
  }

  const baseRule = `
CRITICAL FORMATTING RULE: 
Whenever you ask a multiple-choice question, you MUST format the options EXACTLY like this on new lines:
[A] <First specific option>
[B] <Second specific option>
[C] <Third specific option>
[D] <Fourth specific option>
[E] Custom (I will type my own)

Do not use bolding or extra characters around the brackets. Wait for the user to select before proceeding.

CRITICAL RULE FOR FINAL OUTPUT:
When providing the final generated code, prompt, or text, you MUST output ONLY the raw content. 
DO NOT include ANY conversational filler, pleasantries, or introductory/concluding phrases (e.g., NEVER say "Here is the prompt:").

*** ZERO-TOLERANCE LANGUAGE OVERRIDE ***
1. The user will speak to you in "Tanglish" (Tamil spoken via English alphabet, e.g., "en boss ku email pannanum"). 
2. UNDER NO CIRCUMSTANCES are you allowed to output text in the Tamil script (e.g., தமிழ்). 
3. Your entire response, especially the final artifacts (Emails, Code, Prompts, Summaries), MUST be strictly in professional, high-quality ENGLISH.
4. You can acknowledge the user's intent, but do not translate the response into Tamil. Always reply in English.

CRITICAL ARTIFACT FORMATTING RULE:
Whenever you generate a final email draft, code snippet, or visual prompt, you MUST wrap ONLY the core content inside triple backticks (\`\`\`). 
Example: 
Here is your draft:
\`\`\`
Dear Boss,
...
\`\`\`
`;
  if (activeFlow) flowInstruction += baseRule;

  const customName = localStorage.getItem('lisaCustomName') || '';
  const customContext = localStorage.getItem('lisaCustomContext') || '';
  let systemContent = flowInstruction;

  if (customName) systemContent += `\n    The user's name is: ${customName}.`;
  if (customContext) systemContent += `\n    The user's context/goals: ${customContext}.`;

  formattedMessages.unshift({
    role: 'system',
    content: systemContent
  });


  if (formattedMessages.length === 0) {
    throw new Error("Message array is empty after sanitization.");
  }

  // 2. Loop through keys (Fallback Mechanism)
  for (let i = 0; i < keys.length; i++) {
    const currentKey = keys[i];
    
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentKey}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // CORRECT WORKING MODEL
          messages: formattedMessages, // Must use the sanitized array here!
          stream: true
        })
      });

      if (!response.ok) {
        // If Rate Limit (429) or Server Error (503), try the next key
        if (response.status === 429 || response.status === 503) {
          console.warn(`API Key ${i + 1} reached limit/error. Switching to next key...`);
          continue; 
        }
        throw new Error(`API request failed with status ${response.status}`);
      }

      // 3. Handle Streaming Response
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                onChunk(data.choices[0].delta.content);
              }
            } catch (e) {
              // Ignore partial chunk parse errors
            }
          }
        }
      }
      return; // Exit function completely on success

    } catch (error) {
      // If it's the last key in the queue, throw the error to the UI
      if (i === keys.length - 1) {
        console.error("All API keys failed:", error);
        throw error;
      }
    }
  }
};
