import { Assignment, DaySpec, EventType, Member } from "../types";

export type { DaySpec };

export const SLOT_COUNTS: Record<EventType, number> = {
  wednesday: 1,
  friday: 2,
  saturday: 3,
  special: 1,
};

export function generateMonthAssignments(
  daysInMonth: DaySpec[],
  members: Member[],
  existingAssignments: Assignment[] = [],
): Assignment[] {
  const activeMembers = members.filter((m) => m.active);

  // Group existing assignments by date
  const existingByDate = new Map<string, Assignment[]>();
  for (const assignment of existingAssignments) {
    const list = existingByDate.get(assignment.day_date) || [];
    list.push(assignment);
    existingByDate.set(assignment.day_date, list);
  }

  // Track running assignment counts per active member, starting with locked assignments
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
    const defaultSlots = SLOT_COUNTS[day.eventType] || 1;
    const dayExisting = existingByDate.get(day.date) || [];
    const requiredSlots = Math.max(defaultSlots, dayExisting.length);

    const slots: (Assignment | null)[] = new Array(requiredSlots).fill(null);
    const assignedToday = new Set<string>();

    // Pass 1: Keep all locked assignments and mark their members as assigned today
    for (let i = 0; i < requiredSlots; i++) {
      const existing = dayExisting[i];
      if (existing && existing.locked) {
        slots[i] = { ...existing };
        if (existing.member_id) {
          assignedToday.add(existing.member_id);
        }
      }
    }

    // Pass 2: Fill unlocked slots using weighted round-robin among available active members
    for (let i = 0; i < requiredSlots; i++) {
      if (slots[i] !== null) continue;

      const existingSlot = dayExisting[i];

      // Available active members not yet assigned today
      let availableMembers = activeMembers.filter(
        (m) => !assignedToday.has(m.id),
      );

      // If everyone is assigned today but we still have slots (e.g. members < requiredSlots),
      // fall back to all active members to avoid leaving slots empty
      if (availableMembers.length === 0 && activeMembers.length > 0) {
        availableMembers = [...activeMembers];
      }

      let chosenMemberId: string | null = null;

      if (availableMembers.length > 0) {
        // Find minimum count among available members
        let minCount = Infinity;
        for (const m of availableMembers) {
          const count = memberCounts.get(m.id) || 0;
          if (count < minCount) {
            minCount = count;
          }
        }

        const candidates = availableMembers.filter(
          (m) => (memberCounts.get(m.id) || 0) === minCount,
        );

        // Break ties randomly
        const selected =
          candidates[Math.floor(Math.random() * candidates.length)];
        chosenMemberId = selected.id;

        // Update counts and assigned state
        memberCounts.set(
          chosenMemberId,
          (memberCounts.get(chosenMemberId) || 0) + 1,
        );
        assignedToday.add(chosenMemberId);
      }

      slots[i] = {
        id: existingSlot?.id || crypto.randomUUID(),
        month_id: existingSlot?.month_id || "",
        day_date: day.date,
        event_type: day.eventType,
        member_id: chosenMemberId,
        locked: false,
      };
    }

    for (const slot of slots) {
      if (slot) {
        result.push(slot);
      }
    }
  }

  return result;
}
