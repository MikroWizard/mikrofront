import { NgModule ,APP_INITIALIZER} from '@angular/core';
import { HashLocationStrategy, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { ReactiveFormsModule,FormsModule } from '@angular/forms';

import { NgScrollbarModule } from 'ngx-scrollbar';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LicenseService } from './providers/license.service';
import { LicenseInterceptor } from './providers/license-interceptor.service';

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
@NgModule({ declarations: [AppComponent, ...APP_CONTAINERS],
    bootstrap: [AppComponent], imports: [BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        AvatarModule,
        BreadcrumbModule,
        FooterModule,
        DropdownModule,
        GridModule,
        HeaderModule,
        SidebarModule,
        IconModule,
        NavModule,
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
        TableModule], providers: [
        {
            provide: LocationStrategy,
            useClass: HashLocationStrategy
        },
        MikroWizardProvider,
        dataProvider,
        loginChecker,
        IconSetService,
        provideDateFnsAdapter(),
        provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: Aura,
                options: {
                    darkModeSelector: 'none'
                }
            }
        }),
        {
            provide: APP_INITIALIZER,
            useFactory: loginStatusProviderFactory,
            deps: [loginChecker],
            multi: true,
        },
        Title,
        LicenseService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: LicenseInterceptor,
            multi: true
        },
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule {
}
