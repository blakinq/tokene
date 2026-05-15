"use client";

import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const LENGTH_UNITS = ["px", "rem", "em", "%", "vh", "vw", "vmin", "vmax"];
const DURATION_UNITS = ["ms", "s"];
const EASING_PRESETS = [
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
];

function splitLength(raw: string, units: string[]) {
  const match = raw.match(/^(-?[\d.]+)([a-z%]+)$/i);
  if (match && units.includes(match[2])) {
    return { num: match[1], unit: match[2] };
  }
  return { num: "", unit: units[0] };
}

type Props = {
  type: string;
  invalid?: boolean;
};

export function ValueEditor({ type, invalid }: Props) {
  const [useReference, setUseReference] = useState(false);
  const [value, setValue] = useState("");

  // Reset editor whenever the token type changes so stale composite state
  // (e.g. a "px" unit) doesn't bleed into a fresh color value.
  useEffect(() => {
    setValue("");
    setUseReference(false);
  }, [type]);

  const editor = useMemo(() => {
    if (useReference) {
      return (
        <ReferenceEditor value={value} onChange={setValue} invalid={invalid} />
      );
    }
    switch (type) {
      case "color":
        return <ColorEditor value={value} onChange={setValue} invalid={invalid} />;
      case "spacing":
      case "sizing":
      case "radius":
      case "border_width":
        return (
          <UnitEditor
            value={value}
            onChange={setValue}
            invalid={invalid}
            units={LENGTH_UNITS}
            allowNegative={type === "spacing"}
          />
        );
      case "duration":
        return (
          <UnitEditor
            value={value}
            onChange={setValue}
            invalid={invalid}
            units={DURATION_UNITS}
          />
        );
      case "opacity":
        return <OpacityEditor value={value} onChange={setValue} invalid={invalid} />;
      case "z_index":
        return <IntegerEditor value={value} onChange={setValue} invalid={invalid} />;
      case "easing":
        return <EasingEditor value={value} onChange={setValue} invalid={invalid} />;
      case "typography":
      case "shadow":
      default:
        return (
          <FreeformEditor
            type={type}
            value={value}
            onChange={setValue}
            invalid={invalid}
          />
        );
    }
  }, [type, useReference, value, invalid]);

  return (
    <div className="space-y-2">
      {editor}
      <input type="hidden" name="value" value={value} />
      <div className="flex items-center gap-2 pt-1">
        <Switch
          id="use-reference"
          checked={useReference}
          onCheckedChange={(checked) => {
            setUseReference(checked);
            setValue("");
          }}
        />
        <Label
          htmlFor="use-reference"
          className="text-muted-foreground text-xs font-normal"
        >
          Reference another token
        </Label>
      </div>
    </div>
  );
}

function ReferenceEditor({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  // Strip the {} wrappers when showing in the input; re-apply on change.
  const inner = value.replace(/^\{/, "").replace(/\}$/, "");
  return (
    <InputGroup>
      <InputGroupAddon align="inline-start" className="font-mono">
        {"{"}
      </InputGroupAddon>
      <InputGroupInput
        value={inner}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next ? `{${next}}` : "");
        }}
        placeholder="color.blue.600"
        className="font-mono"
        aria-invalid={invalid || undefined}
        autoFocus
      />
      <InputGroupAddon align="inline-end" className="font-mono">
        {"}"}
      </InputGroupAddon>
    </InputGroup>
  );
}

function ColorEditor({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
  const pickerValue = isHex ? value : "#000000";

  return (
    <div className="flex items-center gap-2">
      <label
        className="border-input relative inline-flex size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border"
        style={{ background: isHex || value ? value : "transparent" }}
        aria-label="Pick a color"
      >
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        {!value ? (
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(45deg, var(--muted) 25%, transparent 25%, transparent 75%, var(--muted) 75%), linear-gradient(45deg, var(--muted) 25%, transparent 25%, transparent 75%, var(--muted) 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 4px 4px",
            }}
          />
        ) : null}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#005FCC"
        className="font-mono"
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}

function UnitEditor({
  value,
  onChange,
  invalid,
  units,
  allowNegative,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  units: string[];
  allowNegative?: boolean;
}) {
  const initial = splitLength(value, units);
  const [num, setNum] = useState(initial.num);
  const [unit, setUnit] = useState(initial.unit);

  // Keep the synthesized string in sync.
  useEffect(() => {
    if (num === "") {
      onChange("");
    } else {
      onChange(`${num}${unit}`);
    }
  }, [num, unit, onChange]);

  // If the parent resets `value` (e.g. type change), clear our local state.
  useEffect(() => {
    if (value === "") setNum("");
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        min={allowNegative ? undefined : 0}
        value={num}
        onChange={(e) => setNum(e.target.value)}
        placeholder="16"
        className="font-mono"
        aria-invalid={invalid || undefined}
      />
      <Select value={unit} onValueChange={setUnit}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {units.map((u) => (
              <SelectItem key={u} value={u} className="font-mono">
                {u}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function OpacityEditor({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const numeric = Number(value);
  const sliderValue = Number.isFinite(numeric) ? numeric : 0;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={sliderValue}
        onChange={(e) => onChange(e.target.value)}
        className="accent-foreground h-2 flex-1"
        aria-label="Opacity"
      />
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.5"
        className="w-24 font-mono"
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}

function IntegerEditor({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      step={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="10"
      className="font-mono"
      aria-invalid={invalid || undefined}
    />
  );
}

function EasingEditor({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const isPreset = EASING_PRESETS.includes(value);
  const [mode, setMode] = useState<"preset" | "custom">(
    !value || isPreset ? "preset" : "custom",
  );

  // Reset to preset when parent clears value.
  useEffect(() => {
    if (value === "") setMode("preset");
  }, [value]);

  if (mode === "custom") {
    return (
      <div className="space-y-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="cubic-bezier(0.4, 0, 0.2, 1)"
          className="font-mono"
          aria-invalid={invalid || undefined}
        />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
          onClick={() => {
            setMode("preset");
            onChange("");
          }}
        >
          Use a preset instead
        </button>
      </div>
    );
  }

  return (
    <Select
      value={isPreset ? value : ""}
      onValueChange={(v) => {
        if (v === "__custom__") {
          setMode("custom");
          onChange("");
        } else {
          onChange(v);
        }
      }}
    >
      <SelectTrigger aria-invalid={invalid || undefined}>
        <SelectValue placeholder="Choose easing…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {EASING_PRESETS.map((p) => (
            <SelectItem key={p} value={p} className="font-mono">
              {p}
            </SelectItem>
          ))}
          <SelectItem value="__custom__">Custom cubic-bezier…</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function FreeformEditor({
  type,
  value,
  onChange,
  invalid,
}: {
  type: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const placeholder =
    type === "typography"
      ? "500 16px/1.5 Inter, sans-serif"
      : type === "shadow"
        ? "0 1px 2px rgba(0,0,0,0.08)"
        : "Literal value";
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="font-mono"
      aria-invalid={invalid || undefined}
    />
  );
}
