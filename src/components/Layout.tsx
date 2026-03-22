import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Users, Send, FileText, Globe } from 'lucide-react';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const navItems = [
    { path: '/', label: t('nav_sessions'), icon: MessageSquare },
    { path: '/targets', label: t('nav_targets'), icon: Users },
    { path: '/compose', label: t('nav_compose'), icon: Send },
    { path: '/logs', label: t('nav_logs'), icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">{t('app_title')}</h1>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 mt-auto border-t border-gray-200">
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-2 space-x-reverse w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Globe className="w-5 h-5" />
            <span>{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
