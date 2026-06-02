import { useEffect, useRef } from "react";
import FuturesPanel from "./FuturesPanel.jsx";

export default function MessageList({ messages, isTyping, scrollContainerRef, futures, forkPoint }) {
  const shouldStickToBottomRef = useRef(true);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  }, [messages.length, isTyping, scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container || !shouldStickToBottomRef.current) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, scrollContainerRef]);

  return (
    <>
      {messages.map((message) => {
        if (message.type === "futures") {
          return (
            <section className="msg ai" key={message.id}>
              <FuturesPanel futures={futures} forkPoint={forkPoint} />
            </section>
          );
        }

        if (message.type === "user") {
          return (
            <article className="msg user" key={message.id}>
              <div className="bubble">
                {message.context ? <div className="question-context-ref">{message.context}</div> : null}
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
                <div className="avatar" aria-hidden="true" />
                <div className="bubble">
                  {message.content}
                </div>
              </div>
            </article>
          );
        }

        return (
          <article className="msg ai" key={message.id}>
            <div className="bubble-wrap">
              <div className="avatar" aria-hidden="true" />
              <div className="bubble">
                {message.content}
                {message.muted ? <div className="muted">{message.muted}</div> : null}
              </div>
            </div>
          </article>
        );
      })}

      {isTyping ? (
        <article className="msg ai typing-row">
          <div className="avatar" aria-hidden="true" />
          <div className="bubble typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </article>
      ) : null}
    </>
  );
}
