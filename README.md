# 🧠 Lisa PRO - Elite AI Assistant

Lisa PRO is a highly polished, sci-fi-themed, and context-aware AI interface designed for maximum productivity. Built with a focus on premium UI/UX, it seamlessly handles everything from code generation to professional email drafting.

![Lisa PRO Version](https://img.shields.io/badge/Version-1.0.0-cyan)
![React](https://img.shields.io/badge/Built_with-React-blue?logo=react)
![Tailwind](https://img.shields.io/badge/Styled_with-Tailwind_CSS-38B2AC?logo=tailwind-css)

## ✨ Key Features

*   **🌌 Dark Glassmorphic UI:** A premium, Apple-style sleek interface with smooth transitions and floating command centers.
*   **📦 Smart Artifact Boxes:** Final outputs (Code, Emails, Prompts) are rendered in dedicated, isolated terminal-like boxes with a 1-click floating copy button.
*   **📤 Pro Export & Share:** Export conversations and artifacts instantly as **PDF, DOCX, or TXT**. Integrated with Native Web Share API to send files directly via WhatsApp, Mail, or Telegram.
*   **🗣️ Tanglish Native, English Pro:** Flawlessly understands "Tanglish" (Tamil transliterated in English) prompts, but strictly outputs high-quality, professional English for technical and formal tasks.
*   **⚡ Command Flow:** Use `/` slash commands to instantly trigger guided workflows (Prompt Architect, Code Builder, Mail & Docs).
*   **📱 Mobile-First:** Responsive icon-only headers, bottom action strips, and native OS share sheets optimized for mobile devices.

## 🛠️ Tech Stack

*   **Frontend:** React (Vite)
*   **Styling:** Tailwind CSS (Custom Dark Mode & Glassmorphism)
*   **Icons:** Lucide-React
*   **Export Handling:** `jspdf` (for PDF generation), Native Blob API (for DOCX/TXT)

## 🚀 Quick Start

To get this project running locally on your machine:

**1. Clone the repository:**
`git clone https://github.com/your-username/lisa-pro.git`

**2. Navigate to the project directory:**
`cd lisa-pro`

**3. Install dependencies:**
`npm install`

**4. Start the development server:**
`npm run dev`

## 🔑 Environment Variables
To run the AI features, make sure to add your API Key in a `.env` file at the root of your project:
```env
VITE_AI_API_KEY="your_api_key_here"