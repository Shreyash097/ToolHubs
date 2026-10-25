// rag_chain_modified.js

import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { GeminiEmbeddings } from "./notion_seeding/gemini_embeddings.js";
import { TaskType } from "@google/generative-ai";

export async function createRAGChain() {
  // 1. Initialize our external services (No changes here)
  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    streaming: true,
  });
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
  const geminiEmbeddings = new GeminiEmbeddings({
    model: process.env.GEMINI_MODEL || "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  // 2. Initialize a PineconeStore for retrieval (No changes here)
  const vectorStore = await PineconeStore.fromExistingIndex(geminiEmbeddings, {
    pineconeIndex,
    namespace: process.env.PINECONE_NAMESPACE,
  });

  const retriever = vectorStore.asRetriever({ k: 5 });

  // 3. Create a prompt template with better formatting instructions
  const promptTemplate = `You are a helpful assistant that answers questions based on the provided context.

RESPONSE STRUCTURE:
Your answer MUST follow this exact structure:

## 📝 Answer
Provide a clear, direct, and concise answer to the user's question.

## 📖 Details
Expand on the answer with additional explanations, context, or examples. Use bullet points or numbered lists for clarity.

## Sources
list all the links that can help user to validate your answer that you will get below from context or sources.
  ***title 1***: [write exact url that corresponds to that title](write exact url that corresponds to that title)\n

  ***title 2***: [write exact url that corresponds to that title](write exact url that corresponds to that title)\n
  i have listed only two links but if there are more list all of them with same format and link in one line and make the links clickable (in proper makedown format that make the link clickable).
---

CONTEXT INFORMATION:
Conversation so far (use it to understand follow-up questions): {history}
Context: {context}
Sources: {sources}
Current question: {question}

Now, generate the response following these rules exactly.`;

  const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);

  // Turns a follow-up like "how do I deploy it?" into a standalone question
  // using the chat history, so retrieval searches for the right topic.
  const condenseQuestion = ChatPromptTemplate.fromTemplate(
    `Given the conversation and a follow-up question, rewrite the follow-up as a standalone question that makes sense without the conversation. If it is already standalone, return it unchanged. Reply with the question only.

Conversation:
{history}

Follow-up question: {question}`
  )
    .pipe(llm)
    .pipe(new StringOutputParser());

  // history: [{ role: "user" | "bot", text }] sent by the frontend
  const formatHistory = (history = []) =>
    history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n") || "None";

  const searchQuery = async ({ question, history }) => {
    if (!history?.length) return question;
    const standalone = await condenseQuestion.invoke({
      question,
      history: formatHistory(history),
    });
    console.log("Standalone question:", standalone);
    return standalone;
  };
  const formatDocsWithSources = (docs) => {
    // Combine the page content of all documents for the context
    const contextText = docs
      .map((doc, index) => {
        // Log each document's metadata for debugging
        console.log(`Doc ${index + 1} metadata:`, {
          source: doc.metadata.source,
          source_url: doc.metadata.source_url,
          url: doc.metadata.url,
          repository: doc.metadata.repository,
          file_path: doc.metadata.file_path,
          page_title: doc.metadata.page_title,
        });

        return `Source ${index + 1} Content:\n${doc.pageContent}`;
      })
      .join("\n\n---\n\n");

    // Use a Map to store unique sources and avoid duplicates
    const uniqueSources = new Map();

    docs.forEach((doc, index) => {
      // Handle both GitHub ('source_url') and Notion ('url') metadata keys
      const url = doc.metadata.source_url || doc.metadata.url;

      if (!url) {
        console.warn(
          `Document ${index + 1} has no URL in metadata:`,
          doc.metadata
        );
        return;
      }

      if (uniqueSources.has(url)) {
        console.log(`Duplicate URL found, skipping: ${url}`);
        return;
      }

      let title;

      // Determine title based on source type
      if (doc.metadata.source === "github") {
        // For GitHub: use repository + file_path as title
        const repo = doc.metadata.repository || "Unknown Repo";
        const filePath = doc.metadata.file_path || "Unknown File";
        title = `${repo}/${filePath}`;
      } else if (doc.metadata.source === "notion") {
        // For Notion: use page_title
        title = doc.metadata.page_title || "Notion Page";
      } else {
        // Fallback for unknown sources
        title = doc.metadata.source || url;
      }

      console.log(`Adding source: ${title} -> ${url}`);

      uniqueSources.set(url, {
        title: title,
        url: url,
      });
    });

    const sources = Array.from(uniqueSources.values());
    console.log(`Total unique sources: ${sources.length}`);

    return { contextText, sources };
  };
  // 4. Custom function to format documents and extract unique source info
  // MODIFICATION 2: Reworked the entire function to handle de-duplication and multiple source types
  // const formatDocsWithSources = (docs) => {
  //   // Combine the page content of all documents for the context

  //   console.log(docs.pageContent);

  //   const contextText = docs
  //     .map((doc, index) => `Source ${index + 1} Content:\n${doc.pageContent}`)
  //     .join("\n\n---\n\n");

  //   // Use a Map to store unique sources and avoid duplicates
  //   const uniqueSources = new Map();

  //   docs.forEach((doc) => {
  //     // Gracefully handle both GitHub ('source_url') and Notion ('url') metadata keys
  //     const url = doc.metadata.source_url || doc.metadata.url;
  //     // Ensure we have a URL and that it hasn't been added yet
  //     if (url && !uniqueSources.has(url)) {
  //       let title;

  //       // Determine title based on source type
  //       if (doc.metadata.source === "github") {
  //         // For GitHub: use repository + file_path as title
  //         const repo = doc.metadata.repository || "Unknown Repo";
  //         const filePath = doc.metadata.file_path || "Unknown File";
  //         title = `${repo}/${filePath}`;
  //       } else if (doc.metadata.source === "notion") {
  //         // For Notion: use page_title
  //         title = doc.metadata.page_title || doc.metadata.source || url;
  //       } else {
  //         // Fallback for unknown sources
  //         title = doc.metadata.source || url;
  //       }
  //       uniqueSources.set(url, {
  //         title: title,
  //         url: url,
  //       });
  //     }
  //   });

  //   // The `sources` object is now an array of unique source objects
  //   const sources = Array.from(uniqueSources.values());
  //   return { contextText, sources };
  // };

  // 5. Create the RAG chain with source tracking (No changes to the structure)
  // return RunnableSequence.from([
  //   {
  //     docs: retriever,
  //     question: new RunnablePassthrough(),
  //   },
  //   {
  //     context: ({ docs }) => formatDocsWithSources(docs).contextText,
  //     sources: ({ docs }) => formatDocsWithSources(docs).sources,
  //     question: ({ question }) => question,
  //   },
  //   {
  //     answer: prompt.pipe(llm).pipe(new StringOutputParser()),
  //     sources: ({ sources }) => sources,
  //   },
  // ]);

  // Input: { question, history }
  return RunnableSequence.from([
    {
      docs: RunnableSequence.from([searchQuery, retriever]),
      question: ({ question }) => question,
      history: ({ history }) => formatHistory(history),
    },
    {
      context: ({ docs }) => {
        console.log("Retrieved docs:", docs.length);
        docs.forEach((doc, i) => {
          console.log(`Doc ${i + 1} source:`, doc.metadata.source);
          console.log(`Doc ${i + 1} source_url:`, doc.metadata.source_url);
        });
        return formatDocsWithSources(docs).contextText;
      },
      sources: ({ docs }) => formatDocsWithSources(docs).sources,
      question: ({ question }) => question,
      history: ({ history }) => history,
    },
    {
      answer: prompt.pipe(llm).pipe(new StringOutputParser()),
      sources: ({ sources }) => {
        console.log("Final sources:", sources);
        return sources;
      },
    },
  ]);
}

