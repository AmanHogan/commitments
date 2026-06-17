import { redirect } from "next/navigation";

/**
 * Root route — redirect into the dashboard (proxy enforces auth).
 * @returns Never; always redirects.
 */
export default function Home(): never {
  redirect("/dashboard");
}
