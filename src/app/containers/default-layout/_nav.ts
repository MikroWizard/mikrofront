import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cil-speedometer' },

  },
  {
    name: 'Monitoring Wall',
    url: '/monitoring',
    icon: 'fa-solid fa-tv',
    attributes: { 'pro': true }
  },
  {
    title: true,
    name: 'Device Managment'
  },
  {
    name: 'WireGuard Server',
    url: '/vpn',
    icon: 'fa-solid fa-network-wired',
    attributes: { 'pro': true }
  },
  {
    name: 'Devices',
    url: '/devices',
    icon: 'fa-solid fa-server'
  },
  {
    name: 'Device Groups',
    url: '/deviceGroup',
    // linkProps: { fragment: 'someAnchor' },
    icon: 'fa-solid fa-layer-group'
  },
  {
    name: 'Network Maps',
    url: '/maps',
    icon: 'fa-solid fa-map',
    attributes: { 'pro': true }
  },
  // {
  //   name: 'Tools',
  //   url: '/login',
  //   icon: 'fa-solid fa-screwdriver-wrench',
  //   children: [
  //     {
  //       name: 'BW test',
  //       url: '/login',
  //       icon: 'fa-solid fa-file-circle-check'
  //     },
  //     {
  //       name: 'Ping test',
  //       url: '/register',
  //       icon: 'fa-solid fa-arrow-right-arrow-left'
  //     },
  //   ]
  // },
  {
    name: 'Backup & Config',
    title: true
  },
  {
    name: 'Task Planer',
    url: '/user_tasks',
    icon: 'fa-solid fa-calendar-week'
  },
  {
    name: 'Backups',
    url: '/backups',
    icon: 'fa-solid fa-database'
  },
  {
    name: 'Executions',
    url: '/executions',
    icon: 'fa-solid fa-list-check'
  },
  {
    name: 'Snippets',
    url: '/snippets',
    icon: 'fa-solid fa-code'
  },
  {
    name: 'Sequences',
    url: '/sequences',
    icon: 'fa-solid fa-code-branch',
    attributes: { 'pro': true }
  },
  {
    name: 'Sync and Cloner',
    url: '/cloner',
    icon: 'fa-solid fa-rotate',
    attributes: { 'pro': true }

  },
  {
    name: 'Password Vault',
    url: '/vault',
    icon: 'fa-solid fa-vault',
    attributes: { 'pro': true }
  },
  // {
  //   name: 'Tools',
  //   url: '/login',
  //   icon: 'fa-solid fa-screwdriver-wrench',
  //   children: [
  //     {
  //       name: 'Backup comparator',
  //       url: '/login',
  //       icon: 'fa-solid fa-code-compare'
  //     },
  //     {
  //       name: 'Backup search',
  //       url: '/register',
  //       icon: 'fa-solid fa-magnifying-glass-arrow-right'
  //     },
  //     {
  //       name: 'batch execute',
  //       url: '/register',
  //       icon: 'fa-solid fa-terminal'
  //     },
  //   ]
  // },
  {
    name: 'Reports',
    title: true
  },
  {
    name: 'Authentication',
    url: '/authlog',
    icon: 'fa-solid fa-check-to-slot',

  },
  {
    name: 'Accounting',
    url: '/accountlog',
    icon: 'fa-solid fa-list-check',

  },
  {
    name: 'Device Logs',
    url: '/devlogs',
    icon: 'fa-regular fa-rectangle-list',

  },
  {
    name: 'System Logs',
    url: '/syslog',
    icon: 'fa-solid fa-person-circle-question',

  },
  {
    name: 'Syslog Custom Regex',
    url: '/syslog-regex',
    icon: 'fa-solid fa-code-commit',
    attributes: { 'pro': true }
  },
  {
    title: true,
    name: 'Users'
  },
  {
    name: 'Users Management',
    url: '/user_manager',
    icon: 'fa-solid fa-user-gear',
  },
  {
    name: 'Permissions',
    url: '/permissions',
    icon: 'fa-solid fa-users',
  },
  {
    name: 'Customer Tickets',
    url: '/admin-tickets',
    icon: 'fa-solid fa-ticket',
    attributes: { 'pro': true }
  },
  {
    name: 'Customer Portals',
    url: '/customer-assignments',
    icon: 'fa-solid fa-user-tag',
    attributes: { 'pro': true }
  },
  {
    name: 'Privileged sessions (PAM)',
    title: true,
    attributes: { 'pro': true }
  },
  {
    name: 'Active sessions',
    url: '/pam/active',
    icon: 'fa-solid fa-terminal',
    attributes: { 'pro': true }
  },
  {
    name: 'Session history',
    url: '/pam/history',
    icon: 'fa-solid fa-clock-rotate-left',
    attributes: { 'pro': true }
  },
  {
    name: 'Command history',
    url: '/pam/commands',
    icon: 'fa-solid fa-keyboard',
    attributes: { 'pro': true }
  },
  {
    name: 'Brands / Templates',
    url: '/templates',
    icon: 'fa-solid fa-puzzle-piece',
  },
  {
    name: 'Terminal Policies',
    url: '/policies',
    icon: 'fa-solid fa-shield-halved',
    attributes: { 'pro': true }
  },
  {
    name: 'AI Chat Audit Logs',
    url: '/ai-chat-logs',
    icon: 'fa-solid fa-comments',
    attributes: { 'pro': true }
  },
  {
    title: true,
    name: 'System',
    class: 'py-0'
  },
  {
    name: 'Alerts & Notifications',
    url: '/alerts',
    icon: 'fa-solid fa-bell',
    attributes: { 'pro': true }
  },
  {
    name: 'Settings',
    url: '/settings',
    icon: 'fa-solid fa-gear',
  },
  // {
  //   name: 'Backup',
  //   url: '/login',
  //   icon: 'cil-star' ,
  // },
  {
    title: true,
    name: 'Links',
    class: 'py-0'
  },
  {
    name: 'Docs',
    url: 'https://mikrowizard.com/docs',
    iconComponent: { name: 'cil-description' },
    attributes: { target: '_blank', class: '-text-dark' },
    class: 'mt-auto'
  },
  {
    name: 'Buy Pro',
    url: 'https://mikrowizard.com/pricing/',
    icon: 'fa-solid fa-money-check-dollar',
    attributes: { 'free': true, target: '_blank' }
  }
];

export const customerNavItems: INavData[] = [
  {
    name: 'Customer Portal',
    url: '/customer-portal',
    iconComponent: { name: 'cil-speedometer' },
  },
  {
    name: 'Tools & Clients',
    url: '/customer-router-tools',
    icon: 'fa-solid fa-screwdriver-wrench'
  },
  {
    name: 'Advanced Diagnostics',
    url: '/customer-diagnostics',
    icon: 'fa-solid fa-gauge-high'
  },
  {
    name: 'Port Forwarding',
    url: '/customer-portforward',
    icon: 'fa-solid fa-route'
  },
  {
    name: 'Simple Firewall',
    url: '/customer-firewall',
    icon: 'fa-solid fa-shield-halved'
  },
  {
    name: 'Speed Test',
    url: '/customer-speedtest',
    icon: 'fa-solid fa-gauge'
  },
  {
    name: 'Support Tickets',
    url: '/customer-tickets',
    icon: 'fa-solid fa-ticket'
  },
  {
    name: 'Docs',
    url: 'https://mikrowizard.com/docs',
    iconComponent: { name: 'cil-description' },
    attributes: { target: '_blank', class: '-text-dark' },
    class: 'mt-auto'
  }
];
