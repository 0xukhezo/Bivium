"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K> | null;
  onSort: (key: K) => void;
  align?: "left" | "right";
}

export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: SortableHeaderProps<K>) {
  const active = sort?.key === sortKey;
  const direction = active ? sort.direction : null;
  const ariaSort: "ascending" | "descending" | "none" = active
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors duration-base ease-out-expo hover:text-text-primary",
          align === "right" && "flex-row-reverse",
          active && "text-text-primary",
        )}
      >
        <span>{label}</span>
        {direction === "asc" ? (
          <ChevronUp size={14} aria-hidden="true" className="text-accent" />
        ) : direction === "desc" ? (
          <ChevronDown size={14} aria-hidden="true" className="text-accent" />
        ) : (
          <ChevronsUpDown
            size={14}
            aria-hidden="true"
            className="opacity-40"
          />
        )}
      </button>
    </th>
  );
}

// Cycle: unsorted -> asc -> desc -> unsorted. Different column resets to asc.
export function nextSort<K extends string>(
  prev: SortState<K> | null,
  key: K,
): SortState<K> | null {
  if (!prev || prev.key !== key) return { key, direction: "asc" };
  if (prev.direction === "asc") return { key, direction: "desc" };
  return null;
}
