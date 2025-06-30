import { NgModule, APP_INITIALIZER } from '@angular/core';
import { HashLocationStrategy, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MsalModule, MsalService, MSAL_INSTANCE, MsalGuard, MsalInterceptor, MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { IPublicClientApplication, PublicClientApplication, InteractionType } from '@azure/msal-browser';
import { msalConfig } from './auth/msal-config';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { NgScrollbarModule } from 'ngx-scrollbar';
import { HttpClientModule } from '@angular/common/http';

// Import routing module
import { AppRoutingModule } from './app-routing.module';
import { provideDateFnsAdapter } from 'ngx-material-date-fns-adapter';

// Import app component
import { AppComponent } from './app.component';

// Import containers
import { DefaultFooterComponent, DefaultHeaderComponent, DefaultLayoutComponent } from './containers';
import { MikroWizardProvider } from './providers/mikrowizard/provider';
import { dataProvider } from './providers/mikrowizard/data';
import { loginChecker } from './providers/login_checker';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import {
  AvatarModule,
  BadgeModule,
  BreadcrumbModule,
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  DropdownModule,
  FooterModule,
  FormModule,
  GridModule,
  HeaderModule,
  ListGroupModule,
  NavModule,
  ProgressModule,
  SharedModule,
  SidebarModule,
  TabsModule,
  UtilitiesModule,
  TableModule,
  ModalModule
} from '@coreui/angular';

import { IconModule, IconSetService } from '@coreui/icons-angular';

const APP_CONTAINERS = [
  DefaultFooterComponent,
  DefaultHeaderComponent,
  DefaultLayoutComponent
];
export function loginStatusProviderFactory(provider: loginChecker) {
  return () => provider.load();
}

export function MSALInstanceFactory(): IPublicClientApplication {
  const msalInstance = new PublicClientApplication(msalConfig);
  msalInstance.initialize().catch(error => {
    console.error('MSAL initialization failed:', error);
  });
  return msalInstance;
}

const guardConfig: MsalGuardConfiguration = {
  interactionType: InteractionType.Popup,
  authRequest: {
    scopes: ['User.Read', 'profile', 'email', 'openid']
  }
};

const interceptorConfig: MsalInterceptorConfiguration = {
  interactionType: InteractionType.Popup,
  protectedResourceMap: new Map([
    ['https://graph.microsoft.com/v1.0/me', ['User.Read']]
  ])
};

@NgModule({
  declarations: [AppComponent, ...APP_CONTAINERS],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    MsalModule.forRoot(MSALInstanceFactory(), guardConfig, interceptorConfig),
    AvatarModule,
    BreadcrumbModule,
    FooterModule,
    DropdownModule,
    GridModule,
    HeaderModule,
    SidebarModule,
    IconModule,
    NavModule,
    HttpClientModule,
    ButtonModule,
    FormModule,
    UtilitiesModule,
    ButtonGroupModule,
    ReactiveFormsModule,
    FormsModule,
    SidebarModule,
    SharedModule,
    TabsModule,
    ListGroupModule,
    ProgressModule,
    BadgeModule,
    ListGroupModule,
    CardModule,
    NgScrollbarModule,
    ModalModule,
    FontAwesomeModule,
    TableModule
  ],
  providers: [
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy
    },
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    MsalService,
    MsalGuard,
    MikroWizardProvider,
    dataProvider,
    loginChecker,
    IconSetService,
    provideDateFnsAdapter(),
    {
      provide: APP_INITIALIZER,
      useFactory: loginStatusProviderFactory,
      deps: [loginChecker],
      multi: true,
    },
    Title
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
