export type PermLevelType = 'binary' | 'standard' | 'tristate_full';

export interface PermOptionDef {
  value: string;
  label: string;
  activeClass: string;
  title?: string;
}

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
  pro?: boolean;
  hidden?: boolean;
  type?: PermLevelType;
  options?: PermOptionDef[];
}

export interface PermissionCategory {
  key: string;
  label: string;
  icon: string;
  badgeColor?: string;
  perms: PermissionDef[];
}

export interface PermissionTemplate {
  name: string;
  description: string;
  isCustom?: boolean;
  perms: { [key: string]: string };
}

export const BINARY_PERM_OPTIONS: PermOptionDef[] = [
  { value: 'none', label: 'Denied', activeClass: 'active-none', title: 'No Access' },
  { value: 'read', label: 'Granted', activeClass: 'active-read', title: 'Access Granted' },
];

export const TRISTATE_FULL_OPTIONS: PermOptionDef[] = [
  { value: 'none', label: 'None', activeClass: 'active-none', title: 'No Access' },
  { value: 'read', label: 'Read', activeClass: 'active-read', title: 'Read Only' },
  { value: 'full', label: 'Full', activeClass: 'active-full', title: 'Full Control' },
];

export const STANDARD_PERM_OPTIONS: PermOptionDef[] = [
  { value: 'none', label: 'None', activeClass: 'active-none', title: 'No Access' },
  { value: 'read', label: 'Read', activeClass: 'active-read', title: 'Read Only' },
  { value: 'write', label: 'Write', activeClass: 'active-write', title: 'Read & Write' },
  { value: 'full', label: 'Full', activeClass: 'active-full', title: 'Full Control' },
];

export function getPermOptions(perm: PermissionDef): PermOptionDef[] {
  if (perm.options && perm.options.length > 0) {
    return perm.options;
  }
  if (perm.type === 'binary') {
    return BINARY_PERM_OPTIONS;
  }
  if (perm.type === 'tristate_full') {
    return TRISTATE_FULL_OPTIONS;
  }
  return STANDARD_PERM_OPTIONS;
}

export const PERM_CATEGORIES: PermissionCategory[] = [
  {
    key: 'devices',
    label: 'Devices & Network',
    icon: 'fa-solid fa-server',
    badgeColor: 'primary',
    perms: [
      { key: 'device', label: 'Devices', description: 'View, edit and manage network devices (scan, firmware, remote tools, monitoring, maps).' },
      { key: 'device_group', label: 'Device Groups', description: 'Create and manage device groups and their members.' },
    ],
  },
  {
    key: 'automation',
    label: 'Automation & Backup',
    icon: 'fa-solid fa-robot',
    badgeColor: 'info',
    perms: [
      { key: 'task', label: 'Task Planner', description: 'Create, schedule and run automated tasks and executions.' },
      { key: 'snippet', label: 'Snippets', description: 'Create and run command snippets.' },
      { key: 'sequence', label: 'Sequences', description: 'Build and run ordered multi-command sequences.', pro: true },
      { key: 'backup', label: 'Backups', description: 'Manage device backups and configuration versions.' },
      { key: 'cloner', label: 'Sync & Cloner', description: 'Clone and sync configurations across devices.', pro: true },
      { key: 'vault', label: 'Password Vault', description: 'Access and reveal stored device passwords.', pro: true },
      { key: 'system_backup', label: 'System Backup', description: 'Full system backup & restore (scheduled). Reserved for a future feature.', hidden: true },
    ],
  },
  {
    key: 'reports',
    label: 'Reports & Logs',
    icon: 'fa-solid fa-chart-line',
    badgeColor: 'success',
    perms: [
      { key: 'authentication', label: 'Authentication Logs', description: 'View device authentication logs.', type: 'binary' },
      { key: 'accounting', label: 'Accounting Logs', description: 'View device accounting logs.', type: 'binary' },
      { key: 'device_log', label: 'Device Logs', description: 'View device event logs.', type: 'binary' },
      { key: 'system_log', label: 'System Logs', description: 'View system and syslog events.', type: 'binary' },
    ],
  },
  {
    key: 'users',
    label: 'Users & Roles',
    icon: 'fa-solid fa-user-gear',
    badgeColor: 'warning',
    perms: [
      { key: 'users', label: 'User Management', description: 'Create, edit and disable users.' },
      { key: 'permissions', label: 'Permission Profiles', description: 'Manage MikroTik (RouterOS) permission profiles.' },
    ],
  },
  {
    key: 'customer',
    label: 'Customer Portal',
    icon: 'fa-solid fa-user-tag',
    badgeColor: 'secondary',
    perms: [
      { key: 'customer', label: 'Customer Portals', description: 'Manage customer portal assignments and customer users.', pro: true },
      { key: 'customer_ticket', label: 'Customer Tickets', description: 'Manage customer support tickets.', pro: true },
      { key: 'customer_chat', label: 'Customer Chat', description: 'Manage customer chat sessions.', pro: true },
    ],
  },
  {
    key: 'pam',
    label: 'Privileged Access (PAM)',
    icon: 'fa-solid fa-shield-halved',
    badgeColor: 'danger',
    perms: [
      { key: 'pam_session', label: 'Privileged Sessions', description: 'View and manage active and historical privileged/terminal sessions.', pro: true },
      { key: 'pam_config', label: 'PAM Configuration', description: 'Manage brands, templates, credentials and device connections.', pro: true, type: 'tristate_full' },
      { key: 'policy', label: 'Terminal Policies', description: 'Create, edit and assign terminal policies.', pro: true },
    ],
  },
  {
    key: 'system',
    label: 'System & Config',
    icon: 'fa-solid fa-gear',
    badgeColor: 'dark',
    perms: [
      { key: 'settings', label: 'System Settings', description: 'Manage system settings, SSL and sysconfig.' },
      { key: 'alerts', label: 'Alerts & Notifications', description: 'Configure and manage alerts and notification channels.', pro: true },
      { key: 'wireguard', label: 'WireGuard Server', description: 'Manage the WireGuard VPN server.', pro: true, type: 'tristate_full' },
    ],
  },
];

