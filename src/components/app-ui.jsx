import { format, isValid, parseISO } from "date-fns";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AppButton({ className = "", variant = "default", ...props }) {
  const appVariantClass =
    variant === "primary"
      ? "bg-blue text-white hover:bg-blue/90"
      : variant === "secondary"
        ? "border border-line bg-white text-zinc-700 hover:bg-zinc-50"
        : "";

  return (
    <Button
      variant={variant === "primary" ? "default" : variant}
      className={cn(appVariantClass, className)}
      {...props}
    />
  );
}

export function AppCard({ className = "", ...props }) {
  return (
    <Card
      className={cn("border-line bg-white text-ink shadow-soft", className)}
      {...props}
    />
  );
}

AppCard.Header = CardHeader;
AppCard.Title = CardTitle;
AppCard.Description = CardDescription;
AppCard.Action = CardAction;
AppCard.Content = CardContent;
AppCard.Footer = CardFooter;

export function AppInput({ className = "", ...props }) {
  return (
    <Input
      className={cn(
        "border-line bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:border-blue/40 focus-visible:ring-blue/10",
        className,
      )}
      {...props}
    />
  );
}

export function AppSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select",
  className = "",
  triggerClassName = "",
  contentClassName = "",
}) {
  return (
    <Select value={String(value ?? "")} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-8 w-full border-line bg-white text-xs shadow-none focus:ring-blue/10",
          triggerClassName,
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("border-line bg-white", contentClassName)}>
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppCombobox({
  options = [],
  value,
  onChange,
  placeholder = "Select",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => String(option.value) === String(value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AppButton
          type="button"
          variant="secondary"
          className={cn(
            "h-8 w-full justify-between px-2 text-left text-xs font-medium shadow-none",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected?.initials && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue/10 text-[9px] font-bold text-blue">
                {selected.initials}
              </span>
            )}
            <span className={cn("truncate", selected ? "text-zinc-800" : "text-zinc-400")}>
              {selected?.label || placeholder}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-zinc-400" />
        </AppButton>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.value} ${option.label} ${option.description || ""}`}
                  data-checked={String(value) === String(option.value)}
                  onSelect={() => {
                    onChange(String(option.value));
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {String(value) === String(option.value) && (
                    <Check className="h-3.5 w-3.5 text-blue" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function AppModal({ open, onOpenChange, title, description, children, footer, className = "" }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl border-line bg-white", className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export function AppSheet({ open, onOpenChange, title, description, children, footer, className = "" }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("border-line bg-white", className)}>
        {(title || description) && (
          <SheetHeader>
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        {children}
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}

export function AppBadge({ className = "", tone = "neutral", ...props }) {
  const tones = {
    neutral: "border-zinc-200 bg-zinc-50 text-zinc-600",
    blue: "border-blue/20 bg-blue/5 text-blue",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <Badge
      variant="outline"
      className={cn("h-6 rounded-md px-2 text-[11px] font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

export function AppTable({ className = "", ...props }) {
  return <Table className={cn("border-collapse text-sm", className)} {...props} />;
}

AppTable.Header = TableHeader;
AppTable.Body = TableBody;
AppTable.Row = TableRow;
AppTable.Head = TableHead;
AppTable.Cell = TableCell;

export function AppDatePicker({ value, onChange, placeholder = "No date", className = "" }) {
  const [open, setOpen] = useState(false);
  const parsedDate = value ? parseISO(value) : undefined;
  const selectedDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AppButton
          type="button"
          variant="secondary"
          className={cn("h-8 w-full justify-start px-2 text-xs font-medium shadow-none", className)}
        >
          {selectedDate ? format(selectedDate, "MMM d") : placeholder}
        </AppButton>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function AppToolbar({ className = "", ...props }) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2 shadow-soft", className)}
      {...props}
    />
  );
}

export function AppPageHeader({ title, description, actions, className = "" }) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export const AppDialog = AppModal;
