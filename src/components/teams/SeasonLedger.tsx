"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { LedgerHead, LedgerRows, SEASONS } from "@/components/ftc/reaperContent";

/*
  Every FTC event, one season at a time, as tabs. The server sends the newest season selected and
  the others hidden; without script (@media (scripting: none) in teams.css) every season shows
  stacked and the tab row is hidden, so no event is out of reach. The panels are hidden by
  teams.css through data-active rather than the hidden attribute: Tailwind's preflight hides
  [hidden] with !important in a cascade layer, which no rule outside the layer can undo. Arrow keys, Home and End move
  between tabs as the ARIA tabs pattern has them, and the rows of a newly picked season rise in
  one after another.
*/
export function SeasonLedger() {
  const id = useId();
  const [selected, setSelected] = useState(SEASONS[0].id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = SEASONS.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    setSelected(SEASONS[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <div className="team-ledger">
      <div className="team-ledger-tabs" role="tablist" aria-label="Season">
        {SEASONS.map((season, index) => (
          <button
            key={season.id}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${season.id}`}
            aria-selected={selected === season.id}
            aria-controls={`${id}-panel-${season.id}`}
            tabIndex={selected === season.id ? 0 : -1}
            onClick={() => setSelected(season.id)}
            onKeyDown={(event) => onKey(event, index)}
          >
            <span className="mono">{season.title}</span>
            <span className="team-ledger-tab-note">{season.note}</span>
          </button>
        ))}
      </div>
      {SEASONS.map((season) => (
        <div
          key={season.id}
          role="tabpanel"
          id={`${id}-panel-${season.id}`}
          aria-labelledby={`${id}-tab-${season.id}`}
          className="team-ledger-panel"
          tabIndex={0}
          data-active={selected === season.id || undefined}
        >
          <table className="ftc-table ftc-ledger">
            <caption>
              <span className="ftc-season-title">{season.title}</span>{" "}
              <span className="ftc-season-note">{season.note}</span>
            </caption>
            <LedgerHead />
            <LedgerRows rows={season.rows} />
          </table>
        </div>
      ))}
    </div>
  );
}
