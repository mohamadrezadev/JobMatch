import { PathlyShell } from '@/components/pathly/PathlyShell';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PathlyShell>{children}</PathlyShell>;
}