// rag_chain_modified.js

// import "dotenv/config";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { PineconeStore } from "@langchain/pinecone";
// import { Pinecone } from "@pinecone-database/pinecone";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { StringOutputParser } from "@langchain/core/output_parsers";
// import {
//   RunnablePassthrough,
//   RunnableSequence,
// } from "@langchain/core/runnables";
// import { GeminiEmbeddings } from "./notion_seeding/gemini_embeddings.js";
// import { TaskType } from "@google/generative-ai";

// export async function createRAGChain() {
//   // 1. Initialize our external services (No changes here)
//   const llm = new ChatGoogleGenerativeAI({
//     model: "gemini-2.5-flash",
//     streaming: true,
//   });
//   const pinecone = new Pinecone();
//   const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
//   const geminiEmbeddings = new GeminiEmbeddings({
//     model: process.env.GEMINI_MODEL || "text-embedding-004",
//     taskType: TaskType.RETRIEVAL_QUERY,
//   });

//   // 2. Initialize a PineconeStore for retrieval (No changes here)
//   const vectorStore = await PineconeStore.fromExistingIndex(geminiEmbeddings, {
//     pineconeIndex,
//     namespace: process.env.PINECONE_NAMESPACE,
//   });
//   const retriever = vectorStore.asRetriever({ k: 5 });

