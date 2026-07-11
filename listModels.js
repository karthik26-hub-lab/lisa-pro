import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

let apiKey = '';

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  const match = envContent.match(/VITE_GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/);
  if (match && match[1]) {
    apiKey = match[1].trim();
  }
} catch (e) {
  // env.local not found or unreadable
}

if (!apiKey) {
  console.error("❌ Error: VITE_GEMINI_API_KEY is empty or missing in your .env.local file.");
  console.log("Please add your key to .env.local first, then run: node listModels.js");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    console.log("Connecting to Gemini API and listing models...\n");
    const result = await genAI.listModels();
    console.log("Model names exactly as they appear in response:");
    console.log("----------------------------------------------");
    result.models.forEach(model => {
      // Print the short name after 'models/' or the full name
      console.log(model.name);
    });
    console.log("----------------------------------------------");
  } catch (error) {
    console.error("❌ API Request failed:", error.message);
  }
}

run();
