import React, { useState, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";

/* ============================================================
   DATA MODEL
   [id:int primary, name:varchar(30), score:int]
   ============================================================ */
export interface Player {
  id: number;
  name: string;
  score: number;
}

const SEED: Player[] = [
  { id: 1, name: "Gamer123", score: 45 },
  { id: 2, name: "Wallsbreaker543", score: 567 },
  { id: 3, name: "allisnotwell", score: 435 },
];

/* ============================================================
   API LAYER
   POST /scores          -> addScore(score, playerName)
   GET  /scores/top/:n    -> showTop(n)
   GET  /rank?score=..    -> myRank(score)
   (Implemented in-memory here; swap the bodies for real fetch()
   calls to your backend and the UI below needs no changes.)
   ============================================================ */
function useLeaderboardApi(initial: Player[], baseUrl?: string) {
  const [players, setPlayers] = useState<Player[]>(initial);

  // helper to refresh players from remote API when configured
  const refreshFromServer = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/scores`);
      if (!res.ok) throw new Error("Failed to fetch scores");
      const data: Player[] = await res.json();
      setPlayers(data);
    } catch (err) {
      console.warn("Leaderboard: could not refresh from server", err);
    }
  }, [baseUrl]);

  // fetch initial players if using remote
  React.useEffect(() => {
    if (baseUrl) refreshFromServer();
  }, [baseUrl, refreshFromServer]);

  // 1. POST — add a new score for a player
  const addScore = useCallback((score: number, playerName: string) => {
    if (baseUrl) {
      // POST to remote and refresh
      (async () => {
        try {
          await fetch(`${baseUrl.replace(/\/$/, "")}/scores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: playerName.trim().slice(0, 30), score }),
          });
          await refreshFromServer();
        } catch (err) {
          console.warn("addScore failed", err);
        }
      })();
      return;
    }

    setPlayers((prev) => {
      const nextId = prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1;
      const name = playerName.trim().slice(0, 30);
      if (!name) return prev;
      return [...prev, { id: nextId, name, score }];
    });
  }, [baseUrl, refreshFromServer]);

  // 2. GET — top n players, sorted by score descending
  const showTop = useCallback(
    (n: number): Player[] => {
      return [...players]
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(0, n));
    },
    [players]
  );

  // 3. GET — rank a given score would hold among current players
  //    Rank = 1 + count of players with a strictly higher score
  const myRank = useCallback(
    (score: number): number => {
      const higher = players.filter((p) => p.score > score).length;
      return higher + 1;
    },
    [players]
  );

  const fullRanked = useMemo(
    () =>
      [...players]
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({ ...p, rank: i + 1 })),
    [players]
  );

  return { players, addScore, showTop, myRank, fullRanked };
}

/* ============================================================
   PODIUM TOKENS
   ============================================================ */
const PODIUM = {
  1: { label: "1st", accent: "#E8B34C", glow: "rgba(232,179,76,0.35)", height: 168 },
  2: { label: "2nd", accent: "#C7CEDA", glow: "rgba(199,206,218,0.30)", height: 128 },
  3: { label: "3rd", accent: "#C97D4A", glow: "rgba(201,125,74,0.30)", height: 96 },
} as const;

/* ============================================================
   COMPONENT
   ============================================================ */
