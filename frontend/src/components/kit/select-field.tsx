"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Option = string | { value: string; label: string };

/** A Radix select from a plain list of options. */
export function SelectField({ value, onChange, options, label, className, id }: { value: string; onChange: (value: string) => void; options: Option[]; label?: string; className?: string; id?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className={cn("w-full bg-card", className)}><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>;
        })}
      </SelectContent>
    </Select>
  );
}
