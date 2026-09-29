import OperationalApp from "@/components/operational-app";

// Lives above the catch-all segment, so it stays mounted while the URL changes.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <><OperationalApp />{children}</>;
}
