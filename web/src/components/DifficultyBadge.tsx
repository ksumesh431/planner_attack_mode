interface DifficultyBadgeProps {
  kind: "pd" | "ad";
  value: number | null;
  showKind?: boolean;
  onClick?: () => void;
}

function tone(value: number): string {
  if (value >= 7) return "hard";
  if (value >= 4) return "moderate";
  return "easy";
}

export function DifficultyBadge({ kind, value, showKind = false, onClick }: DifficultyBadgeProps) {
  const label = kind === "pd" ? "Perceived difficulty" : "Actual difficulty";
  const text = value === null ? "—" : `${showKind ? `${kind.toUpperCase()} ` : ""}${value}/10`;
  const className = `difficulty-badge ${kind}${
    value === null ? " empty" : ` ${tone(value)}`
  }`;

  if (onClick && value !== null) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-label={`${label}: ${value} out of 10. Edit.`}
        title="Edit actual difficulty"
      >
        {text}
      </button>
    );
  }

  return (
    <span className={className} aria-label={`${label}: ${value ?? "not set"}`}>
      {text}
    </span>
  );
}
