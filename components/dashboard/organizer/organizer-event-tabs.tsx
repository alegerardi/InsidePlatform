import Link from "next/link";
import type { OrganizerTab } from "./organizer-dashboard-types";
import { getDashboardHref } from "./organizer-dashboard-utils";

type OrganizerEventTabsProps = {
  eventSlug: string;
  selectedTab: OrganizerTab;
};

const tabs: {
  value: OrganizerTab;
  label: string;
}[] = [
  { value: "overview", label: "Overview" },
  { value: "staff", label: "Staff" },
  { value: "links", label: "Links" },
  { value: "actions", label: "Actions" },
];

export function OrganizerEventTabs({
  eventSlug,
  selectedTab,
}: OrganizerEventTabsProps) {
  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isSelected = tab.value === selectedTab;

        return (
          <Link
            key={tab.value}
            href={getDashboardHref(eventSlug, tab.value)}
            className={
              isSelected
                ? "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                : "rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}