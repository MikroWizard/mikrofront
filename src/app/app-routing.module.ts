import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DefaultLayoutComponent, ConnectionManagerLayoutComponent } from './containers';
import { Page404Component } from './views/pages/page404/page404.component';
import { Page500Component } from './views/pages/page500/page500.component';
import { LoginComponent } from './views/pages/login/login.component';
import { RegisterComponent } from './views/pages/register/register.component';
import { ActivateComponent } from './views/pages/activate/activate.component';
import { ForgotPasswordComponent } from './views/pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './views/pages/reset-password/reset-password.component';

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
        path: 'vault',
        loadChildren: () =>
          import('./views/vault/vault.module').then((m) => m.VaultModule)
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
        path: 'maps',
        loadChildren: () =>
          import('./views/maps/maps.module').then((m) => m.MapsModule)
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
        path: 'syslog-regex',
        loadChildren: () =>
          import('./views/syslog-regex/syslog-regex.module').then((m) => m.SyslogRegexModule)
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
        path: 'alerts',
        loadChildren: () =>
          import('./views/alerts/alerts.module').then((m) => m.AlertsModule)
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
        path: 'cloner',
        loadChildren: () =>
          import('./views/cloner/cloner.module').then((m) => m.ClonerModule)
      },
      {
        path: 'snippets',
        loadChildren: () =>
          import('./views/snippets/snippets.module').then((m) => m.SnippetsModule)
      },
      {
        path: 'sequences',
        loadChildren: () =>
          import('./views/sequences/sequences.module').then((m) => m.SequencesModule)
      },
      {
        path: 'executions',
        loadChildren: () =>
          import('./views/executions/executions.module').then((m) => m.ExecutionsModule)
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
        path: 'vpn',
        loadChildren: () =>
          import('./views/vpn/vpn.module').then((m) => m.VpnModule)
      },
      {
        path: 'customer-portal',
        loadChildren: () =>
          import('./views/customer-portal/customer-portal.module').then((m) => m.CustomerPortalModule)
      },
      {
        path: 'customer-router-tools',
        loadChildren: () =>
          import('./views/customer-router-tools/customer-router-tools.module').then((m) => m.CustomerRouterToolsModule)
      },
      {
        path: 'customer-tickets',
        loadChildren: () =>
          import('./views/customer-tickets/customer-tickets.module').then((m) => m.CustomerTicketsModule)
      },
      {
        path: 'customer-router-tools',
        loadChildren: () =>
          import('./views/customer-router-tools/customer-router-tools.module').then((m) => m.CustomerRouterToolsModule)
      },
      {
        path: 'customer-diagnostics',
        loadChildren: () =>
          import('./views/customer-diagnostics/customer-diagnostics.module').then((m) => m.CustomerDiagnosticsModule)
      },
      {
        path: 'customer-portforward',
        loadChildren: () =>
          import('./views/customer-portforward/customer-portforward.module').then((m) => m.CustomerPortForwardModule)
      },
      {
        path: 'customer-firewall',
        loadChildren: () =>
          import('./views/customer-firewall/customer-firewall.module').then((m) => m.CustomerFirewallModule)
      },
      {
        path: 'customer-speedtest',
        loadChildren: () =>
          import('./views/customer-speedtest/customer-speedtest.module').then((m) => m.CustomerSpeedTestModule)
      },
      {
        path: 'admin-tickets',
        loadChildren: () =>
          import('./views/admin-tickets/admin-tickets.module').then((m) => m.AdminTicketsModule)
      },
      {
        path: 'customer-assignments',
        loadChildren: () =>
          import('./views/customer-assignments/customer-assignments.module').then((m) => m.CustomerAssignmentsModule)
      },
      {
        path: 'ai-chat-logs',
        loadChildren: () =>
          import('./views/ai-chat-logs/ai-chat-logs.module').then((m) => m.AIChatLogsModule)
      },
      {
        path: 'pam',
        loadChildren: () =>
          import('./views/session-manager/session-manager.module').then((m) => m.SessionManagerModule)
      },
      {
        path: 'templates',
        loadChildren: () =>
          import('./views/template-manager/template-manager.module').then((m) => m.TemplateManagerModule)
      },
      {
        path: 'policies',
        loadChildren: () =>
          import('./views/policy-manager/policy-manager.module').then((m) => m.PolicyManagerModule)
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
    path: 'connection-manager',
    component: ConnectionManagerLayoutComponent,
    data: {
      title: 'Connection Manager'
    },
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./views/connection-manager/connection-manager.module').then((m) => m.ConnectionManagerModule)
      }
    ]
  },
  {
    path: 'terminal-share',
    loadChildren: () =>
      import('./views/terminal-share/terminal-share.module').then((m) => m.TerminalShareModule)
  },
  {
    path: 'webfig-share',
    loadChildren: () =>
      import('./views/webfig-share/webfig-share.module').then((m) => m.WebfigShareModule)
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
  {
    path: 'register',
    component: RegisterComponent,
    data: {
      title: 'Register Page'
    }
  },
  {
    path: 'activate',
    component: ActivateComponent,
    data: {
      title: 'Activate Account'
    }
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    data: {
      title: 'Forgot Password'
    }
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    data: {
      title: 'Reset Password'
    }
  },
  { path: '**', redirectTo: 'dashboard' }
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
