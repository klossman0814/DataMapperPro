export interface MenuItemDef {
  key: string;
  label: string;
  path: string;
}

export const MENU_ITEMS: MenuItemDef[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/' },
  { key: 'upload', label: 'Upload', path: '/upload' },
  { key: 'database-connections', label: 'Database Connections', path: '/database-connections' },
  { key: 'database-migration', label: 'DB Migration', path: '/database-migration' },
  { key: 'text-to-table', label: 'Text to Table', path: '/text-to-table' },
  { key: 'sql-scripts', label: 'Execute SQL Script Sets', path: '/sql-scripts' },
  { key: 'profiles', label: 'Saved Profiles', path: '/profiles' },
  { key: 'mapping', label: 'Mapping Designer', path: '/mapping' },
  { key: 'template', label: 'Template Editor', path: '/template' },
  { key: 'template-generator', label: 'Template Generator', path: '/template-generator' },
  { key: 'jobs', label: 'Processing Jobs', path: '/jobs' },
  { key: 'spec-evaluator', label: 'Spec Evaluator', path: '/spec-evaluator' },
  { key: 'spec-builder', label: 'Spec Builder', path: '/spec-builder' },
  { key: 'settings', label: 'Settings', path: '/settings' },
  { key: 'guide', label: 'User Guide', path: '/guide' },
];

export function pathToKey(path: string): string {
  return path.replace(/^\//, '') || 'dashboard';
}
