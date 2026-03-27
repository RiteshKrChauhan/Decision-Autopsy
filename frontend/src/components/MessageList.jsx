import { useEffect, useRef } from "react";

export default function MessageList({ messages, isTyping }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  return (
    <>
      {messages.map((message) => {
        if (message.type === "user") {
          return (
            <article className="msg user" key={message.id}>
              <div className="bubble">
                <div className="message-label">You</div>
                {message.content}
              </div>
            </article>
          );
        }

        if (message.type === "system") {
          return (
            <article className="msg system" key={message.id}>
              <div className="bubble bias-flash">
                <div className="bias-label">Pattern noticed</div>
                <p>{message.content}</p>
                {message.sub ? <p className="muted">{message.sub}</p> : null}
              </div>
            </article>
          );
        }

        if (message.type === "error") {
          return (
            <article className="msg error ai" key={message.id}>
              <div className="bubble-wrap">
                <div className="avatar">AI</div>
                <div className="bubble">
                  <div className="message-label">Error</div>
                  {message.content}
                </div>
              </div>
            </article>
          );
        }

        return (
          <article className="msg ai" key={message.id}>
            <div className="bubble-wrap">
              <div className="avatar">AI</div>
              <div className="bubble">
                <div className="message-label">AI</div>
                {message.content}
                {message.muted ? <div className="muted">{message.muted}</div> : null}
              </div>
            </div>
          </article>
        );
      })}

      {isTyping ? (
        <article className="msg ai typing-row">
          <div className="avatar">AI</div>
          <div className="bubble typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </article>
      ) : null}

      <div ref={bottomRef} />
    </>
  );
}
