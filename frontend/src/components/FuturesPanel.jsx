export default function FuturesPanel({ futures, forkPoint }) {
  if (!Array.isArray(futures) || futures.length === 0) return null;

  return (
    <section className="futures-panel">
      <div className="futures-head">
        <div className="question-step">Decision Tree</div>
        <h3 className="futures-title">How this could play out</h3>
      </div>

      <div className="futures-grid">
        {futures.map((future) => (
          <article className="future-card" key={future.id} style={{ "--future-color": future.color }}>
            <div className="future-card-top">
              <span className="future-label">
                {future.label}
              </span>
              <strong className="future-confidence">{future.confidence}% likely</strong>
            </div>
            <h4>{future.title}</h4>
            <p className="future-summary">{future.summary}</p>
            <div className="future-events">
              {future.events.map((event, index) => (
                <div className="future-event" key={`${future.id}-${event.when}`}>
                  <div className="future-marker" aria-hidden="true">
                    <span className="future-dot" />
                    {index < future.events.length - 1 ? <span className="future-line" /> : null}
                  </div>
                  <div className="future-event-copy">
                    <span className="future-when">{event.when}</span>
                    <p className="future-what">{event.what}</p>
                    <p className="future-note">{event.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      {forkPoint ? (
        <div className="fork-point-card conclusion-card">
          <div className="question-step">Conclusion</div>
          <h4 className="conclusion-title">What this really comes down to</h4>
          <p className="fork-body">{forkPoint.body}</p>
          <div className="question-step conclusion-action-label">What to do before you decide</div>
          <p className="fork-action">{forkPoint.action}</p>
        </div>
      ) : null}
    </section>
  );
}
