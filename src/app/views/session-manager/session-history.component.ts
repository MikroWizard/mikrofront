import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { dataProvider } from '../../providers/mikrowizard/data';
import { loginChecker } from '../../providers/login_checker';
import { formatInTimeZone } from 'date-fns-tz';
import { Table } from 'primeng/table';
import { ToasterComponent } from '@coreui/angular';
import { AppToastComponent } from '../toast-simple/toast.component';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-session-history',
  templateUrl: './session-history.component.html',
  styleUrls: ['./session-history.component.scss']
})
export class SessionHistoryComponent implements OnInit {

  @ViewChild('dtSessions') dtSessions!: Table;
  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

  public sessions: any[] = [];
  public loading: boolean = false;
  public tz: string = '';
  public origin = window.location.origin;

  public sessionFilters: any = { device_id: '', user_id: '' };
  
  public exportModalVisible: boolean = false;
  public exportColumns = [
    { field: 'session_id', label: 'Session ID', selected: true },
    { field: 'user', label: 'User', selected: true },
    { field: 'device_name', label: 'Device Name', selected: true },
    { field: 'device_ip', label: 'Device IP', selected: true },
    { field: 'session_type', label: 'Session Type', selected: true },
    { field: 'started_fmt', label: 'Started At', selected: true },
    { field: 'ended_fmt', label: 'Ended At', selected: true },
    { field: 'duration_fmt', label: 'Duration', selected: true },
    { field: 'status', label: 'Status', selected: true },
    { field: 'client_ip', label: 'Client IP', selected: true }
  ];

  openExportModal() {
    this.exportModalVisible = true;
  }

  fetchExportData = async (params: { startDate?: string; endDate?: string; scope?: string }) => {
    const data: any = { page: 1, limit: 1000, status: 'ended' };
    if (this.sessionFilters.device_id) data.device_id = this.sessionFilters.device_id;
    if (this.sessionFilters.user_id) data.user_id = this.sessionFilters.user_id;
    if (params.startDate) data.date_from = `${params.startDate}T00:00:00.000Z`;
    if (params.endDate) data.date_to = `${params.endDate}T23:59:59.000Z`;
    const res: any = await this.data_provider.listSessions(data);
    if (res.status === 'success') {
      return res.data.map((s: any) => ({
        ...s,
        started_fmt: s.started ? formatInTimeZone(s.started.split('.')[0] + '.000Z', this.tz, 'yyyy-MM-dd HH:mm:ss') : '-',
        ended_fmt: s.ended ? formatInTimeZone(s.ended.split('.')[0] + '.000Z', this.tz, 'yyyy-MM-dd HH:mm:ss') : '-'
      }));
    }
    return [];
  };
  
  public drawerVisible: boolean = false;
  public selectedSession: any = null;
  public activeDrawerTab: number = 0;
  
  public toasterForm = { autohide: true, delay: 3000, position: 'fixed', fade: true, closeButton: true };

  public recordingModalVisible: boolean = false;
  public recordingUrl: SafeResourceUrl | null = null;


  // Autocomplete
  public suggestedDevices: any[] = [];
  public suggestedUsers: any[] = [];
  public selectedDevice: any = null;
  public selectedUser: any = null;

