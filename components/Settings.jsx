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
              className="btn-secondary"
            >
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} mr-2`}></i>
              {isDark ? 'Light Mode' : 'Dark Mode'}
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
          value: currentUser?.role?.toUpperCase() || 'GUEST',
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
          description: 'Automatically logout after 10 minutes of inactivity',
          value: (
            <span className="badge badge-success">
              <i className="fa-solid fa-check mr-1"></i>
              Enabled
            </span>
          ),
        },
        {
          label: 'Two-Factor Authentication',
          description: 'Add an extra layer of security',
          value: (
            <span className="badge badge-warning">
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
            <span className="badge badge-success">
              <i className="fa-solid fa-check mr-1"></i>
              Connected
            </span>
          ),
        },
        {
          label: 'Storage Limit',
          description: 'Maximum storage capacity',
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
          description: 'Install DriveVault on your device',
          action: (
            <button className="btn-primary">
              <i className="fa-solid fa-download mr-2"></i>
              Install
            </button>
          ),
        },
        {
          label: 'Offline Mode',
          description: 'Access documents without internet',
          value: (
            <span className="badge badge-success">
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
          description: 'Current application version',
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
    <div className="fade-in max-w-4xl mx-auto animate-slide-up">
      <div className="card-elevated p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 gradient-purple rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-gear text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your preferences and configuration
              </p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map(section => (
            <div key={section.id} className="card p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <i className={`fa-solid ${section.icon} text-primary`}></i>
                {section.title}
              </h3>
              <div className="space-y-4">
                {section.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
