import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { forwardRef, useMemo } from "react";
import { useDayConfigsContext } from "../context/DayConfigsContext";
import { Assignment, Member, MonthRecord } from "../types";
import { DayCell } from "./DayCell";

interface CalendarGridProps {
	monthRecord: MonthRecord | null;
	assignments: Assignment[];
	members: Member[];
	isAdmin: boolean;
	activeDragMemberId: string | null;
	onUpdateAssignment: (id: string, memberId: string | null) => Promise<void>;
	onToggleLock: (id: string) => Promise<void>;
}

interface WeekRow {
	weekNumber: number;
	wednesdayDate: string | null;
	fridayDate: string | null;
	saturdayDate: string | null;
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

function getWeeksForMonth(year: number, month: number): WeekRow[] {
	const weeks: WeekRow[] = [];
	const daysInMonth = new Date(year, month, 0).getDate();
	const dateToDayOfWeek = new Map<number, number>();
	for (let d = 1; d <= daysInMonth; d++) {
		dateToDayOfWeek.set(d, new Date(year, month - 1, d).getDay());
	}

	let currentWeekWed: string | null = null;
	let currentWeekFri: string | null = null;
	let currentWeekSat: string | null = null;
	let weekNum = 1;

	for (let d = 1; d <= daysInMonth; d++) {
		const dayOfWeek = dateToDayOfWeek.get(d)!;
		const mm = String(month).padStart(2, "0");
		const dd = String(d).padStart(2, "0");
		const dateStr = `${year}-${mm}-${dd}`;

		if (dayOfWeek === 3) currentWeekWed = dateStr;
		if (dayOfWeek === 5) currentWeekFri = dateStr;
		if (dayOfWeek === 6) currentWeekSat = dateStr;

		if (dayOfWeek === 6 || d === daysInMonth) {
			if (currentWeekWed || currentWeekFri || currentWeekSat) {
				weeks.push({
					weekNumber: weekNum++,
					wednesdayDate: currentWeekWed,
					fridayDate: currentWeekFri,
					saturdayDate: currentWeekSat,
				});
			}
			currentWeekWed = null;
			currentWeekFri = null;
			currentWeekSat = null;
		}
	}

	return weeks;
}

function formatDateShort(dateStr: string): string {
	const [y, m, d] = dateStr.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export const CalendarGrid = forwardRef<HTMLDivElement, CalendarGridProps>(
	(
		{
			monthRecord,
			assignments,
			members,
			isAdmin,
			activeDragMemberId,
			onUpdateAssignment,
			onToggleLock,
		},
		ref,
	) => {
		const memberMap = useMemo(() => {
			const map: Record<string, Member> = {};
			members.forEach((m) => {
				map[m.id] = m;
			});
			return map;
		}, [members]);

		const { configs: slotCounts } = useDayConfigsContext();

		const assignmentsByDate = useMemo(() => {
			const map: Record<string, Assignment[]> = {};
			assignments.forEach((a) => {
				if (!map[a.day_date]) map[a.day_date] = [];
				map[a.day_date].push(a);
			});
			return map;
		}, [assignments]);

		const weeks = useMemo(() => {
			if (!monthRecord) return [];
			return getWeeksForMonth(monthRecord.year, monthRecord.month);
		}, [monthRecord]);

		const handleClear = async (assignmentId: string) => {
			await onUpdateAssignment(assignmentId, null);
		};

		if (!monthRecord) {
			return (
				<Card className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-border shadow-xs">
					<CalendarIcon className="w-12 h-12 mb-3 text-muted-foreground/60 animate-pulse" />
					<p className="text-lg font-medium">No Month Selected</p>
					<p className="text-sm text-muted-foreground mt-1">
						Select or create a month to view the schedule.
					</p>
				</Card>
			);
		}

		const now = new Date();
		const isCurrent =
			monthRecord.is_current ||
			(monthRecord.year === now.getFullYear() && monthRecord.month === now.getMonth() + 1);

		const monthTitle = `${MONTH_NAMES[monthRecord.month - 1]} ${monthRecord.year}`;

		return (
			<Card
				ref={ref}
				className="w-full border border-border shadow-sm font-sans select-none">
				{/* Header */}
				<CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border gap-3 pb-4">
					<div>
						<div className="flex items-center space-x-2">
							<Sparkles className="w-5 h-5 text-amber-500" />
							<CardTitle className="text-2xl font-bold font-heading">{monthTitle}</CardTitle>
						</div>
					</div>
					<Badge className="gap-1.5 px-3 py-1 font-semibold w-fit">
						<CalendarDays className="w-3.5 h-3.5" />
						{isCurrent ? "Current Month" : "Archived Month"}
					</Badge>
				</CardHeader>
				<CardContent>
					{/* Column Headers */}
					<div className="grid grid-cols-3 tracking-wide justify-items-center">
						<Badge
							variant="outline"
							size="xl">
							🙏 Wednesday
						</Badge>
						<Badge
							variant="outline"
							size="xl">
							🎷 Friday
						</Badge>
						<Badge
							variant="outline"
							size="xl">
							⛪ Saturday
						</Badge>
					</div>

					{/* Weeks */}
					<div className="space-y-1">
						{weeks.map((week) => (
							<div
								key={week.weekNumber}
								className="grid grid-cols-3 gap-1">
								{(["wednesdayDate", "fridayDate", "saturdayDate"] as const).map((key, colIdx) => {
									const eventType = ["wednesday", "friday", "saturday"][colIdx];
									const dateStr = week[key];
									if (!dateStr) {
										return (
											<div
												key={key}
												className="border border-dashed rounded-lg flex items-center justify-center">
												<span className="text-lg">No service</span>
											</div>
										);
									}
									const dayAssignments = assignmentsByDate[dateStr] || [];
									return (
										<DayCell
											key={key}
											date={dateStr}
											assignments={dayAssignments}
											memberMap={memberMap}
											maxSlots={slotCounts[eventType as keyof typeof slotCounts]}
											isAdmin={isAdmin}
											activeDragMemberId={activeDragMemberId}
											onClearAssignment={handleClear}
											onToggleLock={onToggleLock}
											formatDate={formatDateShort}
										/>
									);
								})}
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	},
);

CalendarGrid.displayName = "CalendarGrid";
