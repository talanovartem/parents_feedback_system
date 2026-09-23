import React from 'react';
import { Lock, GraduationCap } from 'lucide-react';

/** Екран для публічного входу (portal.php) на маршрутах, призначених лише для вчителя. */
export const PublicEntryNotice: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-8 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto">
        <GraduationCap className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-slate-900">Учнівський вхід</h1>
        <p className="text-xs text-slate-500">
          Ця сторінка призначена для особистого кабінету учня або форми фідбеку до уроку.
        </p>
      </div>
      <a
        href="index.php"
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
      >
        <Lock className="w-3.5 h-3.5" />
        Увійти як вчитель
      </a>
    </div>
  </div>
);
