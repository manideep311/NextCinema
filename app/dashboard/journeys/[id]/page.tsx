import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getJourneyDef } from "@/lib/journeys/definitions";
import { getJourneyDetail } from "@/services/journeys";
import { JourneyExperience } from "@/components/features/journeys/journey-experience";
import type { JourneyOrderType } from "@/types/journey";

interface JourneyDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ order?: string }>;
}

const VALID_ORDERS: JourneyOrderType[] = ["release", "chronological", "essential"];

// Data fetching only — unchanged from before this redesign. All movie
// resolution, watched-state, and ordering logic still lives in
// services/journeys.ts; this page just hands the result to the client
// experience that presents it.
export default async function JourneyDetailPage({ params, searchParams }: JourneyDetailPageProps) {
  const { id } = await params;
  const { order } = await searchParams;

  const journeyDef = getJourneyDef(id);
  if (!journeyDef) notFound();

  const requestedOrder = VALID_ORDERS.find((o) => o === order);
  const selectedOrder: JourneyOrderType =
    requestedOrder && journeyDef.availableOrders.includes(requestedOrder)
      ? requestedOrder
      : journeyDef.availableOrders[0];

  const session = await getSession();
  const detail = await getJourneyDetail(journeyDef, selectedOrder, session?.userId ?? null);

  return <JourneyExperience journeyId={journeyDef.id} journeyName={journeyDef.name} detail={detail} />;
}
