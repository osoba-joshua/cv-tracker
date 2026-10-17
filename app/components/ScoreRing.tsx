export function scoreTone(score: number) {
  return score >= 65 ? "var(--good)" : score >= 45 ? "var(--warn)" : "var(--muted)";
}

export function scoreLabel(score: number) {
  return score >= 65 ? "Strong match" : score >= 45 ? "Good match" : "Partial match";
}

export default function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const stroke = size >= 60 ? 6 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${score} percent match, ${scoreLabel(score)}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreTone(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-semibold tabular-nums" style={{ fontSize: size >= 60 ? 18 : 13 }}>
        {score}
      </span>
    </div>
  );
}