export function buildDefaultPerms(): { [key: string]: string } {
  const perms: { [key: string]: string } = {};
  for (const category of PERM_CATEGORIES) {
    for (const perm of category.perms) {
      perms[perm.key] = 'none';
    }
  }
  return perms;
}

export const DEFAULT_PERMS: { [key: string]: string } = buildDefaultPerms();

export const BUILTIN_PERM_TEMPLATES: PermissionTemplate[] = [
  {
    name: 'Super Admin',
    description: 'Full administrative access to every feature, configuration, and secret.',
    isCustom: false,
    perms: {
      device: 'full', device_group: 'full',
      task: 'full', snippet: 'full', sequence: 'full', backup: 'full', cloner: 'full', vault: 'full', system_backup: 'full',
      authentication: 'read', accounting: 'read', device_log: 'read', system_log: 'read',
      users: 'full', permissions: 'full',
      customer: 'full', customer_ticket: 'full', customer_chat: 'full',
      pam_session: 'full', pam_config: 'full', policy: 'full',
      settings: 'full', alerts: 'full', wireguard: 'full',
    },
  },
  {
    name: 'Network Engineer',
    description: 'Full control over devices, automation and PAM; read-only on users and reports.',
    isCustom: false,
    perms: {
      device: 'full', device_group: 'full',
      task: 'full', snippet: 'full', sequence: 'full', backup: 'full', cloner: 'full', vault: 'full', system_backup: 'full',
      authentication: 'read', accounting: 'read', device_log: 'read', system_log: 'read',
      users: 'read', permissions: 'read',
      customer: 'read', customer_ticket: 'read', customer_chat: 'read',
      pam_session: 'full', pam_config: 'full', policy: 'full',
      settings: 'full', alerts: 'full', wireguard: 'full',
    },
  },
  {
    name: 'NOC Operator',
    description: 'Monitor devices, manage tasks & alerts; no direct device config changes.',
    isCustom: false,
    perms: {
      device: 'read', device_group: 'read',
      task: 'full', snippet: 'read', sequence: 'read', backup: 'read', cloner: 'none', vault: 'none', system_backup: 'none',
      authentication: 'read', accounting: 'read', device_log: 'read', system_log: 'read',
      users: 'none', permissions: 'none',
      customer: 'read', customer_ticket: 'full', customer_chat: 'full',
      pam_session: 'read', pam_config: 'none', policy: 'none',
      settings: 'read', alerts: 'full', wireguard: 'read',
    },
  },
  {
    name: 'Help Desk',
    description: 'Full customer support (tickets/chat) and read-only device & log visibility.',
    isCustom: false,
    perms: {
      device: 'read', device_group: 'read',
      task: 'read', snippet: 'read', sequence: 'read', backup: 'read', cloner: 'none', vault: 'none', system_backup: 'none',
      authentication: 'read', accounting: 'read', device_log: 'read', system_log: 'read',
      users: 'none', permissions: 'none',
      customer: 'full', customer_ticket: 'full', customer_chat: 'full',
      pam_session: 'read', pam_config: 'none', policy: 'none',
      settings: 'read', alerts: 'read', wireguard: 'none',
    },
  },
  {
    name: 'Read-only Auditor',
    description: 'View-only access across the entire system; no changes and no secrets.',
    isCustom: false,
    perms: {
      device: 'read', device_group: 'read',
      task: 'read', snippet: 'read', sequence: 'read', backup: 'read', cloner: 'none', vault: 'none', system_backup: 'none',
      authentication: 'read', accounting: 'read', device_log: 'read', system_log: 'read',
      users: 'read', permissions: 'none',
      customer: 'read', customer_ticket: 'read', customer_chat: 'none',
      pam_session: 'read', pam_config: 'read', policy: 'read',
      settings: 'read', alerts: 'read', wireguard: 'read',
    },
  },
];

export const PERM_TEMPLATES: PermissionTemplate[] = [...BUILTIN_PERM_TEMPLATES];

const CUSTOM_TEMPLATES_STORAGE_KEY = 'mikro_custom_perm_templates';

export function getCustomTemplates(): PermissionTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((t: any) => ({ ...t, isCustom: true }));
    }
  } catch (e) {
    console.error('Failed to parse custom templates from storage', e);
  }
  return [];
}

export function saveCustomTemplate(template: PermissionTemplate): PermissionTemplate[] {
  const existing = getCustomTemplates().filter((t) => t.name.toLowerCase() !== template.name.toLowerCase());
  const updated = [...existing, { ...template, isCustom: true }];
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save custom template to storage', e);
  }
  return updated;
}

export function removeCustomTemplate(name: string): PermissionTemplate[] {
  const existing = getCustomTemplates().filter((t) => t.name.toLowerCase() !== name.toLowerCase());
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to remove custom template from storage', e);
  }
  return existing;
}

export function loadAllTemplates(): PermissionTemplate[] {
  return [...BUILTIN_PERM_TEMPLATES, ...getCustomTemplates()];
}
