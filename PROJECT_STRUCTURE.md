# ToolHubs — Project Structure

ToolHubs is an internal engineering tools hub with a built-in chatbot. The repo holds **three independent Node.js projects**. Each one has its own `package.json`, its own `node_modules` and its own `.env`, and each runs as a separate process.

| Folder | What it is | Stack | Default port |
|---|---|---|---|
| `Frontend/` | The website people open in the browser | React 19, Vite 7, Tailwind 4 | `5173` |
| `Backend/` | REST API that serves the list of tools | Express 4, Mongoose, MongoDB | `5000` |
| `rag_base_3/` | Chatbot API that answers questions from Notion and GitHub content | Express 5, LangChain, Google Gemini, Pinecone | `5678` |

---

## How the pieces connect

```
                        ┌──────────────────────────┐
                        │   Frontend  (:5173)      │
                        │   React app in browser   │
                        └─────┬──────────────┬─────┘
            tools list/detail │              │ chatbot questions
          GET /api/tools[/:id]│              │ POST /api/chat (SSE stream)
                              ▼              ▼
              ┌──────────────────┐    ┌──────────────────────────┐
              │ Backend (:5000)  │    │ rag_base_3 (:5678)       │
              │ Express API      │    │ api_server.js            │
              └────────┬─────────┘    └──────┬────────────┬──────┘
                       ▼                     ▼            ▼
                   MongoDB             Pinecone       Gemini
                 (tools data)        (vector store)  (embeddings + answers)
                                            ▲
                     ┌──────────────────────┴────────────────────────┐
                     │ Ingestion, run separately:                     │
                     │  notion_seeding/orchestration.js  (Notion)     │
                     │  github_seeding/ingestGithub.js   (GitHub)     │
                     │  *_webhook_handler.js  (live updates, :3000/1) │
                     └────────────────────────────────────────────────┘
```

- The **tools pages** get their data from the Backend, and the Backend reads it from MongoDB.
- The **chatbot widget** talks only to `rag_base_3`. It never calls the Backend.
- Before the chatbot can answer anything, Notion pages and GitHub repos have to be loaded into Pinecone by the ingestion scripts. The webhook handlers then keep Pinecone up to date when the source content changes.

---

## Folder tree

`node_modules/` and `.env` files are left out of the tree. Both are git-ignored and exist only on your machine.

```
ToolHubs/
├── README.md                     # Setup guide for Frontend + Backend
├── PROJECT_STRUCTURE.md          # This file
│
├── Frontend/
│   ├── index.html                # HTML shell that Vite injects the app into
│   ├── vite.config.js            # Vite config (React + Tailwind plugins)
│   ├── eslint.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx              # Entry point: mounts <App /> into index.html
│       ├── App.jsx               # Router and page layout
│       ├── App.css, index.css    # Global styles
│       ├── Component/            # Reusable pieces used across pages
│       │   ├── Navbar/           # Fixed top navigation bar
│       │   ├── Toolcard/         # One tool card on the home page grid
│       │   └── ChatbotWidget/    # Floating chat window
│       │       ├── ChatbotWidget.jsx   # Open/close, fullscreen, calls the RAG API
│       │       ├── ChatbotContext.jsx  # React context so any page can open the chat
│       │       ├── ChatMessages.jsx    # Renders messages (markdown via marked + DOMPurify)
│       │       └── ChatInput.jsx       # Text box, sends on Enter
│       └── Pages/                # One folder per route
│           ├── HomePage/         # "/"  — grid of all tools
│           ├── ToolsDetails/     # "/tools/:id" — tool details and guides (the active one)
│           ├── ToolDetailsPage/  # Older details page, see note below
│           └── ContactPage/      # "/contact"
│
├── Backend/
│   ├── Server.js                 # Entry point: Express app, MongoDB connection, routes
│   ├── package.json
│   ├── routes/
│   │   └── ToolRoutes.js         # Maps URLs under /api/tools to controller functions
│   ├── controllers/
│   │   └── ToolController.js     # getTools, getToolById, createTool, updateTool, deleteTool
│   ├── models/
│   │   └── Tool.js               # Mongoose schema for a tool
│   └── seed/
│       ├── defaultTools.js       # Master list of tools. Edit this to add or change tools
│       ├── seed.js               # Inserts the default tools into an empty DB
│       └── syncTools.js          # Upserts defaultTools.js into the DB (safe to re-run)
│
└── rag_base_3/
    ├── api_server.js             # Entry point for the chatbot: POST /api/chat
    ├── rag_chain.js              # Retrieval + answer generation (LangChain)
    ├── clean_db.js               # Helpers to delete Notion/GitHub vectors from Pinecone
    ├── notion_webhook_handler.js # Re-indexes a Notion page when it changes (:3000)
    ├── github_webhook_handler.js # Re-indexes repo files on GitHub push (:3001)
    ├── state_after_embedding.json# Record of what has already been embedded
    ├── .npmrc                    # legacy-peer-deps=true (see note below)
    ├── package.json
    ├── readme.md                 # Detailed RAG documentation
    ├── notion_seeding/           # One-time / bulk import from Notion
    │   ├── orchestration.js      # Run this: extract → preprocess → embed → upsert
    │   ├── notion_data_extracter.js  # Pulls pages from the Notion API (starts at PAGE_ID)
    │   ├── data_preprocess.js    # Cleans text, redacts PII, splits into chunks
    │   ├── makeLangChainDocuments.js # Converts chunks to LangChain Document objects
    │   ├── gemini_embeddings.js  # Gemini embeddings wrapper
    │   └── langchain_embed_upsert.js # Embeds chunks and upserts them to Pinecone
    └── github_seeding/           # Bulk import from GitHub
        ├── config.js             # Which repos to index, Pinecone index name
        └── ingestGithub.js       # Run this: fetches repo files and upserts to Pinecone
```

