/**
 * Deterministic per-member color assignment.
 * Full class strings are used so Tailwind does not purge them.
 */

export interface MemberColor {
  bg: string;
  text: string;
  border: string;
  dragBg: string; // slightly lighter for drag overlay
}

const MEMBER_COLORS: MemberColor[] = [
  {
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-white",
    border: "border-rose-400",
    dragBg: "bg-rose-400",
  },
  {
    bg: "bg-orange-500/10",
    text: "text-orange-700 dark:text-white",
    border: "border-orange-400",
    dragBg: "bg-orange-400",
  },
  {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-white",
    border: "border-amber-400",
    dragBg: "bg-amber-400",
  },
  {
    bg: "bg-lime-500/10",
    text: "text-lime-700 dark:text-white",
    border: "border-lime-400",
    dragBg: "bg-lime-400",
  },
  {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-white",
    border: "border-emerald-400",
    dragBg: "bg-emerald-400",
  },
  {
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-white",
    border: "border-teal-400",
    dragBg: "bg-teal-400",
  },
  {
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-white",
    border: "border-cyan-400",
    dragBg: "bg-cyan-400",
  },
  {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-white",
    border: "border-sky-400",
    dragBg: "bg-sky-400",
  },
  {
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-white",
    border: "border-blue-400",
    dragBg: "bg-blue-400",
  },
  {
    bg: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-white",
    border: "border-indigo-400",
    dragBg: "bg-indigo-400",
  },
  {
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-white",
    border: "border-violet-400",
    dragBg: "bg-violet-400",
  },
  {
    bg: "bg-purple-500/10",
    text: "text-purple-700 dark:text-white",
    border: "border-purple-400",
    dragBg: "bg-purple-400",
  },
  {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-700 dark:text-white",
    border: "border-fuchsia-400",
    dragBg: "bg-fuchsia-400",
  },
  {
    bg: "bg-pink-500/10",
    text: "text-pink-700 dark:text-white",
    border: "border-pink-400",
    dragBg: "bg-pink-400",
  },
  {
    bg: "bg-red-500/10",
    text: "text-red-700 dark:text-white",
    border: "border-red-400",
    dragBg: "bg-red-400",
  },
];

const assignedColorIndices = new Map<string, number>();

export function getMemberColor(memberId: string): MemberColor {
  if (!memberId) return MEMBER_COLORS[0];

  if (assignedColorIndices.has(memberId)) {
    const idx = assignedColorIndices.get(memberId)!;
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  }

  // Find color indices not yet assigned
  const usedIndices = new Set(
    Array.from(assignedColorIndices.values()).map(
      (idx) => idx % MEMBER_COLORS.length,
    ),
  );

  const availableIndices: number[] = [];
  for (let i = 0; i < MEMBER_COLORS.length; i++) {
    if (!usedIndices.has(i)) {
      availableIndices.push(i);
    }
  }

  let chosenIndex: number;
  if (availableIndices.length > 0) {
    // Pick deterministically from available unused indices using string hash
    let hash = 0;
    for (let i = 0; i < memberId.length; i++) {
      hash = (hash * 31 + memberId.charCodeAt(i)) | 0;
    }
    chosenIndex = availableIndices[Math.abs(hash) % availableIndices.length];
  } else {
    // All available colors exhausted, cycle through pool
    chosenIndex = assignedColorIndices.size % MEMBER_COLORS.length;
  }

  assignedColorIndices.set(memberId, chosenIndex);
  return MEMBER_COLORS[chosenIndex % MEMBER_COLORS.length];
}

export function resetMemberColors(): void {
  assignedColorIndices.clear();
}