//   // 3. Create a prompt template with better formatting instructions
//   const promptTemplate = `You are a helpful assistant that answers questions based on the provided context.

// RESPONSE STRUCTURE:
// Your answer MUST follow this exact structure:

// ## 📝 Answer
// Provide a clear, direct, and concise answer to the user's question.

// ## 📖 Details
// Expand on the answer with additional explanations, context, or examples. Use bullet points or numbered lists for clarity.

// ## Sources
// list all the links that can help user to validate your answer that you will get below from context or sources.
//   ***title 1***: [write exact url that corresponds to that title](write exact url that corresponds to that title)\n

//   ***title 2***: [write exact url that corresponds to that title](write exact url that corresponds to that title)\n
//   i have listed only two links but if there are more list all of them with same format and link in one line and make the links clickable (in proper makedown format that make the link clickable).
// ---

// CONTEXT INFORMATION:
// Context: {context}
// Sources: {sources}
// Current question: {question}

// Now, generate the response following these rules exactly.`;

//   const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);

//   // 4. Custom function to format documents and extract unique source info
//   // MODIFICATION 2: Reworked the entire function to handle de-duplication and multiple source types
//   const formatDocsWithSources = (docs) => {
//     // Combine the page content of all documents for the context
//     const contextText = docs
//       .map((doc, index) => `Source ${index + 1} Content:\n${doc.pageContent}`)
//       .join("\n\n---\n\n");

//     // Use a Map to store unique sources and avoid duplicates
//     const uniqueSources = new Map();

//     docs.forEach((doc) => {
//       // Gracefully handle both GitHub ('source_url') and Notion ('url') metadata keys
//       const url = doc.metadata.source_url || doc.metadata.url;
//       // Ensure we have a URL and that it hasn't been added yet
//       if (url && !uniqueSources.has(url)) {
//         uniqueSources.set(url, {
//           title: doc.metadata.source || url, // Use title, or fallback to the URL itself
//           url: url,
//         });
//       }
//     });

//     // The `sources` object is now an array of unique source objects
//     const sources = Array.from(uniqueSources.values());
//     return { contextText, sources };
//   };

//   // 5. Create the RAG chain with source tracking (No changes to the structure)
//   return RunnableSequence.from([
//     {
//       docs: retriever,
//       question: new RunnablePassthrough(),
//     },
//     {
//       context: ({ docs }) => formatDocsWithSources(docs).contextText,
//       sources: ({ docs }) => formatDocsWithSources(docs).sources,
//       question: ({ question }) => question,
//     },
//     {
//       answer: prompt.pipe(llm).pipe(new StringOutputParser()),
//       sources: ({ sources }) => sources,
//     },
//   ]);
// }
