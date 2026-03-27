export default function FuturesGrid({
  futures,
  expandedTileId,
  setExpandedTileId,
  forkPoint,
  chips,
  onChipClick,
}) {
  return (
    <>
      <div className="futures-grid">
        {futures.map((future) => {
          const isOpen = expandedTileId === future.id;

          return (
            <article className={`tile ${isOpen ? "open" : ""}`} key={future.id}>
              <div
                className="tile-head"
                style={{ borderTopColor: future.color }}
                onClick={() => setExpandedTileId(isOpen ? null : future.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setExpandedTileId(isOpen ? null : future.id);
                }}
              >
                <div className="tile-label" style={{ color: future.color }}>
                  {future.label.toUpperCase()}
                </div>
                <h4 className="tile-title">{future.title}</h4>
                <div className="tile-summary">{future.summary}</div>
                <div className="tile-meta">
                  <span className={`risk-pill risk-${future.risk_level || "medium"}`}>
                    Risk {future.risk_score ?? "--"}/100
                  </span>
                  <span className="meta-pill">Upside {future.upside_score ?? "--"}</span>
                  <span className="meta-pill">Regret {future.regret_score ?? "--"}</span>
                </div>
                <div className="confidence-row">
                  <div className="confidence-track">
                    <div
                      className="confidence-fill"
                      style={{ width: `${future.confidence}%`, background: future.color }}
                    />
                  </div>
                  <span className="confidence-value">{future.confidence}%</span>
                </div>
              </div>

              <div className="timeline">
                {future.key_assumption ? (
                  <div className="event" style={{ "--event-color": future.color }}>
                    <div className="event-when">Key assumption</div>
                    <div className="event-note">{future.key_assumption}</div>
                  </div>
                ) : null}
                {future.events.map((event, idx) => (
                  <div className="event" key={`${future.id}-${idx}`} style={{ "--event-color": future.color }}>
                    <div className="event-when">{event.when}</div>
                    <div className="event-what">{event.what}</div>
                    <div className="event-note">{event.note}</div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {forkPoint ? (
        <section className="fork">
          <p>{forkPoint.body}</p>
          <p className="muted">{forkPoint.action}</p>
          <div className="chips">
            {chips.map((chip) => (
              <button className="chip" type="button" key={chip} onClick={() => onChipClick(chip)}>
                {chip}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
