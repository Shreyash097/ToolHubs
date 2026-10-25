import React, { useState, useEffect, useRef } from "react";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import Icon from "../Icon/Icon";
import "./ChatbotWidget.css";

//API URL from environment variables.
const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL;   // port value present in the env file of Frontend

const GREETING = { role: "bot", text: "Hi 👋 How can I help you today?" };

// Starter questions shown before the first message
const SUGGESTIONS = [
  "What can you help me with?",
  "What projects has Shreyash built?",
  "Which tech stack is used here?",
];

function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // persist chat history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("chat_history", JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to persist chat history:", e);
    }
  }, [messages]);

  // scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Esc leaves fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => e.key === "Escape" && setIsFullscreen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // handle sending message with streaming response
  const handleSendMessage = async (input) => {
    if (!input.trim()) return;

    if (!CHAT_API_URL) {
      console.error("VITE_CHAT_API_URL is not defined");
      return;
    }

    // Last 3 question/answer pairs, so the bot can answer follow-up questions
    const history = messages
      .slice(1) // skip the greeting
      .filter((m) => m.text && !m.text.startsWith("**Error:**"))
      .slice(-6);

    // Add user message
    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);

    // Add assistant placeholder
    setMessages((prev) => [...prev, { role: "bot", text: "" }]);

    setLoading(true);

    try {
      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: input, history }),
      });

      if (response.status === 401) {
        throw new Error("Unauthorized: The backend is requiring a key.");
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(
          `HTTP error ${response.status} ${response.statusText} ${errText}`
        );
      }

      // streaming read
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // messages separated by double-newline
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonStr = line.substring(5).trim();
            try {
              const data = JSON.parse(jsonStr);

              if (data.token) {
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, text: m.text + data.token }
                      : m
                  )
                );
              } else if (data.message || data.answer || data.text) {
                const chunk =
                  data.message ?? data.answer ?? data.text;
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, text: m.text + chunk }
                      : m
                  )
                );
              }
            } catch (err) {
              console.error("Failed to parse stream JSON:", err, line);
            }
          }
        }
      }
    } catch (err) {
      console.error("Stream error:", err);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, text: `**Error:** ${err.message}` }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // clear chat
  const clearChat = () => {
    setMessages([GREETING]);
    try {
      sessionStorage.removeItem("chat_history");
    } catch {
      // storage can be unavailable (private mode); nothing to clear then
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsFullscreen(false);
  };

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <div
          className={`chatbot-window ${isFullscreen ? "fullscreen" : ""}`}
          role="dialog"
          aria-label="AI assistant chat"
        >
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span className="chatbot-avatar">
                <Icon name="botMark" size={20} />
              </span>
              <strong>AI Assistant</strong>
            </div>

            <div className="header-buttons">
              <button
                type="button"
                onClick={clearChat}
                title="Clear chat"
                aria-label="Clear chat"
              >
                <Icon name="refresh" size={17} />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen((f) => !f)}
                title={isFullscreen ? "Exit full screen" : "Full screen"}
                aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              >
                <Icon name={isFullscreen ? "minimize" : "maximize"} size={17} />
              </button>
              <button
                type="button"
                onClick={closeChat}
                title="Close"
                aria-label="Close chat"
              >
                <Icon name="x" size={19} />
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            <div className="chatbot-thread">
              <ChatMessages messages={messages} loading={loading} />

              {showSuggestions && (
                <div className="chat-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSendMessage(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="chatbot-input">
            <ChatInput onSend={handleSendMessage} loading={loading} />
            <p className="chatbot-hint">
              Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <button
          type="button"
          className={`chatbot-toggle ${isOpen ? "open" : ""}`}
          onClick={() => (isOpen ? closeChat() : setIsOpen(true))}
          aria-label={isOpen ? "Close chat" : "Open AI assistant"}
        >
          <Icon name={isOpen ? "x" : "botMark"} size={isOpen ? 26 : 30} />
          {!isOpen && <span className="chatbot-toggle-label">Ask AI</span>}
        </button>
      )}
    </div>
  );
}

export default ChatbotWidget;
