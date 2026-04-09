import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseInterceptor implements HttpInterceptor {

  // Pro-licensed API endpoints that should be monitored
  private readonly proEndpoints = [
    'monitoring/devs/get',
    'monitoring/events/get',
    'monitoring/eventunfixed/get',
    '/api/vpn/status',
    'networkmap/get',
    'snippet/sequence/list',
    'cloner/list',
    '/api/pssvault/get',
    'snippet/syslogregex/list'
  ];

  constructor(private licenseService: LicenseService) {}

  private isProEndpoint(url: string): boolean {
    return this.proEndpoints.some(endpoint => url.includes(endpoint));
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse && this.isProEndpoint(request.url)) {
          const body = event.body;
          if (
            body &&
            body.result &&
            typeof body.result === 'object' &&
            body.result.err === 'License Expired' &&
            body.result.status === 'failed'
          ) {
            this.licenseService.setExpired(true);
          } else {
            // Pro endpoint responded without license error — license is valid
            this.licenseService.setExpired(false);
          }
        }
      })
    );
  }
}
