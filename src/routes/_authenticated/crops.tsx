import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/crops")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
