import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DefaultLayoutComponent } from './containers';
import { Page404Component } from './views/pages/page404/page404.component';
import { Page500Component } from './views/pages/page500/page500.component';
import { LoginComponent } from './views/pages/login/login.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    component: DefaultLayoutComponent,
    data: {
      title: 'Home'
    },
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./views/dashboard/dashboard.module').then((m) => m.DashboardModule)
      },
      {
        path: 'monitoring',
        loadChildren: () =>
          import('./views/monitoring/monitoring.module').then((m) => m.MonitoringModule)
      },
      {
        path: 'devices',
        loadChildren: () =>
          import('./views/devices/devices.module').then((m) => m.DevicesModule)
      },
      {
        path: 'device-stats',
        loadChildren: () =>
          import('./views/device_detail/device.module').then((m) => m.DeviceModule)
      },
      {
        path: 'deviceGroup',
        loadChildren: () =>
          import('./views/devices_group/devgroup.module').then((m) => m.DevicesGroupModule)
      },
      {
        path: 'authlog',
        loadChildren: () =>
          import('./views/auth_log/auth.module').then((m) => m.AuthModule)
      },
      {
        path: 'devlogs',
        loadChildren: () =>
          import('./views/device_logs/devlogs.module').then((m) => m.DevLogsModule)
      },
      {
        path: 'syslog',
        loadChildren: () =>
          import('./views/syslog/syslog.module').then((m) => m.SyslogModule)
      },
      {
        path: 'backups',
        loadChildren: () =>
          import('./views/backups/backups.module').then((m) => m.BackupsModule)
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./views/settings/settings.module').then((m) => m.SettingsModule)
      },
      {
        path: 'accountlog',
        loadChildren: () =>
          import('./views/acc_log/acc.module').then((m) => m.AccModule)
      },
      {
        path: 'user_tasks',
        loadChildren: () =>
          import('./views/user_tasks/user_tasks.module').then((m) => m.UserTasksModule)
      },
      {
        path: 'snippets',
        loadChildren: () =>
          import('./views/snippets/snippets.module').then((m) => m.SnippetsModule)
      },
      {
        path: 'user_manager',
        loadChildren: () =>
          import('./views/user_manager/user_manager.module').then((m) => m.UserManagerModule)
      },
      {
        path: 'permissions',
        loadChildren: () =>
          import('./views/permissions/permissions.module').then((m) => m.PermissionsModule)
      },
      {
        path: 'pages',
        loadChildren: () =>
          import('./views/pages/pages.module').then((m) => m.PagesModule)
      },
    ]
  },
  {
    path: '404',
    component: Page404Component,
    data: {
      title: 'Page 404'
    }
  },
  {
    path: '500',
    component: Page500Component,
    data: {
      title: 'Page 500'
    }
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      title: 'Login Page'
    }
  },
  {path: '**', redirectTo: 'dashboard'}
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'top',
      anchorScrolling: 'enabled',
      initialNavigation: 'enabledBlocking'
      // relativeLinkResolution: 'legacy'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
