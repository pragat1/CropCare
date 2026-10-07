import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/diseases")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
