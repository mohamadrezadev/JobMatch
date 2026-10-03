'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <nav className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8">
      <Link href="/" className="text-lg font-bold text-brand-600">
        Pathly
      </Link>

      {isAuthenticated && (
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-gray-700 hover:text-gray-900">Dashboard</Link>
          <Link href="/jobs" className="text-sm font-medium text-gray-700 hover:text-gray-900">Jobs</Link>
          <Link href="/resume" className="text-sm font-medium text-gray-700 hover:text-gray-900">Resume</Link>
          <span className="hidden text-sm text-gray-500 md:inline">{user?.firstName}</span>
          <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
        </div>
      )}

      {!isAuthenticated && (
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Sign In</Button></Link>
          <Link href="/register"><Button>Get Started</Button></Link>
        </div>
      )}
    </nav>
  );
}
