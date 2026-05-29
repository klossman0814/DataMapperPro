import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  SplitSquareHorizontal,
  FileCode,
  Database,
  Table2,
  PlayCircle,
  Bookmark,
  Settings,
  BookOpen,
  ClipboardCheck,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Terminal,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { ThemeToggle } from './ThemeToggle';
import clsx from 'clsx';

const navGroups = [
  {
    label: 'Data Sources',
    icon: Database,
    items: [
      { to: '/upload', icon: Upload, label: 'Upload' },
      { to: '/database-connections', icon: Database, label: 'Database Connections' },
      { to: '/text-to-table', icon: Table2, label: 'Text to Table' },
      { to: '/sql-scripts', icon: Terminal, label: 'Execute SQL Script Sets' },
    ],
  },
  {
    label: 'Transformation',
    icon: SplitSquareHorizontal,
    items: [
      { to: '/mapping', icon: SplitSquareHorizontal, label: 'Mapping Designer' },
      { to: '/template', icon: FileCode, label: 'Template Editor' },
    ],
  },
  {
    label: 'Processing',
    icon: PlayCircle,
    items: [
      { to: '/jobs', icon: PlayCircle, label: 'Processing Jobs' },
      { to: '/spec-evaluator', icon: ClipboardCheck, label: 'Spec Evaluator' },
      { to: '/spec-builder', icon: FileSpreadsheet, label: 'Spec Builder' },
    ],
  },
  {
    label: 'Management',
    icon: Settings,
    items: [
      { to: '/profiles', icon: Bookmark, label: 'Saved Profiles' },
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/guide', icon: BookOpen, label: 'User Guide' },
    ],
  },
];

export function Layout() {
  const { sidebarOpen, toggleSidebar, user, logout } = useAppStore();
  const navigate = useNavigate();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebarCollapsedGroups') || '{}');
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsedGroups', JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 dark:border-slate-700 dark:bg-slate-800/80 dark:backdrop-blur-xl lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <SplitSquareHorizontal className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">DataMapper Pro</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <NavLink
            key="/"
            to="/"
            end
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98]',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-600/10 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
              )
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </NavLink>

          {navGroups.map(group => {
            const isCollapsed = collapsedGroups[group.label];
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <group.icon className="h-4 w-4" />
                  {group.label}
                  {isCollapsed ? <ChevronRight className="ml-auto h-3.5 w-3.5" /> : <ChevronDown className="ml-auto h-3.5 w-3.5" />}
                </button>
                {!isCollapsed && (
                  <div className="ml-2 space-y-0.5">
                    {group.items.map(({ to, icon: Icon, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98]',
                            isActive
                              ? 'bg-primary-50 text-primary-700 dark:bg-primary-600/10 dark:text-primary-400'
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                          )
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98]',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-600/10 dark:text-primary-400'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                )
              }
            >
              <Shield className="h-5 w-5" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="border-t border-gray-200 p-4 dark:border-slate-700">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-700/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-200">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-gray-500 dark:text-slate-400">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white/50 px-6 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/50">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center justify-end gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
