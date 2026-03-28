import { useState } from "react";

export default function Composer({ value, onChange, onSubmit, disabled, placeholder }) {
  const [localValue, setLocalValue] = useState("");
  const controlled = typeof value === "string";
  const text = controlled ? value : localValue;

  function submitText() {
    if (disabled) return;
    onSubmit(text);
  }

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
        submitText();
      }}
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          if (event.shiftKey) return;
          if (event.nativeEvent?.isComposing) return;

          event.preventDefault();
          submitText();
        }}
        placeholder={placeholder}
        maxLength={500}
        disabled={disabled}
        rows={2}
      />
      <button type="submit" disabled={disabled} aria-label="Send decision">
        <span className="composer-send-icon" aria-hidden="true">↑</span>
      </button>
    </form>
  );
}
