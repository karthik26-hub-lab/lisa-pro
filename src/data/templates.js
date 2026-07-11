export const promptTemplates = [
    {
        id: 'image',
        title: '🎨 Image Generation',
        fields: [
            { id: 'subject', label: 'What is the main subject?', type: 'text', placeholder: 'e.g., A futuristic sports car racing' },
            { id: 'style', label: 'Visual Style', type: 'select', options: ['Ultra-Realistic', 'Cinematic Vintage Portrait', 'Retro Film-like Tone', 'Anime'] },
            { id: 'lighting', label: 'Lighting', type: 'select', options: ['Cinematic', 'Natural / Golden Hour', 'Neon / Cyberpunk'] }
        ],
        generatePrompt: (data) => `Act as an expert AI prompt engineer. Create a detailed Midjourney prompt for: ${data.subject}. Visual Style: ${data.style}. Lighting: ${data.lighting}. Provide ONLY the final prompt text. No watermarks.`
    },
    {
        id: 'code',
        title: '💻 Code Generator',
        fields: [
            { id: 'task', label: 'What should the code do?', type: 'text', placeholder: 'e.g., Read values from a gas sensor and turn on a relay' },
            { id: 'language', label: 'Language / Framework', type: 'select', options: ['Arduino / C++', 'React / JavaScript', 'Python', 'OpenCV'] },
            { id: 'complexity', label: 'Complexity', type: 'select', options: ['Simple & Concise (One-liners)', 'Detailed with comments', 'Advanced Architecture'] }
        ],
        generatePrompt: (data) => `Write clean, efficient ${data.language} code to ${data.task}. Style: ${data.complexity}. Provide only the code block and a 1-line simple explanation.`
    },
    {
        id: 'email',
        title: '📧 Email Draft',
        fields: [
            { id: 'recipient', label: 'Who are you writing to?', type: 'text', placeholder: 'e.g., HOD, Event Sponsor, Client' },
            { id: 'topic', label: 'What is the topic?', type: 'text', placeholder: 'e.g., Inviting them as chief guest for XION 26 tech fest' },
            { id: 'tone', label: 'Tone of Voice', type: 'select', options: ['Professional & Formal', 'Persuasive', 'Friendly & Casual'] }
        ],
        generatePrompt: (data) => `Draft a ${data.tone} email to ${data.recipient} about: ${data.topic}. Keep it impactful, clear, and ready to send.`
    }
];