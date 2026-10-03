'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const links = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/jobs', label: 'Jobs', icon: '💼' },
  { href: '/resume', label: 'Resume', icon: '📄' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-52 shrink-0 border-r border-gray-200 bg-white p-4 md:block">
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={clsx(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
