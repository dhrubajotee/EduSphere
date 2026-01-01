# EduSphere — AI-Powered Academic Assistant

> **Ambitious Full-Stack Generative AI Platform** built with **Golang Fiber**, **PostgreSQL**, and **React (Vite)** — demonstrating expertise in **OpenAI API integration, secure system design, and dynamic, context-aware reasoning.**

---

[![EduSphere Demo](https://img.youtube.com/vi/h8KXbBzOn1c/maxresdefault.jpg)](https://youtu.be/h8KXbBzOn1c)

> 📺 **[Watch the full end-to-end demo](https://youtu.be/h8KXbBzOn1c)** featuring core functionalities.

---

EduSphere transforms raw student transcripts into **actionable academic intelligence** (personalized course recommendations, scholarship matches, and real-time advice) powered by the speed and efficiency of **OpenAI's GPT-4o-mini**.

This project represents a **Full-Stack AI Systems Engineering solution**, blending backend scalability, complex AI pipelines, and modern UI design into a single, professional-grade product.

---

## Key Differentiators & Production-Ready Features

- **Contextual AI Reasoning Pipeline** 
    - Orchestrates multi-step reasoning (Summarization -> Filtering -> Matching) using **GPT-4o-mini**.
    - **Hybrid RAG Logic:** Combines static transcript data with real-time web search results (Brave API) for dynamic scholarship discovery.
- **Scalable Cloud Inference (OpenAI)**
    - Leverages **GPT-4o-mini** for high-throughput, low-latency reasoning, ensuring rapid responses for chat and recommendations while maintaining cost efficiency.
    - Implements robust error handling and response parsing for non-deterministic LLM outputs.
- **Robust Backend & Data Persistence**
    - Built on **Golang Fiber** and **PostgreSQL** for high-performance API delivery and secure, structured data storage (user-specific records, recommendations, and PDF paths).
- **Dynamic Chat & State Management**
    - Features a real-time, ChatGPT-style **streaming chat interface** built in React, fully context-aware of the user's latest transcript, recommended courses, and available scholarships.
- **Advanced Data Reporting & Control**
    - Generates dynamic, professional **PDF Reports** that are context-aware (course links, rationale, scholarship details).
    - **User Control Feature:** Implements a full **CRUD cycle** allowing users to **delete specific recommended courses**, with changes persisting immediately to the database and reflected in future PDF exports.

---

## System Architecture (A Full-Stack GenAI Platform)

| Layer | Stack | Key Responsibilities |
|-------|--------|-------------|
| **Frontend** | React (Vite), TailwindCSS | Real-time chat UX, responsive dashboards, secure state management. |
| **Backend** | **Golang (Fiber)**, PostgreSQL | **Token Auth (JWT)**, secure modular routing, concurrent request handling. |
| **AI Engine** | **OpenAI API (GPT-4o-mini)** | Transcript analysis, multi-step academic profiling, and conversational inference. |
| **Storage** | PostgreSQL + Filesystem | Structured persistence for recommendations and secure storage of generated PDFs. |
| **DevOps** | Docker, Makefile | Streamlined local development, build, and deployment workflow. |

---

## AI Systems Engineering Highlights

| Component | Technical Achievement |
|---|---|
| **Orchestration** | Custom prompt pipelines ensuring accurate, multi-step academic reasoning with GPT-4o-mini. |
| **Contextual Chat** | Secure injection of transcript, course, and scholarship JSON into the LLM system prompt for grounded answers. |
| **Hybrid Search** | Combining Brave Search API results with LLM filtering/ranking for robust scholarship matching. |
| **Scalability** | Golang's concurrency model handles long-running AI API calls without blocking the server's thread pool. |
| **Tooling** | Professional PDF generation pipeline (using `gofpdf`) that renders clickable course links and structured data. |

---

## System Workflow: From Upload to Insight

```plaintext
User Uploads Transcript/Sets Preference
         (Multipart Upload)
                  ↓
Step 1: Transcript Processing & Recommendation
         (API: POST /recommendations)
         - GPT-4o-mini extracts completed courses (history)
         - GPT-4o-mini filters available courses & assigns match scores (saved to DB)
                  ↓
Step 2: Dynamic Scholarship Discovery
         (API: POST /scholarships/generate)
         - Web Search (Brave API)
         - GPT-4o-mini filters & formats best matches (saved to DB)
                  ↓
Step 3: User Interaction
         - DELETE /recommendations/{reco_id}/courses/{course_id} (Updates DB payload)
         - POST /chat/stream (Contextual conversation via OpenAI)
                  ↓
Step 4: Reporting
         - POST /summaries (Generates context-aware PDF from latest DB payload)
```

---
### List of Functionalities this project can do

- **Advanced Transcript Analysis:** Parse and extract structured data from student transcripts using AI to identify academic history and performance.
- **AI-Powered Summarization:** Generate concise, high-quality academic profiles and strength assessments using **OpenAI GPT-4o-mini**.
- **Personalized Course Recommendation:** Orchestrate multi-step AI reasoning to recommend courses based on transcript history, user preferences, and database availability.
- **Hybrid Scholarship Discovery (RAG):** Perform real-time web searches (via **Brave Search API**) and filter results using LLM reasoning to find highly relevant scholarships.
- **Context-Aware AI Chat:** Provide a ChatGPT-style streaming chat interface that "knows" the user's uploaded transcript, recommended courses, and scholarship opportunities.
- **User-Controlled Customization:** Empower users to **delete specific recommended courses**, instantly updating their academic plan in the database.
- **Dynamic PDF Reporting:** Generate professional PDF reports that combine academic summaries, course recommendations (with clickable links), and scholarship matches into a single document.
- **Smart Data Merging:** Automatically merge disparate data sources (courses from DB, scholarships from Web) into a unified JSON payload for consistent reporting.
- **Production-Grade Cloud Inference:** Leverage **GPT-4o-mini** for high-throughput, low-latency AI responses, ensuring a snappy user experience.
- **Structured Data Persistence:** Store complex relationships (User $\leftrightarrow$ Transcript $\leftrightarrow$ Recommendation $\leftrightarrow$ Summary) using **PostgreSQL**.
- **Secure Authentication:** Implement robust user security with **JWT (JSON Web Token)** authentication and automatic session management.
- **Concurrent API Architecture:** Use **Golang Fiber’s** concurrency model to handle long-running AI tasks (like scraping or inference) without blocking the main server.
- **Real-Time State Management:** Handle complex frontend states (e.g., generating a summary while simultaneously searching for scholarships) using React.
- **Responsive UI/UX:** Feature a polished, mobile-responsive interface built with **React (Vite)**, **TailwindCSS**, and **Lucide Icons**.
- **Interactive Dashboards:** Display dynamic statistics, academic progress, and match scores in a clean, visual format.
- **Full Backend File Management:** Securely save, serve, and clean up generated PDF reports and uploaded documents.
- **Error Resilient Design:** Handle non-deterministic AI outputs and external API failures gracefully with user-friendly error messaging.

---

## Setup & Run

This guide walks you through setting up and running **EduSphere** locally using either **Docker Compose** (recommended) or a **manual development setup**.

---

## Prerequisites

Ensure the following tools are installed on your system:

* **Golang** ≥ 1.22
* **Node.js** ≥ 18
* **Docker** & **Docker Compose**
* **OpenAI API Key** (configured in a `.env` file)
* **Brave Search API Key** (configured in a `.env` file)

---

## System Dependencies (OCR & PDF Processing)

EduSphere relies on **Tesseract OCR** and **Poppler** for processing student transcripts (OCR + PDF rendering).

### macOS (Homebrew)

```bash
brew install poppler
brew install tesseract
brew install leptonica
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y \
  libleptonica-dev \
  libtesseract-dev \
  tesseract-ocr
```

---

## Quick Start (Docker Compose) — Recommended

The fastest way to spin up the full stack (**PostgreSQL + Go backend**) is via Docker Compose using the provided **Makefile**.

```bash
# Build and run backend and database services along with frontend
make build
make migrateup
make seedCourses
```

make build command internally runs:

```bash
docker-compose build --no-cache
docker-compose up -d
@echo "✅ Application running at http://localhost:3000"
```

and starts:

* PostgreSQL database
* Go Fiber API server
* React Frontend

---

## Manual Development Setup

If you prefer running services individually without Docker, follow the steps below.

### Backend (Go)

```bash
cd server

make postgres
make createdb
make migrateup
make seedCourses

```

### Frontend (Node.js)

```bash
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## Environment Configuration

Create a `.env` file in the project root directory and ensure it contains:

```env
OPENAI_API_KEY=your_api_key_here
BRAVE_API_KEY=your_api_key_here
```

---

## Key Features Summary

| Feature | Description |
|----------|--------------|
| AI Transcript Summarization | LLM-based academic insight extraction |
| Course Recommendations | Personalized academic paths based on transcript content |
| Scholarship Discovery | Brave API + AI filtering for relevant global scholarships |
| Dynamic PDF Reports | Summaries, recommendations, and scholarships in one file |
| Real-Time Chat | ChatGPT-style chat with streaming responses |

---

## Why It Matters

EduSphere demonstrates **end-to-end Generative AI Systems Engineering** — combining **AI reasoning, backend scalability, and human-centered interaction** into a seamless platform.

It’s designed to showcase the kind of **architecture and applied AI thinking** that modern companies expect from **AI Engineers and Full-Stack Developers** building production-grade GenAI tools.

---

## Built With

- **Golang (Fiber Framework)** — backend & API design  
- **PostgreSQL** — structured relational data storage  
- **React + Vite + TailwindCSS** — frontend experience  
- **Docker + Makefile** — streamlined dev & deployment environment  

---

## Project Scope

EduSphere reflects:  
- Real-world **LLM orchestration** and **AI safety practices**  
- Production-grade **backend design principles**  
- Deep understanding of **human-AI interaction systems**  
- Full-stack integration of **AI, data, and UX**  

---

> **EduSphere** — A showcase of applied AI engineering, full-stack system design, and the power of local intelligence.
