import { useEffect, useState } from "react";

export default function FuturesPanel({ futures, forkPoint }) {
  if (!Array.isArray(futures) || futures.length === 0) return null;

  const [activeFutureId, setActiveFutureId] = useState(futures[0]?.id ?? null);

  useEffect(() => {
    if (!futures.some((item) => item.id === activeFutureId)) {
      setActiveFutureId(futures[0]?.id ?? null);
    }
  }, [futures, activeFutureId]);

  const activeFuture = futures.find((item) => item.id === activeFutureId) ?? futures[0];

  return (
    <section className="futures-panel">
      <div className="futures-head">
        <div className="question-step">Decision Tree</div>
        <h3 className="futures-title">How this could play out</h3>
        <p className="futures-subtitle">Choose a branch to inspect its timeline in full detail.</p>
      </div>

      <div className="future-summaries" aria-label="All futures summary">
        {futures.map((future) => (
          <button
            className={`future-summary-tile ${activeFuture.id === future.id ? "active" : ""}`}
            key={`${future.id}-summary`}
            style={{ "--future-color": future.color }}
            type="button"
            onClick={() => setActiveFutureId(future.id)}
            aria-pressed={activeFuture.id === future.id}
          >
            <div className="future-summary-label">{future.label}</div>
            <p>{future.summary}</p>
          </button>
        ))}
      </div>

      <div className="futures-layout">
        <nav className="futures-rail" aria-label="Future branches">
          {futures.map((future, index) => (
            <button
              className={`future-switch ${activeFuture.id === future.id ? "active" : ""}`}
              key={future.id}
              type="button"
              style={{ "--future-color": future.color }}
              onClick={() => setActiveFutureId(future.id)}
              aria-pressed={activeFuture.id === future.id}
            >
              <span className="future-switch-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="future-switch-copy">
                <span className="future-switch-label">{future.label}</span>
                <span className="future-switch-meta">{future.confidence}% likely</span>
              </span>
            </button>
          ))}
        </nav>

        <article className="future-spotlight" style={{ "--future-color": activeFuture.color }}>
          <div className="future-spotlight-top">
            <span className="future-label">{activeFuture.label}</span>
            <strong className="future-confidence">{activeFuture.confidence}% likely</strong>
          </div>

          <h4>{activeFuture.title}</h4>
          <p className="future-summary">{activeFuture.summary}</p>

          <ol className="future-track">
            {activeFuture.events.map((event, index) => (
              <li className="future-stage" key={`${activeFuture.id}-${event.when}`}>
                <div className="future-stage-marker" aria-hidden="true">
                  <span className="future-dot" />
                  {index < activeFuture.events.length - 1 ? <span className="future-line" /> : null}
                </div>
                <div className="future-stage-copy">
                  <span className="future-when">{event.when}</span>
                  <p className="future-what">{event.what}</p>
                  <p className="future-note">{event.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </div>

      {forkPoint ? (
        <div className="fork-point-card conclusion-card">
          <div className="fork-grid">
            <div>
              <div className="question-step">Conclusion</div>
              <h4 className="conclusion-title">What this really comes down to</h4>
              <p className="fork-body">{forkPoint.body}</p>
            </div>
            <div className="fork-action-panel">
              <div className="question-step conclusion-action-label">Action before deciding</div>
              <p className="fork-action">{forkPoint.action}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
