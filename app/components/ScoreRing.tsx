export function scoreTone(score: number) {
  return score >= 65 ? "var(--good)" : score >= 45 ? "var(--warn)" : "var(--muted)";
}

export function scoreLabel(score: number) {
  return score >= 65 ? "Strong match" : score >= 45 ? "Good match" : "Partial match";
}

/** `none` = no skill from the CV appears in the job (e.g. an explicit search outside your field): show a dash, not a misleading 1%. */
export default function ScoreRing({ score, size = 48, none = false }: { score: number; size?: number; none?: boolean }) {
  const stroke = size >= 60 ? 6 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={none ? "No skills from your CV found in this job" : `${score} percent match, ${scoreLabel(score)}`}>
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
          strokeDashoffset={none ? c : c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-semibold tabular-nums" style={{ fontSize: size >= 60 ? 18 : 13 }}>
        {none ? "–" : score}
      </span>
    </div>
  );
}