export default function Leaderboard() {
  const [useRemote, setUseRemote] = useState(false);
  const [apiBase, setApiBase] = useState("http://localhost:3000");

  const { addScore, showTop, myRank, fullRanked } = useLeaderboardApi(
    SEED,
    useRemote ? apiBase : undefined
  );

  const [nameInput, setNameInput] = useState("");
  const [scoreInput, setScoreInput] = useState("");
  const [topN, setTopN] = useState(10);
  const [rankQuery, setRankQuery] = useState("");
  const [rankResult, setRankResult] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  const top3 = showTop(3);
  const topList = showTop(topN);
  // podium order: 2nd, 1st, 3rd (visual center-heaviest)
  const podiumOrder = [top3[1], top3[0], top3[2]];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const score = Number(scoreInput);
    if (!nameInput.trim()) {
      setFormError("Enter a player name.");
      return;
    }
    if (nameInput.trim().length > 30) {
      setFormError("Name must be 30 characters or fewer.");
      return;
    }
    if (!Number.isFinite(score) || scoreInput.trim() === "") {
      setFormError("Enter a valid numeric score.");
      return;
    }
    addScore(Math.trunc(score), nameInput.trim());
    setNameInput("");
    setScoreInput("");
    setFormError("");
  };

  const handleRankCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const score = Number(rankQuery);
    if (!Number.isFinite(score) || rankQuery.trim() === "") {
      setRankResult(null);
      return;
    }
    setRankResult(myRank(Math.trunc(score)));
  };

  return (
    <div style={styles.page}>
      <style>{fontImports}</style>

      <header style={styles.header}>
        <span style={styles.eyebrow}>LIVE STANDINGS</span>
        <h1 style={styles.title}>Leaderboard</h1>
        <p style={styles.subtitle}>
          Ranked by score, updated the moment a new run comes in.
        </p>
      </header>

      {/* ---------------- PODIUM ---------------- */}
      <section style={styles.podiumWrap} aria-label="Top three players">
        {podiumOrder.map((p, i) => {
          if (!p) return <div key={`empty-${i}`} style={{ flex: 1 }} />;
          const originalRank = fullRanked.find((f) => f.id === p.id)?.rank ?? 1;
          const meta = PODIUM[originalRank as 1 | 2 | 3] ?? PODIUM[3];
          return (
            <div key={p.id} style={styles.podiumColumn}>
              <div style={styles.podiumName} title={p.name}>
                {p.name}
              </div>
              <div style={{ ...styles.podiumScore, color: meta.accent }}>
                {p.score.toLocaleString()}
              </div>
              <div
                style={{
                  ...styles.podiumBar,
                  height: meta.height,
                  background: `linear-gradient(180deg, ${meta.accent} 0%, rgba(255,255,255,0.06) 100%)`,
                  boxShadow: `0 0 32px ${meta.glow}`,
                }}
              >
                <span style={styles.podiumRankLabel}>{meta.label}</span>
              </div>
            </div>
          );
        })}
      </section>

      <div style={styles.grid}>
        {/* ---------------- FULL TABLE ---------------- */}
        <section style={styles.panel}>
          <div style={styles.panelHeaderRow}>
            <h2 style={styles.panelTitle}>Rankings</h2>
            <label style={styles.topNControl}>
              Show top
              <input
                type="number"
                min={1}
                max={fullRanked.length || 1}
                value={topN}
                onChange={(e) =>
                  setTopN(
                    Math.max(1, Math.min(Number(e.target.value) || 1, fullRanked.length || 1))
                  )
                }
                style={styles.topNInput}
              />
            </label>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 64 }}>Rank</th>
                <th style={styles.th}>Player</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {topList.map((p) => {
                const rank = fullRanked.find((f) => f.id === p.id)?.rank ?? 0;
                const isTop3 = rank <= 3;
                return (
                  <tr key={p.id} style={isTop3 ? styles.rowTop3 : undefined}>
                    <td style={styles.tdRank}>
                      <span
                        style={{
                          ...styles.rankBadge,
                          borderColor: isTop3
                            ? PODIUM[rank as 1 | 2 | 3]?.accent
                            : "rgba(255,255,255,0.12)",
                          color: isTop3 ? PODIUM[rank as 1 | 2 | 3]?.accent : "#8993A8",
                        }}
                      >
                        {rank}
                      </span>
                    </td>
                    <td style={styles.tdName}>{p.name}</td>
                    <td style={styles.tdScore}>{p.score.toLocaleString()}</td>
                  </tr>
                );
              })}
              {topList.length === 0 && (
                <tr>
                  <td colSpan={3} style={styles.emptyState}>
                    No players yet — add the first score.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* ---------------- SIDEBAR: ADD SCORE + MY RANK ---------------- */}
        <aside style={styles.sidebar}>
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>API</h2>
            <label style={styles.label}>
              Use remote API
              <input
                type="checkbox"
                checked={useRemote}
                onChange={(e) => setUseRemote(e.target.checked)}
                style={{ marginLeft: 8 }}
              />
            </label>
            {useRemote && (
              <label style={styles.label}>
                Base URL
                <input
                  style={styles.input}
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                />
              </label>
            )}
          </section>
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>Submit a score</h2>
            <form onSubmit={handleAdd} style={styles.form}>
              <label style={styles.label}>
                Player name
                <input
                  style={styles.input}
                  value={nameInput}
                  maxLength={30}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. NightOwl99"
                />
              </label>
              <label style={styles.label}>
                Score
                <input
                  style={styles.input}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  placeholder="e.g. 210"
                  inputMode="numeric"
                />
              </label>
              {formError && <div style={styles.errorText}>{formError}</div>}
              <button type="submit" style={styles.primaryButton}>
                Add score
              </button>
            </form>
          </section>

          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>Check a rank</h2>
            <form onSubmit={handleRankCheck} style={styles.form}>
              <label style={styles.label}>
                Score
                <input
                  style={styles.input}
                  value={rankQuery}
                  onChange={(e) => setRankQuery(e.target.value)}
                  placeholder="e.g. 300"
                  inputMode="numeric"
                />
              </label>
              <button type="submit" style={styles.secondaryButton}>
                Find rank
              </button>
              {rankResult !== null && (
                <div style={styles.rankResult}>
                  That score would rank <strong>#{rankResult}</strong> of{" "}
                  {fullRanked.length + 1}.
                </div>
              )}
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
const fontImports = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0B1220",
    color: "#F4F6FB",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "48px 24px 80px",
    boxSizing: "border-box",
  },
  header: {
    maxWidth: 960,
    margin: "0 auto 40px",
    textAlign: "center",
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    letterSpacing: "0.18em",
    color: "#E8B34C",
    fontWeight: 600,
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 44,
    fontWeight: 700,
    margin: "8px 0 8px",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#8993A8",
    fontSize: 15,
    margin: 0,
  },
  podiumWrap: {
    maxWidth: 720,
    margin: "0 auto 48px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 20,
    padding: "0 8px",
  },
  podiumColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 0,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  podiumScore: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 10,
    fontVariantNumeric: "tabular-nums",
  },
  podiumBar: {
    width: "100%",
    borderRadius: "10px 10px 4px 4px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 10,
    boxSizing: "border-box",
  },
  podiumRankLabel: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    color: "#0B1220",
    background: "rgba(11,18,32,0.0)",
    letterSpacing: "0.04em",
  },
  grid: {
    maxWidth: 960,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr",
    gap: 20,
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  panel: {
    background: "#131B2E",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 22,
  },
  panelHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 17,
    fontWeight: 600,
    margin: 0,
  },
  topNControl: {
    fontSize: 13,
    color: "#8993A8",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  topNInput: {
    width: 56,
    background: "#0B1220",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: "#F4F6FB",
    padding: "4px 8px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontSize: 12,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#8993A8",
    fontWeight: 600,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    padding: "0 8px 10px",
  },
  rowTop3: {
    background: "rgba(232,179,76,0.04)",
  },
  tdRank: {
    padding: "10px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  tdName: {
    padding: "10px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    fontWeight: 500,
  },
  tdScore: {
    padding: "10px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    textAlign: "right",
    fontFamily: "'JetBrains Mono', monospace",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
  },
  rankBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
  },
  emptyState: {
    padding: "24px 8px",
    textAlign: "center",
    color: "#8993A8",
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    color: "#8993A8",
  },
  input: {
    background: "#0B1220",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#F4F6FB",
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
  },
  primaryButton: {
    marginTop: 4,
    background: "#E8B34C",
    color: "#0B1220",
    border: "none",
    borderRadius: 8,
    padding: "11px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  secondaryButton: {
    background: "transparent",
    color: "#F4F6FB",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 8,
    padding: "11px 16px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  errorText: {
    color: "#E88A4C",
    fontSize: 13,
  },
  rankResult: {
    marginTop: 6,
    fontSize: 14,
    color: "#C7CEDA",
  },
};

// Mount the app when this file is used as the entrypoint.
const rootEl = document.getElementById("app");
if (rootEl) {
  createRoot(rootEl).render(<Leaderboard />);
}
