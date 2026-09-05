import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icons";

export type SelectOption = { value: string; label: string };

export function SelectMenu({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected =
    options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const move = (amount: number) => {
    const current = Math.max(
      0,
      options.findIndex((option) => option.value === value),
    );
    onChange(
      options[(current + amount + options.length) % options.length].value,
    );
    setOpen(true);
  };

  return (
    <div className={`select-menu ${className}`} ref={root}>
      <button
        type="button"
        className="select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          }
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <span>{selected?.label}</span>
        <Icon name="down" size={14} />
      </button>
      {open && (
        <div
          className="select-options"
          id={menuId}
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
