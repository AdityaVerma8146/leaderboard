import React, { useEffect, useState } from "react";
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

/* ============================================================
   API CLIENT
   GET /scores?top=n -> load the leaderboard
   ============================================================ */
function useLeaderboardApi(topN: number) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [apiError, setApiError] = useState("");

  const refreshScores = async () => {
    try {
      const response = await fetch(`/scores?top=${topN}`);
      if (!response.ok) throw new Error("Could not load scores");
      setPlayers(await response.json() as Player[]);
      setApiError("");
    } catch {
      setApiError("Backend is unavailable. Start it with npm run server.");
    }
  };

  useEffect(() => {
    void refreshScores();
  }, [topN]);

  const rankedPlayers = players.map((player, index) => ({ ...player, rank: index + 1 }));

  return { players, rankedPlayers, apiError };
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
  const [topN, setTopN] = useState(10);

  const { players, rankedPlayers, apiError } = useLeaderboardApi(topN);

  const top3 = rankedPlayers.slice(0, 3);
  const topList = players;
  // podium order: 2nd, 1st, 3rd (visual center-heaviest)
  const podiumOrder = [top3[1], top3[0], top3[2]];

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

      {apiError && <div style={styles.errorText}>{apiError}</div>}

      {/* ---------------- PODIUM ---------------- */}
      <section style={styles.podiumWrap} aria-label="Top three players">
        {podiumOrder.map((p, i) => {
          if (!p) return <div key={`empty-${i}`} style={{ flex: 1 }} />;
          const originalRank = rankedPlayers.find((f) => f.id === p.id)?.rank ?? 1;
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
                max={players.length || 1}
                value={topN}
                onChange={(e) =>
                  setTopN(
                    Math.max(1, Math.min(Number(e.target.value) || 1, rankedPlayers.length || 1))
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
                const rank = rankedPlayers.find((f) => f.id === p.id)?.rank ?? 0;
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
    gridTemplateColumns: "1fr",
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
  errorText: {
    color: "#E88A4C",
    fontSize: 13,
  },
};

// Mount the app when this file is used as the entrypoint.
const rootEl = document.getElementById("app");
if (rootEl) {
  createRoot(rootEl).render(<Leaderboard />);
}