---

## Each project in more detail

### Frontend

A single-page React app built with Vite. `main.jsx` mounts `App.jsx`. `App.jsx` sets up the routes, wraps everything in `ChatbotProvider` and places `Navbar` and `ChatbotWidget` on every page.

| Route | Page | Data source |
|---|---|---|
| `/` | `Pages/HomePage` | `GET {VITE_API_URL}/api/tools` |
| `/tools/:id` | `Pages/ToolsDetails` | `GET {VITE_API_URL}/api/tools/:id` |
| `/contact` | `Pages/ContactPage` | Static content |
| *(on every page)* | `Component/ChatbotWidget` | `POST {VITE_CHAT_API_URL}` |

The code is split into two folders:
- `Component/` holds UI building blocks that are used inside pages.
- `Pages/` holds one folder per route.

Each component or page keeps its `.jsx` and `.css` together in one folder.

> **Note:** `App.jsx` registers `/tools/:id` twice. React Router uses the first match, so `ToolsDetails` is the page that renders, and `ToolDetailsPage` is never shown. `ToolDetailsPage` also hardcodes `http://localhost:5000` instead of reading `VITE_API_URL`.

### Backend

A plain Express API with the usual routes → controllers → models layering:

1. `Server.js` connects to MongoDB using `MONGO_URI`. The HTTP server starts listening only after the connection succeeds.
2. `routes/ToolRoutes.js` is mounted at `/api/tools`.
3. `controllers/ToolController.js` holds the logic for each endpoint.
4. `models/Tool.js` defines the shape of a tool document.

| Method | URL | Purpose |
|---|---|---|
| GET | `/api/tools` | List all tools |
| GET | `/api/tools/:id` | One tool |
| POST | `/api/tools` | Create a tool |
| PUT | `/api/tools/:id` | Update a tool |
| DELETE | `/api/tools/:id` | Delete a tool |
| GET | `/` | Health check |

**Tool document shape** (`models/Tool.js`):

```js
{
  id: String,            // unique, used in the URL (/tools/:id)
  name: String,
  category: String,
  description: String,
  companyDocument: String,
  officialLink: String,
  guide: { about, signup, login, usage }   // all strings
}
```

**The `seed/` folder** is how tool data gets into MongoDB. `defaultTools.js` is the source of truth. After editing it, run `node seed/syncTools.js` so the database matches.

### rag_base_3 (chatbot)

This project has two separate parts.

**1. Ingestion (offline, run by hand)** loads knowledge into Pinecone:
- `notion_seeding/orchestration.js` starts at a Notion page and walks its child pages. It cleans the text, splits it into chunks, embeds each chunk with Gemini (`gemini-embedding-001`, 768 dimensions) and upserts the vectors into Pinecone.
- `github_seeding/ingestGithub.js` does the same for the repos listed in `github_seeding/config.js`.
- `state_after_embedding.json` stores a hash of every page and chunk that has already been embedded. Re-runs use it to skip unchanged content.

**2. Serving (always running)** answers questions:
- `api_server.js` exposes `POST /api/chat` with body `{ "question": "..." }` and streams the answer back as Server-Sent Events.
- `rag_chain.js` embeds the question and fetches the 5 closest chunks from Pinecone. It then asks `gemini-2.5-flash` to answer using only those chunks, with links to the sources.

**Keeping data fresh (optional):** `notion_webhook_handler.js` and `github_webhook_handler.js` are small Express servers. Notion or GitHub calls them when content changes, and they re-index only the pages or files that changed. For local testing, expose them with a tunnel such as ngrok.

> **Note:** `rag_base_3` has no `npm run` scripts. Every entry point is started with `node <file>.js`.
>
> **Note:** `rag_base_3/.npmrc` sets `legacy-peer-deps=true`. Without it `npm install` fails with `ERESOLVE`, because `@langchain/pinecone@0.2.0` declares a peer of `@pinecone-database/pinecone@^5` while the project uses v6, and `@langchain/community` pulls in an optional peer that wants `dotenv@^16`. The code works with the installed versions. The real fix is upgrading to LangChain 1.x.

---

## Ports at a glance

| Process | Started from | Port | Env var to change it |
|---|---|---|---|
| Frontend dev server | `Frontend/` → `npm run dev` | 5173 | (Vite default) |
| Backend API | `Backend/` → `npm run dev` | 5000 | `PORT` |
| RAG chat API | `rag_base_3/` → `node api_server.js` | 5678 | `SERVER_PORT` |
| Notion webhook | `rag_base_3/` → `node notion_webhook_handler.js` | 3000 | `NOTION_WEBHOOK_PORT` |
| GitHub webhook | `rag_base_3/` → `node github_webhook_handler.js` | 3001 | `GITHUB_WEBHOOK_PORT` |
