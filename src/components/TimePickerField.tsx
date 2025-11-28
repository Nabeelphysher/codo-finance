import { useMemo, useState } from "react";
import { Clock, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const buildTimeOptions = (stepMinutes: number) => {
  const normalizedStep = Math.max(1, Math.min(60, stepMinutes));
  const options: string[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += normalizedStep) {
      const current = new Date();
      current.setHours(hour, minute, 0, 0);
      options.push(
        current
          .toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          .replace(" ", " "),
      );
    }
  }

  return options;
};

export interface TimePickerFieldProps {
  id: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  granularityMinutes?: number;
  disabled?: boolean;
  placeholder?: string;
}

export const TimePickerField = ({
  id,
  label,
  value,
  onChange,
  granularityMinutes = 5,
  disabled,
  placeholder = "Select time",
}: TimePickerFieldProps) => {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => buildTimeOptions(granularityMinutes), [granularityMinutes]);
  const displayValue = value || placeholder;

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm font-normal transition hover:bg-muted/80",
              !value && "text-muted-foreground",
              disabled && "cursor-not-allowed opacity-70",
            )}
          >
            <Clock className="h-4 w-4" />
            <span>{displayValue}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <ScrollArea className="h-64">
            <div className="flex flex-col">
              {options.map((option) => {
                const isActive = option === value;
                return (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-sm",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
                    )}
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                  >
                    <span>{option}</span>
                    {isActive && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

