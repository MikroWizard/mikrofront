import { Component, OnInit, Input, ViewChild, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { NgxSuperSelectOptions } from "ngx-super-select";
import { dataProvider } from '../../../../providers/mikrowizard/data';
import { loginChecker } from '../../../../providers/login_checker';
import { formatInTimeZone } from 'date-fns-tz';
import { Table } from 'primeng/table';
import { ToasterComponent } from '@coreui/angular';
import { AppToastComponent } from '../../../toast-simple/toast.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sessions-list',
  templateUrl: './sessions-list.component.html',
  styleUrls: ['./sessions-list.component.scss']
})
export class SessionsListComponent implements OnInit {
  @Input() defaultFilters: any = null;
  @Input() embedded: boolean = false;
  @ViewChild('dtSessions') dtSessions!: Table;
  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

  public sessions: any[] = [];
  public loading: boolean = false;
  public tz: string = '';
  public origin = window.location.origin;

  public sessionFilters: any = { status: 'active', device_id: '', user_id: '' };
  
  public killSessionVisible: boolean = false;
  public killSessionId: string = '';

  public shareModalVisible: boolean = false;
  public shareUrl: string = '';
  public shareToken: string = '';
  public shareSessionId: string = '';
  public shareRole: string = 'observer';
  public shareName: string = '';
  public shareType: string = 'guest';
  public shareTargetUser: any = null;
  public sharePassword: string = '';
  public shareOneTime: boolean = false;
  public shareHostApproval: boolean = false;
  public userList: any[] = [];

