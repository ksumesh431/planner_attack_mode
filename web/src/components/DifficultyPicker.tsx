interface DifficultyPickerProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  hint?: string;
}

export function DifficultyPicker({
  label,
  value,
  onChange,
  disabled = false,
  hint,
}: DifficultyPickerProps) {
  return (
    <div className="difficulty-picker">
      <div className="field-label-row">
        <span className="field-label">{label}</span>
        <span className="difficulty-reading">{value === null ? "—" : `${value}/10`}</span>
      </div>
      <div className="difficulty-options" role="group" aria-label={label}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
          <button
            key={number}
            type="button"
            className={`difficulty-option${value === number ? " selected" : ""}${
              number >= 7 ? " hard" : ""
            }`}
            aria-pressed={value === number}
            onClick={() => onChange(number)}
            disabled={disabled}
          >
            {number}
          </button>
        ))}
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}
