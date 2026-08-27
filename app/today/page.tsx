import { loadEditionInputs } from "@/edition/data";
import { composeEdition, latestReportableDay } from "@/edition/compose";
import { EditionView } from "./EditionView";
import type { Metadata } from "next";

/**
 * Cached like /status and for the same reason: this is a public projection
 * with nothing session-specific, and a burst of readers must not keep the
 * database awake. The edition changes once a day.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const day = latestReportableDay(new Date());
  const title = `Day ${day} · The Edition · OURS TODAY`;
  const description =
    "The daily edition: the completed day's record — what formed, what was built, what is not " +
    "yet true, and the open decision — published the morning after, recomputable by anyone.";
  return {
    title,
    description,
    openGraph: {
      title: `OURS TODAY — Day ${day}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `OURS TODAY — Day ${day}`,
      description,
    },
  };
}

export default async function TodayPage() {
  const latest = latestReportableDay(new Date());
  const edition = composeEdition(await loadEditionInputs());
  return <EditionView edition={edition} latestDay={latest} />;
}
