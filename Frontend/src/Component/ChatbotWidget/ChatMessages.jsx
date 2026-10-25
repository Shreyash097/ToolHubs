import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Icon from '../Icon/Icon';

function ChatMessages({ messages, loading }) {
  return (
    <>
      {messages.map((msg, idx) => {
        // Handle bot messages: parse Markdown and sanitize
        if (msg.role === 'bot') {
          const isLast = idx === messages.length - 1;
          let bubble;

          if (msg.text) {
            const rawHtml = marked.parse(msg.text);
            const sanitizedHtml = DOMPurify.sanitize(rawHtml);
            bubble = (
              <div
                className="chat-msg bot-msg"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            );
          } else if (loading && isLast) {
            // Empty placeholder while waiting for the first token
            bubble = (
              <div className="chat-msg bot-msg typing" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </div>
            );
          } else {
            bubble = <div className="chat-msg bot-msg muted">No answer received.</div>;
          }

          return (
            <div key={idx} className="chat-row bot">
              <span className="chat-msg-avatar">
                <Icon name="botMark" size={16} />
              </span>
              {bubble}
            </div>
          );
        }

        // Handle user messages: render as plain text
        return (
          <div key={idx} className="chat-row user">
            <div className="chat-msg user-msg">{msg.text}</div>
          </div>
        );
      })}
    </>
  );
}

export default ChatMessages;
