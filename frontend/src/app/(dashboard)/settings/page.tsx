'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';

export default function SettingsPage() {
  const { logout } = useAuthStore();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">تنظیمات</h1>
      <Card>
        <h2 className="mb-4 font-semibold text-slate-800 dark:text-white">حساب کاربری</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">اعلان‌های ایمیل</span>
            <input type="checkbox" className="h-4 w-4 rounded border-slate-200 dark:border-dark-border" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">اعلان فرصت‌های جدید</span>
            <input type="checkbox" className="h-4 w-4 rounded border-slate-200 dark:border-dark-border" defaultChecked />
          </div>
          <hr className="my-2" />
          <div className="pt-2">
            <Button variant="ghost" className="text-rose-500 hover:text-red-700 hover:bg-red-50" onClick={logout}>
              خروج از حساب
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
