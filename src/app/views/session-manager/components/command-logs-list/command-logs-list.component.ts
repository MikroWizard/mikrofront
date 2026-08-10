import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { dataProvider } from '../../../../providers/mikrowizard/data';
import { formatInTimeZone } from 'date-fns-tz';
import { Table } from 'primeng/table';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-command-logs-list',
  templateUrl: './command-logs-list.component.html',
  styleUrls: ['./command-logs-list.component.scss']
})
export class CommandLogsListComponent implements OnInit {
  @Input() defaultFilters: any = null;
  @Input() hideDeviceFilter: boolean = false;
  @Input() embedded: boolean = false;
  @ViewChild('dtCommands') dtCommands!: Table;

  public commandLogs: any[] = [];
  public loading: boolean = false;
  public tz: string = '';

  public commandFilters: any = { device_id: '', user_id: '', session_id: '', blocked_only: false, date_from: '', date_to: '' };

  // Autocomplete
  public suggestedDevices: any[] = [];
  public suggestedUsers: any[] = [];
  public selectedDevice: any = null;
  public selectedUser: any = null;

  public recordingModalVisible: boolean = false;
  public recordingUrl: SafeResourceUrl | null = null;

  public exportModalVisible: boolean = false;
  public exportColumns = [
    { field: 'id', label: 'ID', selected: true },
    { field: 'timestamp_fmt', label: 'Timestamp', selected: true },
    { field: 'user_name', label: 'User', selected: true },
    { field: 'device_name', label: 'Device Name', selected: true },
    { field: 'device_ip', label: 'Device IP', selected: true },
    { field: 'command', label: 'Command', selected: true },
    { field: 'status', label: 'Status', selected: true },
    { field: 'session_id', label: 'Session ID', selected: true },
    { field: 'execution_time_ms', label: 'Exec Time (ms)', selected: false },
    { field: 'output', label: 'Output / Payload', selected: false }
  ];

  openExportModal() {
    this.exportModalVisible = true;
  }

  fetchExportData = async (params: { startDate?: string; endDate?: string; scope?: string }) => {
    const data: any = { page: 1, limit: 1000 };
    if (this.commandFilters.device_id) data.device_id = this.commandFilters.device_id;
    if (this.commandFilters.user_id) data.user_id = this.commandFilters.user_id;
    if (this.commandFilters.session_id) data.session_id = this.commandFilters.session_id;
    if (this.commandFilters.blocked_only) data.blocked_only = true;
    if (params.startDate) data.date_from = `${params.startDate}T00:00:00.000Z`;
    if (params.endDate) data.date_to = `${params.endDate}T23:59:59.000Z`;
    const res: any = await this.data_provider.terminalLogSearch(data);
    if (res.status === 'success') {
      return res.data.map((c: any) => ({
        ...c,
        timestamp_fmt: c.timestamp ? formatInTimeZone(c.timestamp.split('.')[0] + '.000Z', this.tz, 'yyyy-MM-dd HH:mm:ss') : '-'
      }));
    }
    return [];
  };

  constructor(private data_provider: dataProvider, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    if (this.defaultFilters) {
      this.commandFilters = { ...this.commandFilters, ...this.defaultFilters };
      if (this.commandFilters.device_id) {
        this.selectedDevice = { id: this.commandFilters.device_id, name: 'Filtered Device' };
      }
      if (this.commandFilters.user_id) {
        this.selectedUser = { id: this.commandFilters.user_id, username: 'Filtered User' };
      }
    }
    this.data_provider.getSessionInfo().then(res => {
      this.tz = res.tz;
      this.loadCommandLogs();
    });
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
    this.commandFilters.device_id = event.id;
    this.loadCommandLogs();
  }

  onUserSelect(event: any) {
    this.commandFilters.user_id = event.id;
    this.loadCommandLogs();
  }

  onDeviceClear() {
    this.selectedDevice = null;
    this.commandFilters.device_id = '';
    this.loadCommandLogs();
  }

  onUserClear() {
    this.selectedUser = null;
    this.commandFilters.user_id = '';
    this.loadCommandLogs();
  }

  loadCommandLogs() {
    this.loading = true;
    const data: any = { limit: 100, offset: 0 };
    if (this.commandFilters.device_id) data.device_id = this.commandFilters.device_id;
    if (this.commandFilters.user_id) data.user_id = this.commandFilters.user_id;
    if (this.commandFilters.session_id) data.session_id = this.commandFilters.session_id;
    if (this.commandFilters.blocked_only) data.is_blocked = true;
    if (this.commandFilters.date_from) data.date_from = this.commandFilters.date_from;
    if (this.commandFilters.date_to) data.date_to = this.commandFilters.date_to;

    this.data_provider.terminalLogSearch(data).then((res: any) => {
      if (res.status === 'success') {
        this.commandLogs = (res.data || []).map((c: any) => ({
          ...c,
          timestamp_fmt: c.timestamp ? formatInTimeZone(
            c.timestamp.split('.')[0] + '.000Z', this.tz, 'yyyy-MM-dd HH:mm:ss'
          ) : '-'
        }));
      }
      this.loading = false;
    });
  }

  applyFilterCommands($event: any, stringVal: string) {
    this.dtCommands.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  filterBySession(sessionId: string) {
    this.commandFilters.session_id = sessionId;
    this.loadCommandLogs();
  }

  openRecordingModal(sessionId: string): void {
    this.recordingUrl = this.sanitizer.bypassSecurityTrustResourceUrl('/api/terminal/recording/stream/' + sessionId);
    this.recordingModalVisible = true;
  }
}
