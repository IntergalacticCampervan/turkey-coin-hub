import { createBrowserRouter } from "react-router";
import { Layout } from "./Layout";
import { Dashboard } from "./views/Dashboard";
import { AdminPanel } from "./views/AdminPanel";
import { Onboarding } from "./views/Onboarding";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "admin", Component: AdminPanel },
      { path: "onboard", Component: Onboarding },
    ],
  },
]);
