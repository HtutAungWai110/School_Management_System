import { CampusWirePage } from "@/components/events/campus-wire-page.component";

export default async function StudentAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  return <CampusWirePage role="student" page={currentPage} />;
}
