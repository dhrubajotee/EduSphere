# EduSphere Client (Frontend)

The **EduSphere Client** is a **React + Vite** frontend designed for seamless AI interaction — combining **modern UI, AI streaming chat, and academic visualization**.

---

## 🧩 Key Features

- 💬 **ChatGPT-style streaming chat** with Ollama backend.  
- 🎓 **Transcript upload** and **AI-based recommendations**.  
- 🧠 **Scholarship discovery** through Brave Search + AI.  
- 📄 **Downloadable PDF summaries** with professional formatting.  
- 🧭 **Dashboard** displaying academic statistics and results.  

---

## ⚙️ Setup

### Prerequisites
- Node.js 20+  
- Backend server running at http://localhost:8080  

### Install & Run

```bash
cd client
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

---

## 📁 Directory Structure

```plaintext
client/
├── src/
│   ├── api/axiosClient.js      # Axios config with token & timeout handling
│   ├── components/
│   │   ├── RecommendationsSection.jsx
│   │   ├── ChatSection.jsx
│   │   └── Header.jsx
│   └── main.jsx
└── index.html
```

---

## 🧠 Chat Streaming

- Uses `fetch()` + `ReadableStream` to render responses live.  
- Supports markdown rendering with syntax highlighting.  
- Renders messages as chat bubbles with dynamic scrolling.  

---

## 🔐 Authentication

- Managed with Paseto tokens from backend.  
- Stored locally (cleared on logout or 401 response).  

---

## 🧾 PDF Download

- Integrated download handler fetches binary blobs securely.  
- Each summary includes course matches + scholarships.  

---

## 🎨 UI Design

- Built with TailwindCSS.  
- Lucide-react icons for consistency.  
- Responsive design for both desktop and mobile.  

---

## 💡 Future Enhancements

- Chat memory (context persistence).  
- AI persona switching (Academic Advisor, Research Mentor, etc.).  
- Dark mode and UX animations.