  constructor(
    private data_provider: dataProvider,
    private login_checker: loginChecker,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {

    this.data_provider.getSessionInfo().then((res: any) => {
      this.tz = res.tz;
      this.loadSessions();
    });
  }

  show_toast(title: string, body: string, color: string) {
    const { ...props } = { ...this.toasterForm, color, title, body };
    const componentRef = this.viewChildren.first.addToast(AppToastComponent, props, {});
    componentRef.instance['closeButton'] = props.closeButton;
  }

  // AUTOCOMPLETE
  private searchDeviceTimeout: any;

  searchDevice(event: any) {
    const query = typeof event === 'string' ? event : '';
    if (this.searchDeviceTimeout) clearTimeout(this.searchDeviceTimeout);
    this.searchDeviceTimeout = setTimeout(() => {
      this.data_provider.get_devices(query).then((res: any) => {
        if (res.status === 'success') {
          this.suggestedDevices = res.data;
        }
      });
    }, 500);
  }

  displayDevice(dev: any): string {
    if (!dev) return '';
    return dev.name || '';
  }

  displayUser(usr: any): string {
    if (!usr) return '';
    return usr.username || '';
  }

  private searchUserTimeout: any;

  searchUser(event: any) {
    const query = typeof event === 'string' ? event : '';
    if (this.searchUserTimeout) clearTimeout(this.searchUserTimeout);
    this.searchUserTimeout = setTimeout(() => {
      this.data_provider.get_users(1, 20, query).then((res: any) => {
        if (res.status === 'success') {
          this.suggestedUsers = res.data;
        } else if (Array.isArray(res)) {
          this.suggestedUsers = res;
        } else if (res && res.result) {
          this.suggestedUsers = res.result;
        } else if (res && res.data) {
          this.suggestedUsers = res.data;
        }
      });
    }, 500);
  }

  onDeviceSelect(event: any) {
    this.sessionFilters.device_id = event.id;
    this.loadSessions();
  }
  
  onUserSelect(event: any) {
    this.sessionFilters.user_id = event.id;
    this.loadSessions();
  }

  onDeviceClear() {
    this.selectedDevice = null;
    this.sessionFilters.device_id = '';
    this.loadSessions();
  }

  onUserClear() {
    this.selectedUser = null;
    this.sessionFilters.user_id = '';
    this.loadSessions();
  }

  loadSessions() {
    this.loading = true;
    const data: any = { page: 1, limit: 100, status: 'ended' };
    if (this.sessionFilters.device_id) data.device_id = this.sessionFilters.device_id;
    if (this.sessionFilters.user_id) data.user_id = this.sessionFilters.user_id;

    this.data_provider.listSessions(data).then((res: any) => {
      if (res.status === 'success') {
        this.sessions = res.data.map((s: any) => {
          let duration_fmt = '-';
          if (s.started) {
            const start = new Date(s.started.split('.')[0] + '.000Z').getTime();
            const end = s.ended ? new Date(s.ended.split('.')[0] + '.000Z').getTime() : new Date().getTime();
            const diffMins = Math.floor((end - start) / 60000);
            const h = Math.floor(diffMins / 60);
            const m = diffMins % 60;
            duration_fmt = h > 0 ? `${h}h ${m}m` : `${m}m`;
          }
          return {
            ...s,
            started_fmt: s.started ? formatInTimeZone(s.started.split('.')[0] + '.000Z', this.tz, 'yyyy-MM-dd HH:mm:ss') : '-',
            ended_fmt: s.ended ? formatInTimeZone(s.ended.split('.')[0] + '.000Z', this.tz, 'yyyy-MM-dd HH:mm:ss') : '-',
            duration_fmt
          };
        });
      }
      this.loading = false;
    });
  }

  applySessionFilter() {
    this.loadSessions();
  }

  applyFilterSessions($event: any, stringVal: string) {
    this.dtSessions.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  openSessionDrawer(session: any) {
    this.selectedSession = session;
    this.activeDrawerTab = 0;
    this.drawerVisible = true;
  }

  onDrawerTabChange(index: number) {
    this.activeDrawerTab = index;
  }

  openRecordingModal(session: any, event: Event): void {
    if (event) event.stopPropagation();
    const sessionId = typeof session === 'object' ? (session.id || session.sessionid) : session;
    const isWebfig = typeof session === 'object' && (session.protocol === 'webfig' || session.by === 'Web-Proxy' || session.by === 'proxy');
    const url = isWebfig
      ? '/api/proxy/recording/stream/' + sessionId
      : '/api/terminal/recording/stream/' + sessionId;
    this.recordingUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.recordingModalVisible = true;
  }
}
