import ProfileCard from "@/components/ProfileCard";

export default async function DashboardPage()
{
  const profileCard = await ProfileCard();

  return (
    <div>
      {profileCard}
    </div>
  );
}
