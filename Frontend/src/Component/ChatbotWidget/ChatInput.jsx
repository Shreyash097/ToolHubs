import { useState } from "react";
import Icon from "../Icon/Icon";

function ChatInput({ onSend, loading }) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-box">
      <textarea
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Ask anything..."
        disabled={loading}
        aria-label="Message"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={loading || !input.trim()}
        aria-label="Send message"
      >
        <Icon name="send" size={18} />
      </button>
    </div>
  );
}

export default ChatInput;
