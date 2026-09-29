import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getJourneyDetail } from "@/services/journeys";
import { JourneyExperience } from "@/components/features/journeys/journey-experience";
import { journeyIdSchema, journeyOrderSchema } from "@/lib/validation";

interface JourneyDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ order?: string | string[] }>;
}

export default async function JourneyDetailPage({ params, searchParams }: JourneyDetailPageProps) {
  const [{ id }, { order }] = await Promise.all([params, searchParams]);

  // Validate untrusted route/query input before it reaches any lookup.
  const journeyId = journeyIdSchema.safeParse(id);
  if (!journeyId.success) notFound();
  const requestedOrder = journeyOrderSchema.safeParse(order);

  const session = await getSession();
  // Unsupported orders fall back to the journey's default (release) order.
  const detail = await getJourneyDetail(
    journeyId.data,
    requestedOrder.success ? requestedOrder.data : null,
    session?.userId ?? null
  );
  if (!detail) notFound();

  return <JourneyExperience journeyId={detail.id} journeyName={detail.name} detail={detail} />;
}
