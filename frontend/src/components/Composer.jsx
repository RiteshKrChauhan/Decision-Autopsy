import { useState } from "react";

export default function Composer({ value, onChange, onSubmit, disabled, placeholder }) {
  const [localValue, setLocalValue] = useState("");
  const controlled = typeof value === "string";
  const text = controlled ? value : localValue;

  function setText(next) {
    if (controlled) {
      onChange(next);
    } else {
      setLocalValue(next);
    }
  }

  return (
    <form
      className="composer"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(text);
      }}
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        maxLength={500}
        disabled={disabled}
        rows={3}
      />
      <button type="submit" disabled={disabled}>Analyze</button>
    </form>
  );
}
