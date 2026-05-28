import { useEffect, useState } from "react";
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js";

type Props = {
  value: string;
  onChange: (e164: string) => void;
  isLight: boolean;
  inputClass: string;
};

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Локальная 8… → 7… для автоформата РФ при международной маске */
function normalizeDigits(digits: string): string {
  if (digits.startsWith("8") && digits.length >= 10) {
    return `7${digits.slice(1)}`;
  }
  return digits;
}

function formatFromDigits(digits: string): { display: string; e164: string } {
  const d = normalizeDigits(digits);
  if (!d) return { display: "", e164: "" };

  const ayt = new AsYouType();
  const display = ayt.input(`+${d}`);
  const e164 = ayt.getNumberValue() ?? `+${d}`;
  return { display, e164 };
}

function formatStored(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const parsed = parsePhoneNumberFromString(trimmed);
  if (parsed?.number) {
    const ayt = new AsYouType();
    return ayt.input(parsed.number);
  }

  return formatFromDigits(digitsOnly(trimmed)).display;
}

export function ProfilePhoneInput({ value, onChange, inputClass }: Props) {
  const [display, setDisplay] = useState(() => formatStored(value));

  useEffect(() => {
    setDisplay(formatStored(value));
  }, [value]);

  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      className={`${inputClass} w-full font-sans text-sm`}
      value={display}
      placeholder="+7 (999) 000-00-00"
      onChange={(e) => {
        const raw = e.target.value;
        const digits = digitsOnly(raw);
        if (!digits) {
          setDisplay("");
          onChange("");
          return;
        }
        const { display: nextDisplay, e164 } = formatFromDigits(digits);
        setDisplay(nextDisplay);
        onChange(e164);
      }}
      onFocus={() => {
        if (!display.trim()) setDisplay("+");
      }}
      onBlur={() => {
        if (display === "+") {
          setDisplay("");
          onChange("");
        }
      }}
    />
  );
}
