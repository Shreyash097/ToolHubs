# ToolHubs

A website that lists engineering tools with step-by-step guides, plus an AI chatbot that answers questions from your Notion pages and GitHub READMEs.

The project has 3 parts. Each one runs in its own terminal:

| Folder | What it is | Runs on |
|---|---|---|
| `Frontend` | The website | http://localhost:5173 |
| `Backend` | Tools data (MongoDB) | http://localhost:5000 |
| `rag_base_3` | AI chatbot | http://localhost:5678 |

---

## 1. Install Node.js 22

This project needs **Node 22**. Older versions (like Node 18) will not work.

Check your version:

```bash
node -v
```

If it doesn't start with `v22`, install it with [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 22
nvm use 22
```

> Run `nvm use 22` again every time you open a new terminal.

---

## 2. Get the code

```bash
git clone https://github.com/Shreyash097/ToolHubs.git
cd ToolHubs
```

---

## 3. Create the `.env` files

Create one `.env` file in each folder and paste the text below. Replace the `your_...` values with your own keys.

**`Frontend/.env`**

```env
VITE_API_URL=http://localhost:5000
VITE_CHAT_API_URL=http://localhost:5678/api/chat
```

**`Backend/.env`**

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

**`rag_base_3/.env`**

```env
GOOGLE_API_KEY=your_gemini_key
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-embedding-001
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=your_pinecone_index_name
PINECONE_NAMESPACE=__default__
SERVER_PORT=5678
NOTION_TOKEN=your_notion_token
GITHUB_ACCESS_TOKEN=your_github_token
STATE_FILE=./state_after_embedding.json
```

Where to get the keys:

- **MongoDB:** free database at [cloud.mongodb.com](https://cloud.mongodb.com) → Connect → copy the connection string
- **Gemini:** [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (use the same key twice)
- **Pinecone:** [app.pinecone.io](https://app.pinecone.io) → create an index with **dimension 768** and metric **cosine**
- **Notion:** [notion.so/my-integrations](https://www.notion.so/my-integrations) → create an integration, then share your pages with it
- **GitHub:** Settings → Developer settings → Personal access tokens

> `.env` files hold your secret keys. They are ignored by git, so they never get uploaded.

---

## 4. Start the project

Open **3 terminals**, one for each part.

**Terminal 1: Backend**

```bash
nvm use 22
cd Backend
npm install
node seed/syncTools.js
npm run dev
```

**Terminal 2: Chatbot**

```bash
nvm use 22
cd rag_base_3
npm install
node api_server.js
```

**Terminal 3: Website**

```bash
nvm use 22
cd Frontend
npm install
npm run dev
```

Now open **http://localhost:5173** in your browser. 🎉

> `npm install` and `node seed/syncTools.js` are only needed the **first time**. After that, just run the last command in each terminal.

---

## 5. Give the chatbot some knowledge (one time)

The chatbot can only answer from data you load into Pinecone. In the `rag_base_3` folder, run:

```bash
# Load your Notion pages
node notion_seeding/orchestration.js

# Load README files from your GitHub repos
# (list the repos first in github_seeding/config.js)
node github_seeding/ingestGithub.js
```

Run these again whenever you want the chatbot to learn new content.

---

## Add or change a tool

1. Edit `Backend/seed/defaultTools.js`
2. Run:

   ```bash
   cd Backend
   node seed/syncTools.js
   ```

3. Refresh the website.

---

## Common problems

| Problem | Fix |
|---|---|
| `npm install` fails with `ERESOLVE` in `rag_base_3` | Make sure the file `rag_base_3/.npmrc` exists |
| Errors when starting the website or chatbot | You're not on Node 22. Run `nvm use 22` |
| Backend says `MongoDB connection failed` | Check `MONGO_URI`. In MongoDB Atlas, allow your IP under **Network Access** |
| Website says "Couldn't load tools" | The backend is not running |
| Chatbot says `text-embedding-004 is not found` | Set `GEMINI_MODEL=gemini-embedding-001` in `rag_base_3/.env` |
| Chatbot has no useful answers | Load data first (step 5) |

---

Want to know what each file does? See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).
