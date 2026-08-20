import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Plus, Save } from "lucide-react";
import { useState } from "react";
import { useMonthsContext } from "../context/MonthsContext";
import { MonthRecord } from "../types";

interface MonthPickerProps {
  isAdmin: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MonthPicker: React.FC<MonthPickerProps> = ({ isAdmin }) => {
  const { months, selectedMonth, setSelectedMonth, createMonth, loading } =
    useMonthsContext();
  const [creating, setCreating] = useState(false);

  const isSelectedSaved =
    selectedMonth && months.some((m) => m.id === selectedMonth.id);

  const formatMonthLabel = (m: MonthRecord) => {
    const isSaved = months.some((stored) => stored.id === m.id);
    return `${MONTH_NAMES[m.month - 1]} ${m.year}${m.is_current ? " (Current)" : ""}${!isSaved ? " (Preview)" : ""}`;
  };

  const handleSelectValueChange = (val: string | null) => {
    if (!val) return;

    // Check if in stored months
    const stored = months.find((m) => m.id === val);
    if (stored) {
      setSelectedMonth(stored);
      return;
    }

    // Parse year-month if format is virtual-year-month
    if (val.startsWith("virtual-")) {
      const parts = val.replace("virtual-", "").split("-").map(Number);
      setSelectedMonth({
        id: val,
        year: parts[0],
        month: parts[1],
        is_current: false,
      });
    }
  };

  const handlePrevMonth = () => {
    if (!selectedMonth) return;
    let newYear = selectedMonth.year;
    let newMonth = selectedMonth.month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    const match = months.find(
      (m) => m.year === newYear && m.month === newMonth,
    );
    if (match) {
      setSelectedMonth(match);
    } else {
      setSelectedMonth({
        id: `virtual-${newYear}-${newMonth}`,
        year: newYear,
        month: newMonth,
        is_current: false,
      });
    }
  };

  const handleNextMonth = () => {
    if (!selectedMonth) return;
    let newYear = selectedMonth.year;
    let newMonth = selectedMonth.month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const match = months.find(
      (m) => m.year === newYear && m.month === newMonth,
    );
    if (match) {
      setSelectedMonth(match);
    } else {
      setSelectedMonth({
        id: `virtual-${newYear}-${newMonth}`,
        year: newYear,
        month: newMonth,
        is_current: false,
      });
    }
  };

  const handleSaveCurrentMonth = async () => {
    if (!selectedMonth) return;
    setCreating(true);
    await createMonth(selectedMonth.year, selectedMonth.month);
    setCreating(false);
  };

  const handleCreateNextMonth = async () => {
    let nextYear: number;
    let nextMonthNum: number;

    if (months.length > 0) {
      const sorted = [...months].sort(
        (a, b) => a.year - b.year || a.month - b.month,
      );
      const latest = sorted[sorted.length - 1];
      if (latest.month === 12) {
        nextYear = latest.year + 1;
        nextMonthNum = 1;
      } else {
        nextYear = latest.year;
        nextMonthNum = latest.month + 1;
      }
    } else if (selectedMonth) {
      if (selectedMonth.month === 12) {
        nextYear = selectedMonth.year + 1;
        nextMonthNum = 1;
      } else {
        nextYear = selectedMonth.year;
        nextMonthNum = selectedMonth.month + 1;
      }
    } else {
      const now = new Date();
      nextYear = now.getFullYear();
      nextMonthNum = now.getMonth() + 1;
    }

    setCreating(true);
    await createMonth(nextYear, nextMonthNum);
    setCreating(false);
  };

  const currentSelectValue = selectedMonth
    ? isSelectedSaved
      ? selectedMonth.id
      : `virtual-${selectedMonth.year}-${selectedMonth.month}`
    : "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Month Navigation & Dropdown */}
      <div className="flex items-center space-x-1 border border-border rounded-xl p-1 bg-card shadow-xs">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          title="Previous Month"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center">
          <Select
            value={currentSelectValue}
            onValueChange={handleSelectValueChange}
          >
            <SelectTrigger className="h-8 border-none bg-transparent shadow-none font-semibold text-xs sm:text-sm gap-2 focus:ring-0">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <SelectValue placeholder="Select Month">
                {selectedMonth ? formatMonthLabel(selectedMonth) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {selectedMonth && !isSelectedSaved && (
                <SelectItem
                  value={`virtual-${selectedMonth.year}-${selectedMonth.month}`}
                >
                  {formatMonthLabel(selectedMonth)}
                </SelectItem>
              )}
              {months.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {formatMonthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          title="Next Month"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <>
          {!isSelectedSaved && selectedMonth && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveCurrentMonth}
              disabled={creating || loading}
              title="Save this month's calendar to database"
              className="gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{creating ? "Saving..." : "Save Month to DB"}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNextMonth}
            disabled={creating || loading}
            title="Initialize calendar slots for the next month"
            className="gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>{creating ? "Creating..." : "Add Next Month"}</span>
          </Button>
        </>
      )}
    </div>
  );
};
