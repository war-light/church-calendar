import assert from "node:assert";
import { describe, test } from "node:test";
import { Assignment, Member } from "../types";
import { DaySpec, generateMonthAssignments } from "./algorithm";

const mockMembers: Member[] = [
  { id: "m1", name: "Alice", active: true, created_at: "2026-01-01" },
  { id: "m2", name: "Bob", active: true, created_at: "2026-01-01" },
  { id: "m3", name: "Charlie", active: true, created_at: "2026-01-01" },
  { id: "m4", name: "Diana", active: true, created_at: "2026-01-01" },
  { id: "m5", name: "Evan", active: true, created_at: "2026-01-01" },
];

const daysInMonthSample: DaySpec[] = [
  { date: "2026-09-02", eventType: "wednesday" }, // 2 slots
  { date: "2026-09-04", eventType: "friday" }, // 2 slots
  { date: "2026-09-05", eventType: "saturday" }, // 3 slots
  { date: "2026-09-09", eventType: "wednesday" }, // 2 slots
  { date: "2026-09-11", eventType: "friday" }, // 2 slots
  { date: "2026-09-12", eventType: "saturday" }, // 3 slots
  { date: "2026-09-16", eventType: "wednesday" }, // 2 slots
  { date: "2026-09-18", eventType: "friday" }, // 2 slots
  { date: "2026-09-19", eventType: "saturday" }, // 3 slots
];

describe("generateMonthAssignments Algorithm Tests", () => {
  test("5 members, empty month - correct slot counts, no daily duplicates, balanced distribution", () => {
    const assignments = generateMonthAssignments(
      daysInMonthSample,
      mockMembers,
      [],
    );

    // Total slots: 3 wed (3*2) + 3 fri (3*2) + 3 sat (3*3) = 6 + 6 + 9 = 21 slots
    assert.strictEqual(assignments.length, 21);

    // Group by date to check daily uniqueness
    const byDate = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const list = byDate.get(a.day_date) || [];
      list.push(a);
      byDate.set(a.day_date, list);
    }

    // Check slot counts and daily uniqueness
    for (const day of daysInMonthSample) {
      const dayAssignments = byDate.get(day.date) || [];
      const expectedSlots =
        day.eventType === "wednesday" ? 2 : day.eventType === "friday" ? 2 : 3;
      assert.strictEqual(dayAssignments.length, expectedSlots);

      const memberIdsOnDay = dayAssignments
        .map((a) => a.member_id)
        .filter(Boolean);
      const uniqueMemberIdsOnDay = new Set(memberIdsOnDay);
      assert.strictEqual(
        memberIdsOnDay.length,
        uniqueMemberIdsOnDay.size,
        `Duplicate member found on ${day.date}`,
      );
    }

    // Check assignment counts distribution across active members
    const memberCounts: Record<string, number> = {};
    mockMembers.forEach((m) => (memberCounts[m.id] = 0));
    for (const a of assignments) {
      if (a.member_id) {
        memberCounts[a.member_id]++;
      }
    }

    const counts = Object.values(memberCounts);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    // With 21 slots and 5 members, counts should be 4 or 5 (max - min <= 1)
    assert.ok(
      maxCount - minCount <= 1,
      `Distribution unbalanced: min=${minCount}, max=${maxCount}`,
    );
  });

  test("5 members, some pre-locked slots - locked slots preserved & non-duplicate", () => {
    const lockedAssignments: Assignment[] = [
      {
        id: "lock-1",
        month_id: "m-sep",
        day_date: "2026-09-05", // Saturday (3 slots)
        event_type: "saturday",
        member_id: "m2", // Bob is locked in slot 0
        locked: true,
      },
    ];

    const assignments = generateMonthAssignments(
      daysInMonthSample,
      mockMembers,
      lockedAssignments,
    );

    assert.strictEqual(assignments.length, 21);

    // Verify lock-1 is present and unchanged
    const lock1 = assignments.find((a) => a.id === "lock-1");
    assert.ok(lock1);
    assert.strictEqual(lock1?.member_id, "m2");
    assert.strictEqual(lock1?.locked, true);

    // Check Saturday 2026-09-05 has 3 distinct members
    const satAssignments = assignments.filter(
      (a) => a.day_date === "2026-09-05",
    );
    assert.strictEqual(satAssignments.length, 3);

    const satMemberIds = satAssignments.map((a) => a.member_id);
    const satUniqueIds = new Set(satMemberIds);
    assert.strictEqual(
      satMemberIds.length,
      satUniqueIds.size,
      "Saturday has duplicate members despite locked slot",
    );
  });

  test("3 members (exactly enough for Saturday) - Saturday gets all 3 members", () => {
    const threeMembers = mockMembers.slice(0, 3);
    const assignments = generateMonthAssignments(
      [{ date: "2026-09-05", eventType: "saturday" }],
      threeMembers,
      [],
    );

    assert.strictEqual(assignments.length, 3);
    const assignedIds = new Set(assignments.map((a) => a.member_id));
    assert.strictEqual(assignedIds.size, 3);
    assert.ok(assignedIds.has("m1"));
    assert.ok(assignedIds.has("m2"));
    assert.ok(assignedIds.has("m3"));
  });

  test("Inactive members are excluded from auto-assignment", () => {
    const membersWithInactive: Member[] = [
      ...mockMembers.slice(0, 4),
      { id: "m5", name: "Evan", active: false, created_at: "2026-01-01" },
    ];

    const assignments = generateMonthAssignments(
      daysInMonthSample,
      membersWithInactive,
      [],
    );

    const evanAssignments = assignments.filter((a) => a.member_id === "m5");
    assert.strictEqual(
      evanAssignments.length,
      0,
      "Inactive member Evan should not receive assignments",
    );
  });
});
