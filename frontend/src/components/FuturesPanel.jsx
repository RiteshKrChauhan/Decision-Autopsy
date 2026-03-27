export default function FuturesPanel({ futures, forkPoint }) {
  if (!Array.isArray(futures) || futures.length === 0) return null;

  return (
    <section className="futures-panel">
      <div className="futures-head">
        <div className="question-step">Futures</div>
        <h3 className="futures-title">How this decision can unfold</h3>
      </div>

      <div className="futures-grid">
        {futures.map((future) => (
          <article className="future-card" key={future.id}>
            <div className="future-card-top">
              <span className="future-label" style={{ "--future-color": future.color }}>
                {future.label}
              </span>
              <strong>{future.confidence}%</strong>
            </div>
            <h4>{future.title}</h4>
            <p className="future-summary">{future.summary}</p>
            <div className="future-events">
              {future.events.map((event) => (
                <div className="future-event" key={`${future.id}-${event.when}`}>
                  <span className="future-when">{event.when}</span>
                  <div>
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
        <div className="fork-point-card">
          <div className="question-step">Fork Point</div>
          <p className="fork-body">{forkPoint.body}</p>
          <p className="fork-action">{forkPoint.action}</p>
        </div>
      ) : null}
    </section>
  );
}
