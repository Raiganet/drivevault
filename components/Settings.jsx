'use client';
import { APP_VERSION } from '@/utils/constants';

export default function Settings({ isDark, onThemeToggle, currentUser }) {
  const settingsSections = [
    {
      id: 'appearance',
      icon: 'fa-palette',
      title: 'Appearance',
      items: [
        {
          label: 'Dark Mode',
          description: 'Toggle between light and dark theme',
          action: (
            <button 
              onClick={onThemeToggle}
              className="btn-secondary text-sm px-3 py-1.5"
            >
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} mr-1.5`}></i>
              {isDark ? 'Light' : 'Dark'}
            </button>
          ),
        },
      ],
    },
    {
      id: 'account',
      icon: 'fa-user',
      title: 'Account',
      items: [
        {
          label: 'Username',
          description: 'Your account username',
          value: currentUser?.name || 'User',
        },
        {
          label: 'Role',
          description: 'Your account role',
          value: (
            <span className="badge badge-primary text-xs">
              {currentUser?.role?.toUpperCase() || 'GUEST'}
            </span>
          ),
        },
      ],
    },
    {
      id: 'security',
      icon: 'fa-shield-halved',
      title: 'Security',
      items: [
        {
          label: 'Auto-logout Timer',
          description: 'Auto logout after 10 min',
          value: (
            <span className="badge badge-success text-xs">
              <i className="fa-solid fa-check mr-1"></i>
              Enabled
            </span>
          ),
        },
        {
          label: 'Two-Factor Auth',
          description: 'Extra security layer',
          value: (
            <span className="badge badge-warning text-xs">
              <i className="fa-solid fa-clock mr-1"></i>
              Coming Soon
            </span>
          ),
        },
      ],
    },
    {
      id: 'storage',
      icon: 'fa-database',
      title: 'Storage',
      items: [
        {
          label: 'Cloud Storage',
          description: 'Google Drive integration',
          value: (
            <span className="badge badge-success text-xs">
              <i className="fa-solid fa-check mr-1"></i>
              Connected
            </span>
          ),
        },
        {
          label: 'Storage Limit',
          description: 'Maximum capacity',
          value: '15 GB',
        },
      ],
    },
    {
      id: 'pwa',
      icon: 'fa-mobile-screen',
      title: 'Progressive Web App',
      items: [
        {
          label: 'Install App',
          description: 'Install on your device',
          action: (
            <button className="btn-primary text-sm px-3 py-1.5">
              <i className="fa-solid fa-download mr-1.5"></i>
              Install
            </button>
          ),
        },
        {
          label: 'Offline Mode',
          description: 'Access without internet',
          value: (
            <span className="badge badge-success text-xs">
              <i className="fa-solid fa-check mr-1"></i>
              Enabled
            </span>
          ),
        },
      ],
    },
    {
      id: 'about',
      icon: 'fa-circle-info',
      title: 'About',
      items: [
        {
          label: 'Version',
          description: 'Current version',
          value: `v${APP_VERSION}`,
        },
        {
          label: 'Developer',
          description: 'Built by',
          value: '@Raiganet',
        },
      ],
    },
  ];

  return (
    <div className="fade-in max-w-3xl mx-auto animate-slide-up">
      <div className="card-elevated p-4 lg:p-6">
        {/* Header - Compact */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 lg:w-12 lg:h-12 gradient-purple rounded-xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-gear text-white text-lg lg:text-2xl"></i>
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold">Settings</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage your preferences and configuration
              </p>
            </div>
          </div>
        </div>

        {/* Settings Sections - Compact */}
        <div className="space-y-4">
          {settingsSections.map(section => (
            <div key={section.id} className="card p-4">
              <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                <i className={`fa-solid ${section.icon} text-primary text-sm`}></i>
                {section.title}
              </h3>
              <div className="space-y-3">
                {section.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {item.action ? item.action : (
                        <span className="text-sm font-semibold text-primary">
                          {item.value}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
