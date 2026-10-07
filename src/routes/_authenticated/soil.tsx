import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/soil")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
