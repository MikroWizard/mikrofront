import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { dataProvider } from '../../../../providers/mikrowizard/data';
import { loginChecker } from '../../../../providers/login_checker';
import { formatInTimeZone } from 'date-fns-tz';
import { Table } from 'primeng/table';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-recordings-list',
  templateUrl: './recordings-list.component.html',
  styleUrls: ['./recordings-list.component.scss']
})
export class RecordingsListComponent implements OnInit {
  @Input() defaultFilters: any = null;
  @Input() hideDeviceFilter: boolean = false;
  @Input() embedded: boolean = false;
  @ViewChild('dtRecordings') dtRecordings!: Table;

  public recordings: any[] = [];
  public loading: boolean = false;
  public tz: string = '';

  public recordingFilters: any = { device_id: '', user_id: '', session_id: '', date_from: '', date_to: '' };
  public filters_visible: boolean = false;

  public recordingModalVisible: boolean = false;
  public recordingUrl: any = null;

  public exportModalVisible: boolean = false;
  public exportColumns = [
    { field: 'id', label: 'Recording ID', selected: true },
    { field: 'session_id', label: 'Session ID', selected: true },
    { field: 'user_name', label: 'User', selected: true },
    { field: 'device_name', label: 'Device Name', selected: true },
    { field: 'device_ip', label: 'Device IP', selected: true },
    { field: 'created_at_fmt', label: 'Created At', selected: true },
    { field: 'duration', label: 'Duration', selected: true },
    { field: 'file_size', label: 'Size', selected: true },
    { field: 'video_path', label: 'Video Path', selected: false }
  ];

  openExportModal() {
    this.exportModalVisible = true;
  }

  fetchExportData = async (params: { startDate?: string; endDate?: string; scope?: string }) => {
    const data: any = { page: 1, limit: 1000 };
    if (this.recordingFilters.device_id) data.device_id = this.recordingFilters.device_id;
    if (this.recordingFilters.user_id) data.user_id = this.recordingFilters.user_id;
    if (this.recordingFilters.session_id) data.session_id = this.recordingFilters.session_id;
    if (params.startDate) data.date_from = `${params.startDate}T00:00:00.000Z`;
    if (params.endDate) data.date_to = `${params.endDate}T23:59:59.000Z`;
    const res: any = await this.data_provider.listRecordings(data);
    if (res.status === 'success') {
      return res.data.map((r: any) => ({
        ...r,
        created_at_fmt: r.created_at ? formatInTimeZone(r.created_at.split('.')[0] + '.000Z', this.tz, 'yyyy-MM-dd HH:mm:ss') : '-'
      }));
    }
    return [];
  };

  // Autocomplete
  public suggestedDevices: any[] = [];
  public suggestedUsers: any[] = [];
  public selectedDevice: any = null;
  public selectedUser: any = null;

  constructor(private data_provider: dataProvider, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    if (this.defaultFilters) {
      this.recordingFilters = { ...this.recordingFilters, ...this.defaultFilters };
      if (this.recordingFilters.device_id) {
        this.selectedDevice = { id: this.recordingFilters.device_id, name: 'Filtered Device' };
      }
      if (this.recordingFilters.user_id) {
        this.selectedUser = { id: this.recordingFilters.user_id, username: 'Filtered User' };
      }
    }
    this.data_provider.getSessionInfo().then(res => {
      this.tz = res.tz;
      this.loadRecordings();
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
    this.recordingFilters.device_id = event.id;
    this.loadRecordings();
  }
  
  onUserSelect(event: any) {
    this.recordingFilters.user_id = event.id;
    this.loadRecordings();
  }

  onDeviceClear() {
    this.selectedDevice = null;
    this.recordingFilters.device_id = '';
    this.loadRecordings();
  }

  onUserClear() {
    this.selectedUser = null;
    this.recordingFilters.user_id = '';
    this.loadRecordings();
  }

  loadRecordings() {
    this.loading = true;
    const data = {
      page: 1, limit: 100,
      device_id: this.recordingFilters.device_id || '',
      user_id: this.recordingFilters.user_id || '',
      session_id: this.recordingFilters.session_id || '',
      date_from: this.recordingFilters.date_from || '',
      date_to: this.recordingFilters.date_to || ''
    };
    this.data_provider.listRecordings(data).then((res: any) => {
      if (res.status === 'success') {
        this.recordings = res.data.map((r: any) => ({
          ...r,
          started_fmt: r.started ? formatInTimeZone(r.started.split('.')[0] + '.000Z', this.tz, 'yyyy-MM-dd HH:mm:ss') : '-'
        }));
      }
      this.loading = false;
    });
  }

  toggleFilters(): void {
    this.filters_visible = !this.filters_visible;
  }

  applyFilterRecordings($event: any, stringVal: string) {
    this.dtRecordings.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  openRecordingModal(recordingId: string): void {
    this.recordingUrl = this.sanitizer.bypassSecurityTrustResourceUrl('/api/terminal/recording/stream/' + recordingId);
    this.recordingModalVisible = true;
  }
}
