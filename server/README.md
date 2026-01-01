# EduSphere Server (Backend)

The **EduSphere Server** is a **production-grade Golang backend** built with **Fiber**, **PostgreSQL**, and **Ollama AI integration**.  
It powers all core AI and data processing features — from transcript parsing to recommendation generation, scholarship retrieval, and PDF report creation.

---

## 🧩 Core Features

- 🧠 **AI Summarization** — Generates academic summaries from transcript text.  
- 🎯 **AI Recommendations** — Suggests courses and research directions based on inferred strengths.  
- 🌍 **AI Scholarships** — Integrates Brave Search + LLM reasoning to discover and rank scholarships.  
- 📄 **PDF Generation** — Exports unified summaries and clickable reports.  
- 💬 **Streaming Chat** — Real-time streaming chat interface using Ollama.  
- 🔐 **JWT Authentication** — Secure login using Paseto tokens.

---

## ⚙️ Setup

### Prerequisites
- Go 1.22+  
- PostgreSQL  
- Ollama installed locally with model `gemma3:4b-it-qat`  

### Environment Variables (`.env`)
```bash
DB_SOURCE=postgresql://username:password@localhost:5432/edusphere?sslmode=disable
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b-it-qat
TOKEN_SYMMETRIC_KEY=12345678901234567890123456789012
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Database Migrations
```bash
make migrateup
```

### Run the Server
```bash
go run main.go
```

Server runs at **http://localhost:8080**

---

## 🧠 Architecture

```plaintext
server/
├── api/            # Fiber HTTP handlers (REST + AI endpoints)
├── db/sqlc/        # PostgreSQL queries (auto-generated via sqlc)
├── util/           # Configs, environment management
├── token/          # Paseto token handling
└── main.go         # Entry point
```

---

## 🔁 AI Workflow

1. **Transcript Extraction** → User uploads → Text is extracted & stored.  
2. **Summary Generation** → Model summarizes strengths & skills.  
3. **Recommendation AI** → Suggests course paths.  
4. **Scholarship Fetcher** → Uses Brave API → AI filters relevant results.  
5. **PDF Writer** → Creates polished, professional report.  

---

## 🔌 Streaming Chat Endpoint

**Route:** `/api/chat/stream`  
Supports real-time token streaming directly from Ollama to the frontend via SSE.  

Example response stream:
```json
data: Hello there!
data: How can I help you today?
data: [DONE]
```

---

## 🧾 PDF Reports

- Generated using `gofpdf`  
- Includes transcript summary, recommendations, and scholarships  
- Contains clickable external links  
- Stored in `/summaries` directory  

---

## 🧰 Development Notes

- Uses **Fiber v2** for performance and simplicity  
- **sqlc** generates type-safe DB code  
- Supports hot-reload via [air](https://github.com/cosmtrek/air)  
- Follows clean modular structure

---

## ✅ Example Run

```bash
# start PostgreSQL
make postgres

# migrate and run
make migrateup
make seedCourses
go run main.go
```

Logs:
```
[INIT] Ollama model ready ✅
Server running on http://localhost:8080
```
