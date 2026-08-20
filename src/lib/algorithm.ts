import { Assignment, EventType, Member } from "../types";

export const SLOT_COUNTS: Record<EventType, number> = {
  wednesday: 1,
  friday: 2,
  saturday: 3,
};

export interface DaySpec {
  date: string; // ISO date format YYYY-MM-DD
  eventType: EventType;
}

export function generateMonthAssignments(
  daysInMonth: DaySpec[],
  members: Member[],
  existingAssignments: Assignment[] = [],
): Assignment[] {
  const activeMembers = members.filter((m) => m.active);
  if (activeMembers.length === 0) {
    return existingAssignments;
  }

  // Create lookup for existing assignments by key (date + index) or date
  const existingByDate = new Map<string, Assignment[]>();
  for (const assignment of existingAssignments) {
    const list = existingByDate.get(assignment.day_date) || [];
    list.push(assignment);
    existingByDate.set(assignment.day_date, list);
  }

  // Track assignment counts per member (starting with locked assignments)
  const memberCounts = new Map<string, number>();
  activeMembers.forEach((m) => memberCounts.set(m.id, 0));

  for (const assignment of existingAssignments) {
    if (
      assignment.locked &&
      assignment.member_id &&
      memberCounts.has(assignment.member_id)
    ) {
      memberCounts.set(
        assignment.member_id,
        (memberCounts.get(assignment.member_id) || 0) + 1,
      );
    }
  }

  const result: Assignment[] = [];

  for (const day of daysInMonth) {
    const requiredSlots = SLOT_COUNTS[day.eventType];
    const dayExisting = existingByDate.get(day.date) || [];

    const assignedToday = new Set<string>();

    for (let slotIdx = 0; slotIdx < requiredSlots; slotIdx++) {
      const existingSlot = dayExisting[slotIdx];

      if (existingSlot && existingSlot.locked && existingSlot.member_id) {
        result.push({ ...existingSlot });
        assignedToday.add(existingSlot.member_id);
      } else {
        // Pick an unassigned member for today with the lowest total count
        const availableMembers = activeMembers.filter(
          (m) => !assignedToday.has(m.id),
        );

        let chosenMemberId: string | null = null;

        if (availableMembers.length > 0) {
          // Find lowest count
          let minCount = Infinity;
          availableMembers.forEach((m) => {
            const count = memberCounts.get(m.id) || 0;
            if (count < minCount) {
              minCount = count;
            }
          });

          // Candidates tied for min count
          const candidates = availableMembers.filter(
            (m) => (memberCounts.get(m.id) || 0) === minCount,
          );

          // Random tie-break
          const selected =
            candidates[Math.floor(Math.random() * candidates.length)];
          chosenMemberId = selected.id;

          // Increment count and mark as assigned today
          memberCounts.set(
            chosenMemberId,
            (memberCounts.get(chosenMemberId) || 0) + 1,
          );
          assignedToday.add(chosenMemberId);
        }

        result.push({
          id: existingSlot?.id || crypto.randomUUID(),
          month_id: existingSlot?.month_id || "",
          day_date: day.date,
          event_type: day.eventType,
          member_id: chosenMemberId,
          locked: false,
        });
      }
    }
  }

  return result;
}
