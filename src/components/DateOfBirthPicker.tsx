import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DateOfBirthPickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  className?: string;
}

const MONTHS = [
  { value: "0", label: "Janeiro" },
  { value: "1", label: "Fevereiro" },
  { value: "2", label: "Março" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Maio" },
  { value: "5", label: "Junho" },
  { value: "6", label: "Julho" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Setembro" },
  { value: "9", label: "Outubro" },
  { value: "10", label: "Novembro" },
  { value: "11", label: "Dezembro" },
];

export function DateOfBirthPicker({ value, onChange, className }: DateOfBirthPickerProps) {
  const currentYear = new Date().getFullYear();
  const minYear = 1940;
  const maxYear = currentYear - 10; // Minimum age of 10

  const years = useMemo(() => {
    const result = [];
    for (let year = maxYear; year >= minYear; year--) {
      result.push(year);
    }
    return result;
  }, [maxYear]);

  const selectedDay = value ? value.getDate().toString() : "";
  const selectedMonth = value ? value.getMonth().toString() : "";
  const selectedYear = value ? value.getFullYear().toString() : "";

  const daysInMonth = useMemo(() => {
    if (!selectedMonth || !selectedYear) return 31;
    return new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const days = useMemo(() => {
    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      result.push(day);
    }
    return result;
  }, [daysInMonth]);

  const handleChange = (type: "day" | "month" | "year", val: string) => {
    let day = selectedDay ? parseInt(selectedDay) : 1;
    let month = selectedMonth ? parseInt(selectedMonth) : 0;
    let year = selectedYear ? parseInt(selectedYear) : currentYear - 25;

    if (type === "day") day = parseInt(val);
    if (type === "month") month = parseInt(val);
    if (type === "year") year = parseInt(val);

    // Adjust day if it exceeds the days in the new month
    const maxDays = new Date(year, month + 1, 0).getDate();
    if (day > maxDays) day = maxDays;

    const newDate = new Date(year, month, day);
    onChange(newDate);
  };

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      <Select value={selectedDay} onValueChange={(val) => handleChange("day", val)}>
        <SelectTrigger className="w-full bg-background/80 backdrop-blur-sm border-border/50 focus:ring-primary/30">
          <SelectValue placeholder="Dia" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {days.map((day) => (
            <SelectItem key={day} value={day.toString()}>
              {day.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedMonth} onValueChange={(val) => handleChange("month", val)}>
        <SelectTrigger className="w-full bg-background/80 backdrop-blur-sm border-border/50 focus:ring-primary/30">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {MONTHS.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedYear} onValueChange={(val) => handleChange("year", val)}>
        <SelectTrigger className="w-full bg-background/80 backdrop-blur-sm border-border/50 focus:ring-primary/30">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
