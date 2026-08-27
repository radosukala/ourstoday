import { notFound } from "next/navigation";
import { loadEditionInputs, EditionRangeError } from "@/edition/data";
import {
  composeEdition,
  dayToDateUtc,
  editionDateLabel,
  latestReportableDay,
} from "@/edition/compose";
import { EditionView } from "../EditionView";
import type { Metadata } from "next";

/**
 * The archive: any completed day, recomputed from the canonical log on
 * request. Nothing is stored per edition — an archive that has to be kept in
 * sync with the record it summarizes would eventually disagree with it.
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ day: string }>;
}): Promise<Metadata> {
  const { day } = await params;
  const parsed = Number.parseInt(day, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return {};
  const title = `Day ${parsed} · The Edition · OURS TODAY`;
  const description = `The record of ${editionDateLabel(dayToDateUtc(parsed))}, day ${parsed} of OURS: recomputed from the canonical ledger.`;
  return {
    title,
    description,
    openGraph: { title: `OURS TODAY — Day ${parsed}`, description },
    twitter: { card: "summary_large_image", title: `OURS TODAY — Day ${parsed}`, description },
  };
}

export default async function EditionArchivePage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const parsed = Number.parseInt(day, 10);
  if (!Number.isInteger(parsed) || String(parsed) !== day) notFound();

  let edition;
  try {
    edition = composeEdition(await loadEditionInputs(parsed));
  } catch (error) {
    if (error instanceof EditionRangeError) notFound();
    throw error;
  }
  return <EditionView edition={edition} latestDay={latestReportableDay(new Date())} />;
}
