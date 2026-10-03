'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';

export default function SettingsPage() {
  const { logout } = useAuthStore();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <Card>
        <h2 className="mb-4 font-semibold text-gray-900">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Email notifications</span>
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">New job alerts</span>
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" defaultChecked />
          </div>
          <hr className="my-2" />
          <div className="pt-2">
            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