  public participantModalVisible: boolean = false;
  public participantData: any[] = [];
  public participantSessionId: string = '';

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
    { field: 'client_ip', label: 'Client IP', selected: true },
    { field: 'reason', label: 'Reason', selected: false }
  ];

  openExportModal() {
    this.exportModalVisible = true;
  }

  fetchExportData = async (params: { startDate?: string; endDate?: string; scope?: string }) => {
    const data: any = { page: 1, limit: 1000, status: this.sessionFilters.status || '' };
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

  public toasterForm = { autohide: true, delay: 3000, position: 'fixed', fade: true, closeButton: true };

  // Autocomplete
  public suggestedDevices: any[] = [];
  public suggestedUsers: any[] = [];
  public selectedDevice: any = null;
  public selectedUser: any = null;

  constructor(private data_provider: dataProvider, private login_checker: loginChecker, private router: Router, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.defaultFilters) {
      this.sessionFilters = { ...this.sessionFilters, ...this.defaultFilters };
      // Init selections if ids are provided
      if (this.sessionFilters.device_id) {
        this.selectedDevice = { id: this.sessionFilters.device_id, name: 'Filtered Device' };
      }
      if (this.sessionFilters.user_id) {
        this.selectedUser = { id: this.sessionFilters.user_id, username: 'Filtered User' };
      }
    }
    this.data_provider.getSessionInfo().then((res: any) => {
      this.tz = res.tz;
      this.loadSessions();
      this.loadUsers();
    });
  }

  loadUsers() {
    this.data_provider.get_users(1, 1000, '').then((res: any) => {
      if (res.status === 'success') {
        this.userList = res.data;
      }
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
        if (Array.isArray(res)) {
          this.suggestedUsers = res;
        } else if (res && res.result) {
          this.suggestedUsers = res.result;
        } else if (res && res.data) {
          this.suggestedUsers = res.data;
        }
      });
    }, 500);
  }
  
  public shareTargetUserSearch: string = '';
  public shareTargetUserId: any = null;

  onUserSelected(userId: any) {
    this.shareTargetUserId = userId;
    // Set the search text to the user's name for display
    const selectedUser = this.userList.find((u: any) => u.id === userId);
    if (selectedUser) {
      this.shareTargetUserSearch = `${selectedUser.first_name} ${selectedUser.last_name} (${selectedUser.username})`;
    }
  }

  private searchShareUserTimeout: any;

  searchShareUser(query: string) {
    if (this.searchShareUserTimeout) clearTimeout(this.searchShareUserTimeout);
    this.searchShareUserTimeout = setTimeout(() => {
      this.data_provider.get_users(1, 20, query).then((res: any) => {
        if (Array.isArray(res)) {
          this.userList = Array.from(res);
        } else if (res && res.result) {
          this.userList = Array.from(res.result);
        } else if (res && res.data) {
          this.userList = Array.from(res.data);
        }
        this.cd.detectChanges();
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
    const data: any = { page: 1, limit: 100, status: this.sessionFilters.status || '' };
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

  confirmKillSession(sessionId: string) {
    this.killSessionId = sessionId;
    this.killSessionVisible = true;
  }

  executeKillSession() {
    this.data_provider.killTerminalSession(this.killSessionId).then((res: any) => {
      if (res.status === 'success') {
        this.show_toast('Success', 'Session terminated', 'success');
        this.loadSessions();
      } else {
        this.show_toast('Error', res.error || 'Failed to kill session', 'danger');
      }
      this.killSessionVisible = false;
    });
  }

  public isWebfigSession: boolean = false;

  openShareModal(sessionId: string, isWebfig: boolean = false) {
    this.shareSessionId = sessionId;
    this.isWebfigSession = isWebfig;
    this.shareUrl = '';
    this.shareToken = '';
    this.shareRole = 'observer';
    this.shareName = '';
    this.shareType = 'guest';
    this.shareTargetUser = null;
    this.shareTargetUserId = null;
    this.shareTargetUserSearch = '';
    this.sharePassword = '';
    this.shareOneTime = false;
    this.shareHostApproval = false;
    this.shareModalVisible = true;
  }

  createShareLink() {
    const targetUserId = this.shareTargetUserId || '';
    const sharePromise = this.isWebfigSession
      ? this.data_provider.shareWebfigSession(
          this.shareSessionId,
          this.shareRole,
          this.shareName,
          this.shareType,
          targetUserId,
          this.sharePassword,
          this.shareOneTime,
          this.shareHostApproval
        )
      : this.data_provider.shareSession(
          this.shareSessionId,
          this.shareRole,
          this.shareName,
          this.shareType,
          targetUserId,
          this.sharePassword,
          this.shareOneTime,
          this.shareHostApproval
        );

    sharePromise.then((res: any) => {
      if (res.status === 'success') {
        this.shareUrl = res.share_url;
        this.shareToken = res.token;
      } else {
        this.show_toast('Error', res.error || 'Failed to share session', 'danger');
      }
    });
  }

  watchSession(sessionId: string, isWebfig: boolean = false) {
    const adminPass = Math.random().toString(36).slice(-8);
    const sharePromise = isWebfig
      ? this.data_provider.shareWebfigSession(sessionId, 'observer', 'Admin Watch', 'guest', '', adminPass, false, false)
      : this.data_provider.shareSession(sessionId, 'observer', 'Admin Watch', 'guest', '', adminPass, false, false);

    sharePromise.then((res: any) => {
      if (res.status === 'success') {
        const routePath = isWebfig ? '/#/webfig-share?token=' : '/#/terminal-share?token=';
        window.open(this.origin + routePath + res.token + '&password=' + adminPass, '_blank');
      } else {
        this.show_toast('Error', res.error || 'Failed to watch session', 'danger');
      }
    });
  }

  collaborateSession(sessionId: string, isWebfig: boolean = false) {
    const adminPass = Math.random().toString(36).slice(-8);
    const sharePromise = isWebfig
      ? this.data_provider.shareWebfigSession(sessionId, 'collaborator', 'Admin Collab', 'guest', '', adminPass, false, false)
      : this.data_provider.shareSession(sessionId, 'collaborator', 'Admin Collab', 'guest', '', adminPass, false, false);

    sharePromise.then((res: any) => {
      if (res.status === 'success') {
        const routePath = isWebfig ? '/#/webfig-share?token=' : '/#/terminal-share?token=';
        window.open(this.origin + routePath + res.token + '&password=' + adminPass, '_blank');
      } else {
        this.show_toast('Error', res.error || 'Failed to collaborate on session', 'danger');
      }
    });
  }

  copyShareUrl() {
    const routePath = this.isWebfigSession ? '/#/webfig-share?token=' : '/#/terminal-share?token=';
    const url = this.origin + routePath + this.shareToken;
    if (this.sharePassword) {
      navigator.clipboard.writeText(url + '&password=' + this.sharePassword).then(() => {
        this.show_toast('Success', 'Share URL (with password) copied to clipboard', 'success');
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.show_toast('Success', 'Share URL copied to clipboard', 'success');
      });
    }
  }

  loadParticipants(sessionId: string, isWebfig: boolean = false) {
    this.participantSessionId = sessionId;
    this.participantModalVisible = true;
    const loadPromise = isWebfig
      ? this.data_provider.getWebfigParticipants(sessionId)
      : this.data_provider.sessionParticipants(sessionId);

    loadPromise.then((res: any) => {
      if (res.status === 'success') {
        this.participantData = res.data.map((p: any) => ({
          ...p,
          joined_fmt: p.joined_at ? formatInTimeZone(p.joined_at.split('.')[0] + '.000Z', this.tz, 'yyyy-MM-dd HH:mm:ss') : '-'
        }));
      } else {
        this.show_toast('Error', res.error || 'Failed to load participants', 'danger');
        this.participantModalVisible = false;
      }
    });
  }
}
