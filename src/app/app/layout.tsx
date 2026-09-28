import { redirect } from "next/navigation";
import { currentUser } from "@/server/route-utils";
import { ensureDemoAccount } from "@/server/auth";
import { AppShell } from "@/components/layout";
import type { Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  await ensureDemoAccount();
  const lang: Lang = user.language === "hi" ? "hi" : "en";
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    state: user.state,
    district: user.district,
    village: user.village,
    language: user.language,
    farmSizeAcres: user.farmSizeAcres,
    soilType: user.soilType,
    preferredCrops: user.preferredCrops,
  };
  return (
    <AppShell user={safeUser} lang={lang}>
      {children}
    </AppShell>
  );
}
