import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-webfig-share',
  templateUrl: './webfig-share.component.html',
  styleUrls: ['./webfig-share.component.scss']
})
export class WebfigShareComponent implements OnInit, OnDestroy {
  public loading = true;
  public pendingApproval = false;
  public error = '';
  public token: string = '';
  public password: string = '';
  public role: string = 'observer';
  public sessionId: string = '';
  public iframeUrl: SafeResourceUrl | null = null;
  public passwordInput: string = '';
  public passwordPromptVisible = false;
  private pollInterval: any = null;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private data_provider: dataProvider
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.password = this.route.snapshot.queryParamMap.get('password') || '';
    if (!this.token) {
      this.loading = false;
      this.error = 'No session token provided';
      return;
    }
    this.joinSession();
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  public joinSession() {
    this.loading = true;
    this.error = '';
    this.pendingApproval = false;
    this.passwordPromptVisible = false;

    this.data_provider.joinWebfigSession(this.token, this.password).then((res: any) => {
      if (res.status === 'success') {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.loading = false;
        this.role = res.role || 'observer';
        this.sessionId = res.session_id;

        const targetUrl = this.role === 'observer'
          ? this.data_provider.getWebfigLiveStreamUrl(this.sessionId)
          : `/api/proxy/${this.sessionId}/webfig/`;
        this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(targetUrl);
      } else if (res.status === 'password_required' || (res.status === 'failed' && res.error === 'Incorrect Password')) {
        this.loading = false;
        this.passwordPromptVisible = true;
        if (res.error === 'Incorrect Password') {
          this.error = 'Incorrect Password. Please try again.';
        }
      } else if (res.status === 'pending_approval') {
        this.loading = false;
        this.pendingApproval = true;
        if (!this.pollInterval) {
          this.pollInterval = setInterval(() => this.joinSession(), 3000);
        }
      } else {
        this.loading = false;
        this.error = res.error || 'Failed to join WebFig session';
      }
    }).catch((err: any) => {
      this.loading = false;
      this.error = 'Connection failed';
    });
  }

  public submitPassword() {
    this.password = this.passwordInput;
    this.joinSession();
  }
}
