import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { NovaChat } from "@/components/site/NovaChat";
import { PropertyCornerPopup } from "@/components/site/PropertyCornerPopup";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

function SiteLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      {pathname !== "/" && <PropertyCornerPopup placement="site" />}
      <NovaChat />
    </div>
  );
}