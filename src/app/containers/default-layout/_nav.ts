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
    icon:'fa-solid fa-tv',
    attributes: { 'pro':true }
  },
  {
    title: true,
    name: 'Device Managment'
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
    name: 'snippets',
    url: '/snippets',
    icon: 'fa-solid fa-code'
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
    title: true,
    name: 'Users'
  },
  {
    name: 'Users Management',
    url: '/user_manager',
    icon: 'fa-solid fa-user-gear' ,
  },
  {
    name: 'Permissions',
    url: '/permissions',
    icon: 'fa-solid fa-users' ,
  },
  {
    title: true,
    name: 'System',
    class: 'py-0'
  },
  {
    name: 'Settings',
    url: '/settings',
    icon: 'fa-solid fa-gear' ,
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
    icon:'fa-solid fa-money-check-dollar',
    attributes: { 'free':true,target: '_blank' }
  }
];
