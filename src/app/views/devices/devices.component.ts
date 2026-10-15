import {
  Component,
  OnInit,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { LicenseService } from "../../providers/license.service";
import {
  ToasterComponent
} from "@coreui/angular";
import { Table } from 'primeng/table';
import { AppToastComponent } from "../toast-simple/toast.component";
import { formatInTimeZone } from "date-fns-tz";
import { Subscription } from "rxjs";
import { UiModeService, UiMode } from "../../providers/ui-mode.service";



@Component({
  templateUrl: "devices.component.html",
  styleUrls: ["devices.component.scss"],
})
export class DevicesComponent implements OnInit, OnDestroy {
  public uid!: number;
  public uname!: string;
  public tz!: string;
  public ispro:boolean=false;
  public hasUserSwitchedTab: boolean = false;
  private modeSub?: Subscription;

  public deviceTab: string = (function() {
    try {
      const mode = localStorage.getItem('mw_ui_mode');
      if (mode === 'pam') return 'all';
      if (mode === 'mikrotik') return 'mikrotik';
      const cached = localStorage.getItem('mw_ispro');
      if (cached === 'false') return 'mikrotik';
    } catch (e) {}
    return 'all';
  })();

  public getDefaultTabForCurrentMode(): string {
    const mode = this.uiModeService?.currentMode || (localStorage.getItem('mw_ui_mode') as UiMode) || 'both';
    if (mode === 'pam') {
      return 'all';
    }
    if (mode === 'mikrotik') {
      return 'mikrotik';
    }
    return (!this.ispro) ? 'mikrotik' : 'all';
  }

  public get mikrotikCount(): number {
    if (!this.source || !Array.isArray(this.source)) return 0;
    return this.source.filter((d: any) => this.isMikrotik(d)).length;
  }

  public get nonMikrotikCount(): number {
    if (!this.source || !Array.isArray(this.source)) return 0;
    return this.source.filter((d: any) => !this.isMikrotik(d)).length;
  }

  public expandedParentServers: Set<number> = new Set<number>();
  public publishAppModalVisible: boolean = false;
  public selectedParentServer: any = null;
  public publishAppData: any = { name: '', app_mode: 'remote_app', remote_app: '', remote_app_dir: '', remote_app_args: '' };
  public isPublishingApp: boolean = false;

  toggleServerExpand(id: number) {
    if (this.expandedParentServers.has(id)) {
      this.expandedParentServers.delete(id);
    } else {
      this.expandedParentServers.add(id);
    }
  }

  isServerExpanded(id: number): boolean {
    return this.expandedParentServers.has(id);
  }

  public get displayDevices(): any[] {
    if (!this.source || !Array.isArray(this.source)) return [];
    if (this.deviceTab === 'mikrotik') {
      return this.source.filter((d: any) => this.isMikrotik(d));
    }

    const targetList = this.deviceTab === 'nonmikrotik'
      ? this.source.filter((d: any) => !this.isMikrotik(d))
      : this.source;

    const childMap = new Map<number, any[]>();
    for (const d of this.source) {
      if (d.parent_id) {
        if (!childMap.has(d.parent_id)) childMap.set(d.parent_id, []);
        childMap.get(d.parent_id)!.push(d);
      }
    }

    const parents = targetList.filter((d: any) => !d.parent_id);
    const orderedList: any[] = [];

    for (const p of parents) {
      const children = childMap.get(p.id) || [];
      p.child_count = children.length;
      p.is_child = false;
      orderedList.push(p);

      if (this.isServerExpanded(p.id)) {
        for (const c of children) {
          c.is_child = true;
          c.parent_server_name = p.name;
          c.effective_ip = p.ip || p.peer_ip;
          orderedList.push(c);
        }
      }
    }

    // Include any orphaned child applications whose parent device is not present in target
    for (const d of targetList) {
      if (d.parent_id && !this.source.some((p: any) => p.id === d.parent_id)) {
        d.is_child = true;
        orderedList.push(d);
      }
    }

    return orderedList;
  }

  openPublishAppModal(server?: any) {
    if (!this.ispro) {
      this.show_toast("Pro Feature", "Publishing applications is only available in Pro tier", "warning");
      return;
    }
    if (!server) {
      const rdpServers = this.getAvailableRdpServers();
      server = rdpServers.length > 0 ? rdpServers[0] : null;
    }
    this.selectedParentServer = server;
    this.publishAppData = {
      parent_id: server?.id || null,
      name: '',
      app_mode: 'remote_app',
      remote_app: '',
      remote_app_dir: '',
      remote_app_args: '',
      group_ids: []
    };
    this.publishAppModalVisible = true;
  }

  onPublishAppServerChange(parentId: any) {
    this.selectedParentServer = this.source.find((s: any) => s.id == parentId) || null;
  }

  savePublishedApp() {
    if (!this.selectedParentServer && this.publishAppData.parent_id) {
      this.selectedParentServer = this.source.find((s: any) => s.id === this.publishAppData.parent_id);
    }
    if (!this.selectedParentServer) {
      this.show_toast('Validation', 'Please select a parent host server', 'warning');
      return;
    }
    if (!this.publishAppData.name || !this.publishAppData.name.trim()) {
      this.show_toast('Validation', 'Please provide an application name', 'warning');
      return;
    }
    if (!this.publishAppData.remote_app?.trim()) {
      this.show_toast('Validation', 'Please provide the application executable or alias', 'warning');
      return;
    }
    this.isPublishingApp = true;
    const payload = {
      parent_id: this.selectedParentServer.id,
      name: this.publishAppData.name.trim(),
      app_mode: 'remote_app',
      remote_app: (this.publishAppData.remote_app || '').trim(),
      remote_app_dir: (this.publishAppData.remote_app_dir || '').trim(),
      remote_app_args: (this.publishAppData.remote_app_args || '').trim(),
      group_ids: this.publishAppData.group_ids || []
    };
    this.data_provider.MikroWizardRPC.sendJsonRequest('/api/non-mikrotik/apps/publish', payload).then((res: any) => {
      this.isPublishingApp = false;
      if (res && (res.status === 'success' || res.id)) {
        const appId = res.id || res.device_id;
        if (appId && payload.group_ids && payload.group_ids.length > 0) {
          this.data_provider.attachDeviceToGroups(appId, payload.group_ids);
        }
        this.show_toast('Success', `Published application "${payload.name}" successfully`, 'success');
        this.publishAppModalVisible = false;
        this.closeUnifiedModal();
        this.expandedParentServers.add(this.selectedParentServer.id);
        this.initGridTable();
      } else {
        this.show_toast('Error', res?.error || 'Failed to publish application', 'danger');
      }
    }).catch((err: any) => {
      this.isPublishingApp = false;
      this.show_toast('Error', err?.message || 'Network error publishing application', 'danger');
    });
  }

  public deviceRecordingsModalVisible: boolean = false;
  public deviceCommandLogsModalVisible: boolean = false;
  public configVersionsModalVisible: boolean = false;
  public selectedConfigDevice: any = {};

  public get licenseBlocked(): boolean {
    return this.licenseService.isBlocked();
  }

  constructor( 
    private data_provider: dataProvider,
    private route: ActivatedRoute,
    private router: Router,
    private login_checker: loginChecker,
    private licenseService: LicenseService,
    public uiModeService: UiModeService
  ) {
    var _self = this;
    if (!this.login_checker.isLoggedIn()) {
      setTimeout(function () {
        _self.router.navigate(["login"]);
      }, 100);
    }

    this.modeSub = this.uiModeService.mode$.subscribe((mode) => {
      if (mode === 'pam') {
        _self.deviceTab = 'all';
        _self.hasUserSwitchedTab = false;
      } else if (mode === 'mikrotik') {
        _self.deviceTab = 'mikrotik';
        _self.hasUserSwitchedTab = false;
      } else if (mode === 'both') {
        if (!_self.hasUserSwitchedTab) {
          _self.deviceTab = !_self.ispro ? 'mikrotik' : 'all';
        }
      }
    });

    this.data_provider.getSessionInfo().then((res) => {
      _self.uid = res.uid;
      _self.uname = res.name;
      _self.tz = res.tz;
      _self.ispro = !!res.ISPRO;
      try {
        localStorage.setItem('mw_ispro', _self.ispro ? 'true' : 'false');
      } catch (e) {}

      if (!_self.hasUserSwitchedTab) {
        _self.deviceTab = _self.getDefaultTabForCurrentMode();
      }
      const userId = _self.uid;

      if (res.role != "admin") {
        setTimeout(function () {
          _self.router.navigate(["/user/dashboard"]);
        }, 100);
      }
    });
    //get datagrid data
    function isNotEmpty(value: any): boolean {
      return value !== undefined && value !== null && value !== "";
    }
  }
  @ViewChild("dt") table!: Table;
  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;
  public source: Array<any> = [];
  public originalSource: Array<any> = [];
  public loading: boolean = true;
  public upgrades: any = [];
  public updates: any = [];
  public scanwizard_step: number = 1;
  public scanwizard_modal: boolean = false;
  public ConfirmModalVisible: boolean = false;
  public EditDevModalVisible: boolean = false;
  public ConfirmAction: string = "checkfirm";
  public scan_type: string = "ip";
  public scan_timer: any;
  public list_update_timer: any;
  public scanwizard_prompt: string = "Scanning Network!";
  public groups: any = [];
  public selected_group: number = 0;
  public groupFilterSearch: string = '';
  public filteredGroupSearch: any[] = [];
  public showGroupSearchDropdown: boolean = false;
  public selected_devices: any = {};
  public selected_device: any = {};
  public activeFirmwareFilter: 'all' | 'updates' | 'upgrades' | 'failed' = 'all';
  public isActionMenuOpen: boolean = false;
  public activeMenuDevice: any = null;
  public globalSearchQuery: string = '';

  trackByDeviceId = (index: number, item: any): any => {
    return item ? item.id : index;
  };

  onActionMenuOpened(item?: any) {
    this.isActionMenuOpen = true;
    if (item) {
      this.activeMenuDevice = item;
      this.selected_device = item;
    }
  }

  onActionMenuClosed() {
    this.isActionMenuOpen = false;
    this.activeMenuDevice = null;
  }

  isAnyModalOpen(): boolean {
    return !!(
      this.ConfirmModalVisible ||
      this.EditDevModalVisible ||
      this.scanwizard_modal ||
      this.ExecutedDataModalVisible ||
      this.detailsModalVisible ||
      this.showWebAccessModal ||
      this.showGatewayNoticeModal ||
      this.addDeviceModalVisible ||
      this.unifiedModalVisible ||
      this.publishAppModalVisible ||
      this.deviceRecordingsModalVisible ||
      this.deviceCommandLogsModalVisible ||
      this.configVersionsModalVisible ||
      this.deviceExportModalVisible
    );
  }

  isUserInteracting(): boolean {
    if (this.isActionMenuOpen) {
      return true;
    }
    if (this.showGroupSearchDropdown) {
      return true;
    }
    if (this.isAnyModalOpen()) {
      return true;
    }
    if (typeof document !== 'undefined') {
      const activeMenu = document.querySelector('.mat-mdc-menu-panel, .mat-menu-panel');
      const activeFilter = document.querySelector('.p-column-filter-overlay, .p-column-filter-menu, .p-dropdown-panel');
      if (activeMenu || activeFilter) {
        return true;
      }
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.classList.contains('p-inputtext') || activeEl.closest('.table-search-input') || activeEl.closest('.p-column-filter-overlay'))) {
        return true;
      }
    }
    return false;
  }
  public show_pass: boolean = false;
  public ExecutedDataModalVisible: boolean = false;
  public ExecutedData: any = [];
  public filteredExecutedData: any = [];
  public selectedTaskType: string = 'all';
  public detailsModalVisible: boolean = false;
  public selectedTaskDetails: any = null;
  public detailsCurrentPage: number = 1;
  public detailsPageSize: number = 10;
  public detailsPaginatedResults: any[] = [];
  public detailsSearchTerm: string = '';
  public filteredDetailsResults: any[] = [];
  public showWebAccessModal: boolean = false;
  public currentDeviceInfo: any = null;
  public showGatewayNoticeModal: boolean = false;
  public gatewayNoticeType: 'not_installed' | 'update_required' = 'not_installed';
  public gatewayNoticeTitle: string = '';
  public gatewayNoticeMessage: string = '';
  public gatewayNoticeDocUrl: string = '';
  public addDeviceModalVisible: boolean = false;
  public addDeviceStep: number = 1;
  public csvFile: File | null = null;
  public csvData: any[] = [];
  public csvHeaders: string[] = [];
  public csvPreview: any[] = [];
  public columnMapping = { ip: '', username: '', password: '', port: '', group_ids: '' };
  public bulkDeviceType: 'mikrotik' | 'nonmikrotik' = 'mikrotik';
  public nonMikrotikColumnMapping = {
    name: '', ip: '', username: '', password: '',
    device_type: '', device_model: '', template_id: '',
    protocol: '', port: '', enable_password: '', group_ids: '', mac: ''
  };
  public availableBrands: any[] = [];
  public get brands(): any[] { return this.availableBrands; }
  public availableTemplates: any[] = [];
  public filteredTemplates: any[] = [];
  public validationResults: any[] = [];
  public validationPassed: boolean = false;
  public validationHasWarnings: boolean = false;
  public validationValidCount: number = 0;
  public uploadStatus: string = 'Processing devices...';
  public uploadResult = { success: 0, failed: 0, resultFile: null };
  public currentTaskId: string = '';
  public statusCheckTimer: any;

  public selected_rows: any[] = []; // Used by p-table selection
  public Selectedrows: any[] = []; // Legacy ID array used by actions
  public rows: any = []; // For legacy internal use

  // Unified Modal & Multi-device State
  public unifiedModalVisible: boolean = false;
  public unifiedModalMode: 'add' | 'edit' = 'add';
  public unifiedCategory: 'mikrotik' | 'other' | 'app' = 'mikrotik';
  public editAppData: any = {
    id: 0,
    name: '',
    parent_id: null,
    parent_server_name: '',
    parent_ip: '',
    app_mode: 'remote_app',
    remote_app: '',
    remote_app_dir: '',
    remote_app_args: '',
    group_ids: []
  };
  public savingUnifiedDevice: boolean = false;
  public savingUnifiedStatus: string = '';
  public brandTemplates: any[] = [];
  public modalGroupSearch: string = '';
  public filteredModalGroups: any[] = [];
  public showModalGroupDropdown: boolean = false;

  public addMikrotikData: any = {
    ip: '', username: 'admin', password: '', port: 8728, ssl: false,
    mikrotik_protocol: 'ssh', connection_port: 22, group_ids: []
  };

  public addNonMikrotikData: any = {
    name: '', ip: '', device_type: 'generic', device_model: '',
    username: '', password: '', enable_password: '', template_id: null,
    protocol: 'ssh', port: 22, group_ids: [], ssh_auth_mode: 'credential',
    parent_id: null
  };

  public editNonMikrotikData: any = {};

  public deviceExportModalVisible: boolean = false;
  public deviceExportColumns = [
    { field: 'id', label: 'ID', selected: true },
    { field: 'name', label: 'Device Name', selected: true },
    { field: 'ip', label: 'IP Address', selected: true },
    { field: 'mac', label: 'MAC Address', selected: true },
    { field: 'arch', label: 'CPU Architecture', selected: true },
    { field: 'current_firmware', label: 'Current Firmware', selected: true },
    { field: 'uptime', label: 'Uptime', selected: true },
    { field: 'status', label: 'Status', selected: true },
    { field: 'model', label: 'Model', selected: false },
    { field: 'group_name', label: 'Group Name', selected: false }
  ];

  openDeviceExportModal() {
    this.deviceExportModalVisible = true;
  }
  
  toasterForm = {
    autohide: true,
    delay: 3000,
    position: "fixed",
    fade: true,
    closeButton: true,
  };
  rowClass: any = {
    class: "row-highlighted",
  };
  public sorting = {
    enabled: true,
    multiSorting: true,
  };
  public target_firmware_version: string = '';
  public packages_mode: string = 'full';
  public selected_extra_packages: string[] = [];
  public available_extra_packages: string[] = ['wireless', 'wifi-qcom', 'wifi-qcom-ac', 'container', 'zerotier', 'dude', 'iot', 'lora', 'gps', 'rose-storage'];
  public auto_upgrade_routerboot: boolean = true;
  public delivery_method: string = 'local_repo';
  public ptp_safe_ordering: boolean = true;
  public latest_cloud_channel: string = 'stable';
  public repo_versions: string[] = [];
  public showPackageOptions: boolean = false;

  onPackagesModeChange(mode?: string): void {
    const selectedMode = mode || this.packages_mode;
    if (selectedMode === 'firmware_only') {
      this.selected_extra_packages = [];
      this.showPackageOptions = false;
    }
  }

  clearExtraPackages(): void {
    this.selected_extra_packages = [];
  }

  public ip_scanner: any = {
    start: "",
    end: "",
    port: "",
    user: "",
    password: "",
    ssl: false,
  };

  applyFilterGlobal($event: any, stringVal: string) {
    const val = ($event.target as HTMLInputElement).value;
    this.globalSearchQuery = val;
    this.table.filterGlobal(val, stringVal);
  }

  public paging: any = {
    enabled: true,
    page: 1,
    pageSize: 10,
    pageSizes: [5, 10, 25, 50],
  };

  public columnMenu: any = {
    enabled: true,
    sort: true,
    columnsManager: true,
  };

  public infoPanel: any = {
    enabled: true,
    infoDialog: false,
    columnsManager: true,
    schemaManager: true,
  };

  onSelectionChange(value: any[]) {
    this.selected_rows = value;
    this.Selectedrows = value ? value.map(item => item.id) : [];
    this.rows = value; // For legacy compat if needed
  }

  get selectedMikrotikCount(): number {
    if (!this.selected_rows || !Array.isArray(this.selected_rows)) return 0;
    return this.selected_rows.filter(d => this.isMikrotik(d)).length;
  }

  get selectedNonMikrotikCount(): number {
    if (!this.selected_rows || !Array.isArray(this.selected_rows)) return 0;
    return this.selected_rows.filter(d => !this.isMikrotik(d)).length;
  }

  triggerBatchAction(action: string) {
    if (!this.selected_rows || this.selected_rows.length === 0) {
      this.show_toast("Warning", "Please select at least one device first", "warning");
      return;
    }

    const mikrotikDevices = this.selected_rows.filter(d => this.isMikrotik(d));
    const nonMikrotikDevices = this.selected_rows.filter(d => !this.isMikrotik(d));

    // Batch maintenance actions (firmware check, update, upgrade, reboot) are strictly MikroTik only
    if (action !== 'delete') {
      if (mikrotikDevices.length === 0) {
        this.show_toast(
          "Warning",
          "Batch maintenance actions (Firmware / Reboot) are only available for MikroTik devices. For other brands, only Delete is supported.",
          "warning"
        );
        return;
      }

      // Filter Selectedrows to only MikroTik devices
      this.Selectedrows = mikrotikDevices.map(item => item.id);
      if (mikrotikDevices.length === 1) {
        this.selected_device = mikrotikDevices[0];
      } else {
        this.selected_device = { name: `${mikrotikDevices.length} MikroTik devices` };
      }

      if (nonMikrotikDevices.length > 0) {
        this.show_toast(
          "Notice",
          `Only ${mikrotikDevices.length} MikroTik device(s) will be processed. ${nonMikrotikDevices.length} non-MikroTik device(s) are excluded.`,
          "info"
        );
      }
    } else {
      // Universal batch delete: applies to all selected devices
      this.Selectedrows = this.selected_rows.map(item => item.id);
      if (this.selected_rows.length === 1) {
        this.selected_device = this.selected_rows[0];
      } else {
        this.selected_device = { name: `${this.selected_rows.length} selected devices` };
      }
    }

    if (action === 'update') {
      this.load_firmware_versions();
      this.target_firmware_version = '';
      this.latest_cloud_channel = 'stable';
      this.packages_mode = 'full';
      this.selected_extra_packages = [];
      this.showPackageOptions = false;
    }
    this.ConfirmAction = action;
    this.ConfirmModalVisible = true;
  }

  clearSelection() {
    this.selected_rows = [];
    this.Selectedrows = [];
    this.rows = [];
  }
  
  ngOnInit(): void {
    this.selected_group = Number(this.route.snapshot.paramMap.get("id"));
    this.initGridTable();
    this.get_groups();
  }

  show_detail(item: any) {
    this.router.navigate(["/device-stats", { id: item.id }]);
  }

  public openDeviceRecordings(device: any) {
    this.selected_device = device;
    this.deviceRecordingsModalVisible = true;
  }

  public openDeviceCommandLogs(device: any) {
    this.selected_device = device;
    this.deviceCommandLogsModalVisible = true;
  }

  public openConfigVersions(device: any) {
    this.selectedConfigDevice = device;
    this.configVersionsModalVisible = true;
  }

  public openDeviceDetails(device: any) {
    this.router.navigate(["/device-stats", { id: device.id }]);
  }

  public handleNonMikrotikAction(event: {type: string, item: any}) {
    if (event.type === 'recordings') {
      this.openDeviceRecordings(event.item);
    } else if (event.type === 'command-logs') {
      this.openDeviceCommandLogs(event.item);
    } else if (event.type === 'details') {
      this.openDeviceDetails(event.item);
    } else if (event.type === 'config-versions') {
      this.openConfigVersions(event.item);
    }
  }

  single_device_action(dev: any, action: string) {
    this.selected_rows = [];
    this.Selectedrows = [dev["id"]];
    this.selected_device = dev;
    switch (action) {
      case "edit":
        this.edit_device_form(dev);
        break;
      case "connect":
        this.connectDevice(dev);
        break;
      case "firmware":
        this.check_firmware();
        break;
      case "update":
        this.load_firmware_versions();
        this.target_firmware_version = '';
        this.latest_cloud_channel = 'stable';
        this.packages_mode = 'full';
        this.selected_extra_packages = [];
        this.ConfirmAction = "update";
        this.ConfirmModalVisible = true;
        break;
      case "upgrade":
        this.ConfirmAction = "upgrade";
        this.ConfirmModalVisible = true;
        break;
      case "clear_failed":
        this.ConfirmAction = "clear_failed";
        this.ConfirmModalVisible = true;
        break;
      case "logauth":
        this.router.navigate(["/authlog", { devid: dev.id }]);
        break;
      case "devlogs":
        this.router.navigate(["/devlogs", { devid: dev.id }]);
        break;
      case "logacc":
        this.router.navigate(["/accountlog", { devid: dev.id }]);
        break;
      case "backup":
        this.router.navigate(["/backups", { devid: dev.id }]);
        break;
      case "reboot":
        this.ConfirmAction = "reboot";
        this.ConfirmModalVisible = true;
        break;
      case "delete":
        this.ConfirmAction = "delete";
        this.ConfirmModalVisible = true;
        break;
    }
  }

  setDeviceTab(tab: string) {
    this.hasUserSwitchedTab = true;
    this.deviceTab = tab;
  }

  getBrandIcon(device: any): string {
    const basePath = './assets/Network-Icons-SVG/';
    if (this.isMikrotik(device)) {
      return basePath + 'logo-mikrotik.svg';
    }
    const brand = (device.brand || device.device_type || '').toLowerCase();
    const brandMap: Record<string, string> = {
      'cisco': 'logo-cisco.svg',
      'cisco_ios': 'logo-cisco.svg',
      'cisco_xr': 'logo-cisco.svg',
      'cisco_nxos': 'logo-cisco.svg',
      'huawei': 'logo-huawei.svg',
      'juniper': 'logo-juniper.svg',
      'junos': 'logo-juniper.svg',
      'hpe': 'logo-hpe.svg',
      'aruba': 'logo-aruba.svg',
      'hpe/aruba': 'logo-aruba.svg',
      'ubiquiti': 'logo-ubiquiti.svg',
      'ubnt': 'logo-ubiquiti.svg',
      'fortinet': 'logo-fortinet.svg',
      'fortigate': 'logo-fortinet.svg',
      'paloalto': 'logo-paloalto.svg',
      'palo_alto': 'logo-paloalto.svg',
      'dell': 'logo-dell.svg',
      'arista': 'logo-arista.svg',
      'dlink': 'logo-dlink.svg',
      'd-link': 'logo-dlink.svg',
      'tplink': 'logo-tplink.svg',
      'tp-link': 'logo-tplink.svg',
      'zyxel': 'logo-zyxel.svg',
      'extreme': 'logo-extreme.svg',
      'netgear': 'logo-netgear.svg',
      'brocade': 'logo-brocade.svg',
      'f5': 'logo-f5.svg',
      'ruckus': 'logo-ruckus.svg',
      'linux': 'generic-server-1.svg',
      'windows': 'generic-server-2.svg',
      'generic': 'generic-router-colour.svg'
    };
    if (brandMap[brand]) {
      return basePath + brandMap[brand];
    }
    return basePath + 'generic-router-colour.svg';
  }

  hasProtocol(device: any, proto: string): boolean {
    if (!device) return false;
    const connTypes = device.connection_types;
    if (connTypes && Array.isArray(connTypes) && connTypes.length > 0) {
      if (connTypes.includes(proto)) return true;
    }
    const protos = device.protocols;
    if (protos && Array.isArray(protos) && protos.length > 0) {
      if (protos.includes(proto)) return true;
    }
    if (device.protocol && device.protocol.toLowerCase() === proto.toLowerCase()) {
      return true;
    }
    if (this.isMikrotik(device)) {
      if (proto === 'api') return true;
      if (proto === 'ssh') {
        return !connTypes || connTypes.includes('ssh') || !connTypes.includes('telnet');
      }
      if (proto === 'telnet') return connTypes && connTypes.includes('telnet');
      if (proto === 'webfig') return true;
      if (proto === 'winbox' || proto === 'webbox') return true;
    } else {
      const isWindows = device.device_type === 'windows' || device.brand === 'windows';
      if (proto === 'rdp' && (device.protocol === 'rdp' || isWindows)) return true;
      if (proto === 'vnc' && (device.protocol === 'vnc' || device.device_type === 'vnc')) return true;
      if (proto === 'telnet' && device.protocol === 'telnet') return true;
      if (proto === 'ssh') {
        if (isWindows) return false;
        return !device.protocol || device.protocol === 'ssh';
      }
    }
    return false;
  }

  isRdp(device: any): boolean {
    if (!device || this.isMikrotik(device)) return false;
    const isWindows = device.device_type === 'windows' || device.brand === 'windows';
    return isWindows || device.protocol === 'rdp' || !!device.is_child || this.isApp(device) || this.hasProtocol(device, 'rdp');
  }

  isVnc(device: any): boolean {
    if (!device || this.isMikrotik(device)) return false;
    return (device.protocol === 'vnc' || device.device_type === 'vnc' || device.brand === 'vnc' || this.hasProtocol(device, 'vnc')) && !this.isRdp(device);
  }

  isRdpOrVnc(device: any): boolean {
    if (!device) return false;
    return this.isRdp(device) || this.isVnc(device);
  }

  connectDevice(device: any, protocol?: string) {
    if (!this.ispro) {
      this.show_toast('Pro Feature', 'Interactive terminal and PAM sessions require a MikroWizard Pro license.', 'warning');
      return;
    }
    const isWindows = device.device_type === 'windows' || device.brand === 'windows';
    const protoToUse = protocol || device.protocol || (isWindows ? 'rdp' : (device.device_type === 'vnc' ? 'vnc' : 'ssh'));
    const navExtras: any = { queryParams: { protocol: protoToUse } };
    this.router.navigate(['/connection-manager', device.id], navExtras);
  }

  getDevicePort(device: any, proto: string): number | string {
    if (!device) return '';
    if (device.connection_ports && device.connection_ports[proto]) {
      return device.connection_ports[proto];
    }
    if (device.protocol === proto && device.port) {
      return device.port;
    }
    const defaults: Record<string, number> = { ssh: 22, telnet: 23, winbox: 8291, webbox: 8291, rdp: 3389, vnc: 5900, api: 8728, webfig: 80 };
    return device.port || defaults[proto] || '';
  }

  getGroupName(gid: any): string {
    if (!this.groups || !Array.isArray(this.groups)) return gid;
    const g = this.groups.find((x: any) => x.id == gid);
    return g ? g.name : gid;
  }

  isGroupSelected(gid: any, targetData: any): boolean {
    return !!(targetData?.group_ids && targetData.group_ids.includes(gid));
  }

  filterModalGroups(event: any): void {
    const query = (event?.target?.value || '').toLowerCase();
    if (!query) {
      this.filteredModalGroups = [...(this.groups || [])];
      return;
    }
    this.filteredModalGroups = (this.groups || []).filter((g: any) =>
      g.name && g.name.toLowerCase().includes(query)
    );
  }

  onFocusModalGroups(targetData: any): void {
    this.showModalGroupDropdown = true;
    if (!this.modalGroupSearch) {
      this.filteredModalGroups = [...(this.groups || [])];
    } else {
      const q = this.modalGroupSearch.toLowerCase();
      this.filteredModalGroups = (this.groups || []).filter((g: any) =>
        g.name && g.name.toLowerCase().includes(q)
      );
    }
  }

  clearModalGroupSearch(): void {
    this.modalGroupSearch = '';
    this.filteredModalGroups = [...(this.groups || [])];
  }

  toggleModalGroupDropdown(targetData: any): void {
    this.showModalGroupDropdown = !this.showModalGroupDropdown;
    if (this.showModalGroupDropdown) {
      this.onFocusModalGroups(targetData);
    }
  }

  closeModalGroupDropdown(): void {
    this.showModalGroupDropdown = false;
  }

  toggleModalGroup(g: any, targetData: any): void {
    if (!targetData.group_ids) {
      targetData.group_ids = [];
    }
    const idx = targetData.group_ids.indexOf(g.id);
    if (idx > -1) {
      targetData.group_ids.splice(idx, 1);
    } else {
      targetData.group_ids.push(g.id);
    }
  }

  selectAllFilteredModalGroups(targetData: any): void {
    if (!targetData.group_ids) {
      targetData.group_ids = [];
    }
    for (const g of this.filteredModalGroups) {
      if (!targetData.group_ids.includes(g.id)) {
        targetData.group_ids.push(g.id);
      }
    }
  }

  clearAllModalGroups(targetData: any): void {
    if (targetData) {
      targetData.group_ids = [];
    }
  }

  selectModalGroup(g: any, targetData: any): void {
    this.toggleModalGroup(g, targetData);
  }

  removeModalGroup(gid: any, targetData: any): void {
    if (!targetData.group_ids) return;
    const idx = targetData.group_ids.indexOf(gid);
    if (idx > -1) {
      targetData.group_ids.splice(idx, 1);
    }
  }

  hideModalGroupDropdown(): void {
    setTimeout(() => this.showModalGroupDropdown = false, 250);
  }

  getTargetNonMikrotikData(): any {
    return this.unifiedModalMode === 'add' ? this.addNonMikrotikData : this.editNonMikrotikData;
  }

  getTemplateProtoTag(t: any): string {
    if (!t) return 'SSH';
    const conn = t.connection || {};
    if (conn.protocol) return conn.protocol.toUpperCase();
    if (conn.protocols && conn.protocols.length) {
      return conn.protocols.map((p: string) => p.toUpperCase()).join('/');
    }
    return 'CLI';
  }

  getFilteredBrandsForProto(protocol?: string): any[] {
    const target = this.getTargetNonMikrotikData();
    const proto = (protocol || target?.protocol || 'ssh').toLowerCase();
    if (!this.availableBrands || !this.availableBrands.length) return [];
    
    if (proto === 'rdp') {
      if (!this.ispro) return [];
      return this.availableBrands.filter((b: any) => {
        const code = (b.brand || b.id || '').toLowerCase();
        return code === 'windows' || code === 'generic';
      });
    } else if (proto === 'vnc') {
      if (!this.ispro) return [];
      return this.availableBrands.filter((b: any) => {
        const code = (b.brand || b.id || '').toLowerCase();
        return code === 'generic' || code === 'linux';
      });
    } else {
      return this.availableBrands.filter((b: any) => {
        const code = (b.brand || b.id || '').toLowerCase();
        return code !== 'windows';
      });
    }
  }

  setNonMikrotikProto(proto: string) {
    if (!this.ispro && (proto === 'rdp' || proto === 'vnc')) {
      return;
    }
    const target = this.getTargetNonMikrotikData();
    if (!target) return;
    const oldProto = target.protocol;
    target.protocol = proto;
    
    const defaults: Record<string, number> = { ssh: 22, telnet: 23, rdp: 3389, vnc: 5900 };
    const prevDefault = defaults[oldProto];
    if (!target.port || target.port === prevDefault) {
      target.port = defaults[proto] || 22;
    }

    const allowedBrands = this.getFilteredBrandsForProto(proto);
    const currentBrand = target.device_type;
    const isBrandAllowed = allowedBrands.some((b: any) => (b.brand || b.id) === currentBrand);
    
    if (!isBrandAllowed) {
      if (proto === 'rdp') {
        target.device_type = 'windows';
      } else if (proto === 'vnc') {
        target.device_type = 'generic';
      } else {
        target.device_type = 'generic';
      }
    }
    
    this.onBrandChangeUnified();
  }

  onBrandChangeUnified() {
    const target = this.getTargetNonMikrotikData();
    let devType = target ? target.device_type : '';
    let proto = target ? (target.protocol || 'ssh') : 'ssh';

    if (!this.ispro) {
      if (proto === 'rdp' || proto === 'vnc') {
        proto = 'ssh';
        if (target) {
          target.protocol = 'ssh';
          target.port = 22;
        }
      }
      if (devType === 'windows') {
        devType = 'generic';
        if (target) {
          target.device_type = 'generic';
        }
      }
    }

    const query: any = { protocol: proto };
    if (devType) {
      query.brand_id = devType;
    }

    this.data_provider.listTemplates(query).then((res: any) => {
      const list = (res.data || res || []);
      this.brandTemplates = list;
      if (target) {
        const hasCurrent = list.some((t: any) => t.id == target.template_id);
        if (!hasCurrent) {
          target.template_id = list.length ? list[0].id : null;
        }
      }
    });
  }

  templateHasEscalation(data: any): boolean {
    if (!data || !data.template_id) return false;
    const t = this.brandTemplates.find((x: any) => x.id == data.template_id);
    return !!(t && t.privilege_escalation && t.privilege_escalation.command);
  }

  getAgentModeDisplay(data: any): string {
    if (!data || !data['agent_modes']) return 'default';
    const m = data['agent_modes'];
    if (m.linux === 'none' && m.darwin === 'none' && m.freebsd === 'none') return 'none';
    if (m.linux === 'strict' && m.darwin === 'strict' && m.freebsd === 'strict') return 'strict';
    if (m.linux === 'strict' && m.darwin === 'compatible' && m.freebsd === 'compatible') return 'strict_compat';
    return 'default';
  }

  setAgentModeOverride(val: string, data: any) {
    let modes = null;
    if (val === 'none') {
      modes = { linux: 'none', darwin: 'none', freebsd: 'none' };
    } else if (val === 'strict') {
      modes = { linux: 'strict', darwin: 'strict', freebsd: 'strict' };
    } else if (val === 'strict_compat') {
      modes = { linux: 'strict', darwin: 'compatible', freebsd: 'compatible' };
    }
    data['agent_modes'] = modes;
  }

  openUnifiedAddModal() {
    this.unifiedModalMode = 'add';
    this.unifiedCategory = (this.deviceTab === 'nonmikrotik') ? 'other' : 'mikrotik';
    this.show_pass = false;
    this.savingUnifiedDevice = false;
    this.savingUnifiedStatus = '';
    this.modalGroupSearch = '';
    this.filteredModalGroups = [];
    this.addMikrotikData = {
      ip: '', username: 'admin', password: '', port: 8728, ssl: false,
      mikrotik_protocol: 'ssh', connection_port: 22, group_ids: []
    };
    this.addNonMikrotikData = {
      name: '', ip: '', device_type: 'generic', device_model: '',
      username: '', password: '', enable_password: '', template_id: null,
      protocol: 'ssh', port: 22, group_ids: [], ssh_auth_mode: 'credential',
      parent_id: null
    };
    const rdpServers = this.getAvailableRdpServers();
    this.publishAppData = {
      parent_id: rdpServers.length > 0 ? rdpServers[0].id : null,
      name: '',
      app_mode: 'remote_app',
      remote_app: '',
      remote_app_dir: '',
      remote_app_args: '',
      group_ids: []
    };
    this.loadBrandsAndTemplates();
    this.onBrandChangeUnified();
    this.unifiedModalVisible = true;
    this.EditDevModalVisible = true;
  }

  closeUnifiedModal() {
    this.unifiedModalVisible = false;
    this.EditDevModalVisible = false;
    this.savingUnifiedDevice = false;
  }

  onCategoryChange() {
    if (this.unifiedCategory === 'app') {
      if (!this.ispro) {
        this.unifiedCategory = 'other';
        this.onBrandChangeUnified();
        return;
      }
      const rdpServers = this.getAvailableRdpServers();
      if (!this.publishAppData.parent_id && rdpServers.length > 0) {
        this.publishAppData.parent_id = rdpServers[0].id;
      }
    } else {
      this.onBrandChangeUnified();
    }
  }

  onMikrotikAddSslChange() {
    this.addMikrotikData.port = this.addMikrotikData.ssl ? 8729 : 8728;
  }

  onMikrotikAddProtocolChange() {
    const defaults: Record<string, number> = { ssh: 22, telnet: 23 };
    const p = this.addMikrotikData.mikrotik_protocol;
    if (p && defaults[p]) {
      this.addMikrotikData.connection_port = defaults[p];
    }
  }

  onNonMikrotikProtoChange() {
    const target = this.getTargetNonMikrotikData();
    if (target && target.protocol) {
      this.setNonMikrotikProto(target.protocol);
    }
  }

  edit_device_form(dev: any) {
    this.selected_device = dev;
    this.show_pass = false;
    this.savingUnifiedDevice = false;
    this.savingUnifiedStatus = '';
    this.modalGroupSearch = '';
    this.filteredModalGroups = [];
    this.loadBrandsAndTemplates();

    if (this.isApp(dev)) {
      if (!this.ispro) {
        this.show_toast("Pro Feature", "Editing applications is only available in Pro tier", "warning");
        return;
      }
      this.unifiedCategory = 'app';
      this.unifiedModalMode = 'edit';
      this.editAppData = {
        id: dev.id,
        name: dev.name || '',
        parent_id: dev.parent_id,
        parent_server_name: dev.parent_server_name || '',
        parent_ip: dev.effective_ip || dev.ip || '',
        app_mode: 'remote_app',
        remote_app: '',
        remote_app_dir: '',
        remote_app_args: '',
        group_ids: dev.group_ids ? [...dev.group_ids] : []
      };

      this.data_provider.getNonMikrotikInfo(dev.id).then((infoRes: any) => {
        if (infoRes && (infoRes.status === 'success' || infoRes.id)) {
          const d = infoRes.data || infoRes;
          let pcfg: any = {};
          if (typeof d.protocol_config === 'string') {
            try { pcfg = JSON.parse(d.protocol_config); } catch (e) { pcfg = {}; }
          } else if (d.protocol_config) {
            pcfg = d.protocol_config;
          }

          this.editAppData.name = d.name || dev.name || '';
          this.editAppData.parent_id = d.parent_id || dev.parent_id;
          this.editAppData.parent_server_name = d.parent_name || dev.parent_server_name || '';
          this.editAppData.parent_ip = d.parent_ip || dev.effective_ip || '';
          this.editAppData.app_mode = 'remote_app';
          this.editAppData.remote_app = pcfg.remote_app || pcfg.initial_program || '';
          this.editAppData.remote_app_dir = pcfg.remote_app_dir || '';
          this.editAppData.remote_app_args = pcfg.remote_app_args || '';
          if (d.group_ids && Array.isArray(d.group_ids)) {
            this.editAppData.group_ids = [...d.group_ids];
          }
        }
        if (!this.editAppData.parent_server_name && this.editAppData.parent_id) {
          const parent = this.source.find((s: any) => s.id === this.editAppData.parent_id);
          if (parent) {
            this.editAppData.parent_server_name = parent.name;
            this.editAppData.parent_ip = parent.ip || parent.peer_ip;
          }
        }
        this.unifiedModalVisible = true;
        this.EditDevModalVisible = true;
      }).catch(() => {
        if (!this.editAppData.parent_server_name && this.editAppData.parent_id) {
          const parent = this.source.find((s: any) => s.id === this.editAppData.parent_id);
          if (parent) {
            this.editAppData.parent_server_name = parent.name;
            this.editAppData.parent_ip = parent.ip || parent.peer_ip;
          }
        }
        this.unifiedModalVisible = true;
        this.EditDevModalVisible = true;
      });
    } else if (this.isMikrotik(dev)) {
      this.unifiedCategory = 'mikrotik';
      this.unifiedModalMode = 'edit';
      let method = this.ispro ? this.data_provider.get_editform_pro(dev.id) : this.data_provider.get_editform(dev.id);
      method.then((res: any) => {
        if ("error" in res && res.error && res.error.indexOf("Unauthorized") > -1) {
          this.show_toast("Error", "You are not authorized to perform this action", "danger");
        } else {
          this.selected_device["editform"] = res;
          const types = res["connection_types"] || [];
          res["mikrotik_protocol"] = types.includes("ssh") ? "ssh" : (types.includes("telnet") ? "telnet" : "ssh");
          res["mikrotik_webfig"] = types.includes("webfig");
          res["connection_port"] = res["connection_port"] || (res["mikrotik_protocol"] === "telnet" ? 23 : 22);
          this.unifiedModalVisible = true;
          this.EditDevModalVisible = true;
        }
      });
    } else {
      if (!this.ispro && (this.isRdpOrVnc(dev) || dev.device_type === 'windows' || dev.brand === 'windows')) {
        this.show_toast("Pro Feature", "Editing RDP, VNC, and Windows devices is only available in Pro tier", "warning");
        return;
      }
      this.unifiedCategory = 'other';
      this.unifiedModalMode = 'edit';
      this.editNonMikrotikData = { ...dev };
      this.editNonMikrotikData.password = '';
      this.editNonMikrotikData.enable_password = '';
      this.editNonMikrotikData.clear_enable_password = false;
      
      this.data_provider.getNonMikrotikInfo(dev.id).then((infoRes: any) => {
        if (infoRes && (infoRes.status === 'success' || infoRes.id)) {
          const d = infoRes.data || infoRes;
          this.editNonMikrotikData = { ...this.editNonMikrotikData, ...d };
        }
        const proto = this.editNonMikrotikData.protocol || dev.protocol || 'ssh';
        this.editNonMikrotikData.protocol = proto;
        const defaults: Record<string, number> = { ssh: 22, telnet: 23, rdp: 3389, vnc: 5900 };
        this.editNonMikrotikData.port = this.editNonMikrotikData.port || defaults[proto] || 22;
        this.onBrandChangeUnified();
        this.unifiedModalVisible = true;
        this.EditDevModalVisible = true;
      });
    }
  }

  onMikrotikProtocolChange() {
    const defaults: Record<string, number> = { ssh: 22, telnet: 23 };
    const protocol = this.selected_device["editform"]["mikrotik_protocol"];
    if (protocol) {
      this.selected_device["editform"]["connection_port"] = defaults[protocol];
    }
  }

  onSslChange() {
    const ssl = this.selected_device["editform"]["ssl"];
    this.selected_device["editform"]["port"] = ssl ? 8729 : 8728;
  }

  onScanSslChange() {
    this.ip_scanner["port"] = this.ip_scanner["ssl"] ? 8729 : 8728;
  }

  save_device() {
    var _self = this;
    const editform = this.selected_device["editform"];
    const types = [];
    if (editform["mikrotik_protocol"]) {
      types.push(editform["mikrotik_protocol"]);
    }
    if (editform["mikrotik_webfig"]) {
      types.push("webfig");
    }
    editform["connection_types"] = types;

    let method = this.ispro ? this.data_provider.save_editform_pro(editform) : this.data_provider.save_editform(editform);
    method.then((res) => {
        _self.show_toast("Success", "Device Saved", "success");
        this.initGridTable();
        this.closeUnifiedModal();
      });
  }

  saveUnifiedDevice() {
    if (this.unifiedModalMode === 'edit') {
      if (this.unifiedCategory === 'mikrotik') {
        this.save_device();
      } else if (this.unifiedCategory === 'app') {
        if (!this.editAppData.name || !this.editAppData.name.trim()) {
          this.show_toast('Validation', 'Please provide an application name', 'warning');
          return;
        }
        if (!this.editAppData.remote_app?.trim()) {
          this.show_toast('Validation', 'Please provide the application executable or alias', 'warning');
          return;
        }
        this.savingUnifiedDevice = true;
        const protocol_config = {
          app_mode: 'remote_app',
          remote_app: (this.editAppData.remote_app || '').trim(),
          remote_app_dir: (this.editAppData.remote_app_dir || '').trim(),
          remote_app_args: (this.editAppData.remote_app_args || '').trim()
        };
        const payload: any = {
          id: this.editAppData.id,
          name: this.editAppData.name.trim(),
          parent_id: this.editAppData.parent_id,
          protocol_config: protocol_config,
          group_ids: this.editAppData.group_ids || []
        };
        this.data_provider.editNonMikrotikDevice(payload).then((res: any) => {
          this.savingUnifiedDevice = false;
          if (res && (res.status === 'success' || !res.error)) {
            if (payload.group_ids && payload.group_ids.length > 0) {
              this.data_provider.attachDeviceToGroups(payload.id, payload.group_ids);
            }
            this.show_toast('Success', `Application "${payload.name}" updated successfully`, 'success');
            this.closeUnifiedModal();
            this.initGridTable();
          } else {
            this.show_toast('Error', res?.error || 'Failed to update application', 'danger');
          }
        }).catch((err: any) => {
          this.savingUnifiedDevice = false;
          this.show_toast('Error', err?.message || 'Failed to update application', 'danger');
        });
      } else {
        if (!this.templateHasEscalation(this.editNonMikrotikData)) {
          this.editNonMikrotikData.enable_password = '';
          this.editNonMikrotikData.clear_enable_password = true;
        }
        if (this.editNonMikrotikData.clear_enable_password) {
          this.editNonMikrotikData.enable_password = '';
        }
        this.savingUnifiedDevice = true;
        this.data_provider.editNonMikrotikDevice(this.editNonMikrotikData).then((res: any) => {
          this.savingUnifiedDevice = false;
          if (res.status === 'success' || !res.error) {
            if (this.editNonMikrotikData.group_ids && this.editNonMikrotikData.group_ids.length > 0) {
              this.data_provider.attachDeviceToGroups(this.editNonMikrotikData.id, this.editNonMikrotikData.group_ids);
            }
            this.show_toast('Success', 'Device updated', 'success');
            this.closeUnifiedModal();
            this.initGridTable();
          } else {
            this.show_toast('Error', res.error || 'Failed to update device', 'danger');
          }
        }).catch(() => {
          this.savingUnifiedDevice = false;
          this.show_toast('Error', 'Failed to update device', 'danger');
        });
      }
    } else {
      // Add Mode
      if (this.unifiedCategory === 'app') {
        this.savePublishedApp();
        return;
      }
      if (this.unifiedCategory === 'mikrotik') {
        if (!this.addMikrotikData.ip || !this.addMikrotikData.username) {
          this.show_toast('Validation', 'Please provide both IP and Username', 'warning');
          return;
        }
        this.savingUnifiedDevice = true;
        this.savingUnifiedStatus = 'Connecting to RouterOS API and scanning device...';
        const singleDevice = [{
          ip: this.addMikrotikData.ip,
          username: this.addMikrotikData.username,
          password: this.addMikrotikData.password,
          port: this.addMikrotikData.port || (this.addMikrotikData.ssl ? 8729 : 8728),
          group_ids: (this.addMikrotikData.group_ids || []).join(',')
        }];
        this.data_provider.bulk_add_devices(singleDevice).then((res: any) => {
          if (res && res.taskId) {
            this.pollUnifiedScanTask(res.taskId);
          } else {
            this.savingUnifiedDevice = false;
            this.show_toast('Error', res?.error || 'Failed to start device validation', 'danger');
          }
        }).catch(() => {
          this.savingUnifiedDevice = false;
          this.show_toast('Error', 'API connection error', 'danger');
        });
      } else {
        if (!this.addNonMikrotikData.ip || !this.addNonMikrotikData.name) {
          this.show_toast('Validation', 'Please provide both Name and IP', 'warning');
          return;
        }
        if (!this.templateHasEscalation(this.addNonMikrotikData)) {
          this.addNonMikrotikData.enable_password = '';
        }
        this.savingUnifiedDevice = true;
        this.data_provider.addNonMikrotikDevice(this.addNonMikrotikData).then((res: any) => {
          this.savingUnifiedDevice = false;
          if (res.status === 'success' || !res.error) {
            this.show_toast('Success', 'Device added successfully', 'success');
            this.closeUnifiedModal();
            this.initGridTable();
          } else {
            this.show_toast('Error', res.error || 'Failed to add device', 'danger');
          }
        }).catch(() => {
          this.savingUnifiedDevice = false;
          this.show_toast('Error', 'Failed to add device', 'danger');
        });
      }
    }
  }

  pollUnifiedScanTask(taskId: string) {
    let attempts = 0;
    const maxAttempts = 30;
    const interval = setInterval(() => {
      attempts++;
      this.data_provider.bulk_add_status(taskId).then((res: any) => {
        if (res.status === 'completed' || res.status === 'finished') {
          clearInterval(interval);
          this.savingUnifiedDevice = false;
          if (res.result && res.result.failed > 0) {
            this.show_toast('Validation Failed', 'Could not connect to MikroTik API. Check IP, API port, and credentials.', 'danger');
          } else {
            this.show_toast('Success', 'MikroTik router validated and added successfully', 'success');
            this.closeUnifiedModal();
            this.initGridTable();
          }
        } else if (res.status === 'failed') {
          clearInterval(interval);
          this.savingUnifiedDevice = false;
          this.show_toast('Scan Error', res.error || 'Validation failed on server', 'danger');
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          this.savingUnifiedDevice = false;
          this.show_toast('Notice', 'Device addition is taking longer than usual. Please refresh the table in a moment.', 'info');
          this.closeUnifiedModal();
          this.initGridTable();
        }
      }).catch(() => {
        clearInterval(interval);
        this.savingUnifiedDevice = false;
        this.show_toast('Notice', 'Request sent to server. Refreshing device list...', 'info');
        this.closeUnifiedModal();
        this.initGridTable();
      });
    }, 1500);
  }

  get_nonmikrotik_pass() {
    if (!this.editNonMikrotikData || !this.editNonMikrotikData.id) return;
    this.editNonMikrotikData.password = 'Loading ...';
    this.data_provider.get_device_pass(this.editNonMikrotikData.id).then((res: any) => {
      const resultObj = res.result ? (res.result.result ? res.result : res) : res;
      if (resultObj.result && resultObj.result.password) {
        this.editNonMikrotikData.password = resultObj.result.password;
        this.show_pass = true;
      } else if (resultObj.password) {
        this.editNonMikrotikData.password = resultObj.password;
        this.show_pass = true;
      } else if (res.password) {
        this.editNonMikrotikData.password = res.password;
        this.show_pass = true;
      } else {
        this.show_toast('Error', res.error || (res.result && res.result.err) || 'Failed to reveal password', 'danger');
      }
    });
  }

  groupselected(item: any) {
    this.selected_group = item.target.value;
    if (this.selected_group != 0) {
      this.router.navigate([".", { id: this.selected_group }]);
    }
    this.initGridTable();
  }

  filterGroupsSearch(event: any): void {
    const query = (event?.target?.value || '').toLowerCase();
    if (!query) {
      this.filteredGroupSearch = [...(this.groups || [])];
      return;
    }
    this.filteredGroupSearch = (this.groups || []).filter((g: any) =>
      g.name && g.name.toLowerCase().includes(query)
    );
  }

  onFocusGroupSearch(): void {
    this.showGroupSearchDropdown = true;
    if (!this.groupFilterSearch) {
      this.filteredGroupSearch = [...(this.groups || [])];
    } else {
      const q = this.groupFilterSearch.toLowerCase();
      this.filteredGroupSearch = (this.groups || []).filter((g: any) =>
        g.name && g.name.toLowerCase().includes(q)
      );
    }
  }

  toggleGroupDropdown(): void {
    this.showGroupSearchDropdown = !this.showGroupSearchDropdown;
    if (this.showGroupSearchDropdown) {
      this.onFocusGroupSearch();
    }
  }

  selectGroupSearch(group: any): void {
    this.selected_group = group.id;
    this.groupFilterSearch = group.id === 0 ? '' : group.name;
    this.showGroupSearchDropdown = false;
    if (this.selected_group != 0) {
      this.router.navigate([".", { id: this.selected_group }]);
    } else {
      this.router.navigate([".", { id: 0 }]);
    }
    this.initGridTable();
  }

  clearGroupFilter(): void {
    this.selected_group = 0;
    this.groupFilterSearch = '';
    this.filteredGroupSearch = [...(this.groups || [])];
    this.showGroupSearchDropdown = false;
    this.router.navigate([".", { id: 0 }]);
    this.initGridTable();
  }

  hideGroupSearchDropdown(): void {
    setTimeout(() => this.showGroupSearchDropdown = false, 250);
  }

  delete_device() {
    var _self = this;
    this.ConfirmModalVisible = false;

    if (!this.Selectedrows || this.Selectedrows.length === 0) {
      return;
    }

    // Partition selected IDs into MikroTik and non-MikroTik
    const mikrotikIds: number[] = [];
    const nonMikrotikIds: number[] = [];

    this.Selectedrows.forEach((id: number) => {
      const dev = this.source.find((d: any) => d.id === id);
      if (dev && !this.isMikrotik(dev)) {
        nonMikrotikIds.push(id);
      } else {
        mikrotikIds.push(id);
      }
    });

    const deletePromises: Promise<any>[] = [];

    // Delete MikroTik devices using dev/delete API
    if (mikrotikIds.length > 0) {
      deletePromises.push(this.data_provider.delete_devices(mikrotikIds));
    }

    // Delete non-MikroTik devices using non-mikrotik/devices/delete API
    if (nonMikrotikIds.length > 0) {
      nonMikrotikIds.forEach((id: number) => {
        deletePromises.push(this.data_provider.deleteNonMikrotikDevice({ id }));
      });
    }

    Promise.all(deletePromises).then((results) => {
      let hasError = false;
      let errorMsg = '';
      results.forEach(res => {
        if (res && res.error) {
          hasError = true;
          errorMsg = res.error;
        }
      });

      if (hasError && errorMsg.indexOf("Unauthorized") > -1) {
        _self.show_toast("Error", "You are not authorized to perform this action", "danger");
      } else if (hasError) {
        _self.show_toast("Error", errorMsg || "Failed to delete some devices", "danger");
      } else {
        const totalDeleted = mikrotikIds.length + nonMikrotikIds.length;
        _self.show_toast("Success", totalDeleted > 1 ? `${totalDeleted} Devices Deleted` : "Device Deleted", "success");
      }
      _self.clearSelection();
      _self.initGridTable();
    }).catch(err => {
      _self.show_toast("Error", "Failed to delete devices", "danger");
      _self.clearSelection();
      _self.initGridTable();
    });
  }

  // Removed legacy onSelectedRows

  checkvalid(type: string): boolean {
    var rx =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (type == "start") return rx.test(this.ip_scanner.start);
    else if (type == "end") return rx.test(this.ip_scanner.end);
    else if (type == "port") {
      if (this.ip_scanner.port == "") return true;
      return Boolean(Number(this.ip_scanner.port));
    } else return false;
  }

  scanwizard(step: number, type: string) {
    var _self = this;
    this.data_provider.scan_devs(this.scan_type, {}).then((res) => {
      if (res.status == true) {
        _self.scanwizard_step = 3;
        this.wait_scan();
        return;
      }
      if (step == 1) {
        _self.scan_type = "";
        _self.ip_scanner = {
          start: "",
          end: "",
          port: "",
          user: "",
          password: "",
          ssl: false,
        };
      }
      if (step == 2) {
        _self.scan_type = "";
        if (type == "ip") {
          _self.scan_type = "ip";
          if (!_self.ip_scanner) {
            _self.ip_scanner = {
              start: "",
              end: "",
              port: "",
              user: "",
              password: "",
              ssl: false,
            };
          }
        } else if (type == "chip") {
          _self.scan_type = "mac";
        }
      }
      if (step == 3) {
        if (_self.scan_type == "ip") {
          if (_self.ip_scanner.start == "" || _self.ip_scanner.end == "") {
            return;
          }
          //test if start and end are valid ip addresses and port is valid
          if (
            !_self.checkvalid("start") ||
            !_self.checkvalid("end") ||
            !_self.checkvalid("port")
          ) {
            return;
          }
          if (_self.ip_scanner.port == "") {
            _self.ip_scanner.port = false;
          }
          if (_self.ip_scanner.user == "") {
            _self.ip_scanner.user = false;
          }
          if (_self.ip_scanner.password == "") {
            _self.ip_scanner.password = false;
          }

          _self.data_provider
            .scan_devs(_self.scan_type, _self.ip_scanner)
            .then((res) => {
              _self.scanwizard_prompt = "Scanning Network!";
              _self.wait_scan();
            });
        } else if (type == "chip") {
          _self.data_provider
            .scan_devs(_self.scan_type, _self.ip_scanner)
            .then((res) => {
              //   console.dir(res);
            });
        }
      }
      if ("error" in res && res.error && res.error.indexOf("Unauthorized") !== -1) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else
      _self.scanwizard_step = step;
    });
  }

  wait_scan() {
    clearTimeout(this.scan_timer);
    var _self = this;
    this.scan_timer = setTimeout(function () {
      _self.data_provider.scan_devs(_self.scan_type, {}).then((res) => {
        if (res.status == false) {
          _self.initGridTable();
          _self.scanwizard_prompt = "Scanning done! Reloading data";
          setTimeout(function () {
            _self.scanwizard_modal = false;
          }, 3000);
        } else {
          _self.wait_scan();
        }
      });
    }, 3000);
  }

  logger(item: any) {
    console.dir(item);
  }

  handleScanwizard_modal(event: any) {
    this.scanwizard_modal = event;
  }
  show_toast(title: string, body: string, color: string) {
    const { ...props } = { ...this.toasterForm, color, title, body };
    const componentRef = this.viewChildren.first.addToast(
      AppToastComponent,
      props,
      {}
    );
    componentRef.instance["closeButton"] = props.closeButton;
  }
  check_firmware() {
    var _self = this;
    this.ConfirmModalVisible = false;
    const targetIds = [...this.Selectedrows];
    this.clearSelection();
    this.data_provider
      .check_firmware(targetIds.toString())
      .then((res) => {
        if ("error" in res && res.error && res.error.indexOf("Unauthorized") > -1) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
          _self.show_toast("info", "Checking Firmwares", "light");
          _self.initGridTable();
        }
      });
  }

  load_firmware_versions() {
    var _self = this;
    this.data_provider.get_firms(0, 1000, false).then((res: any) => {
      if (res && res.firms) {
        _self.repo_versions = Array.from(new Set(res.firms.map((x: any) => String(x.version))));
      }
    }).catch(() => {});
  }

  toggle_package(pkg: string) {
    const idx = this.selected_extra_packages.indexOf(pkg);
    if (idx > -1) {
      this.selected_extra_packages.splice(idx, 1);
    } else {
      this.selected_extra_packages.push(pkg);
    }
  }

  is_package_selected(pkg: string): boolean {
    return this.selected_extra_packages.indexOf(pkg) > -1;
  }

  on_clear_failed_click(event: any, item: any) {
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    this.single_device_action(item, "clear_failed");
  }

  cancelConfirmModal() {
    this.ConfirmModalVisible = false;
    if (this.Selectedrows.length <= 1 && (!this.selected_rows || this.selected_rows.length === 0)) {
      this.clearSelection();
    }
  }

  clear_failed_status() {
    var _self = this;
    this.ConfirmModalVisible = false;
    const idsToReset = [...this.Selectedrows];
    if (this.source && idsToReset.length > 0) {
      this.source.forEach((d: any) => {
        if (idsToReset.includes(d.id)) {
          d.status = 'active';
          d.failed_attempt = 0;
        }
      });
    }
    if (this.originalSource && idsToReset.length > 0) {
      this.originalSource.forEach((d: any) => {
        if (idsToReset.includes(d.id)) {
          d.status = 'active';
          d.failed_attempt = 0;
        }
      });
    }
    this.clearSelection();
    this.data_provider.reset_device_update_status(idsToReset.toString()).then((res: any) => {
      _self.show_toast("Success", "Device update status cleared and reset to active", "success");
      _self.initGridTable();
    }).catch((err: any) => {
      _self.show_toast("Error", (err && err.error) || "Failed to reset status", "danger");
      _self.initGridTable();
    });
  }

  update_firmware() {
    var _self = this;
    this.ConfirmModalVisible = false;
    const targetIds = [...this.Selectedrows];
    if (this.source && targetIds.length > 0) {
      this.source.forEach((d: any) => {
        if (targetIds.includes(d.id)) {
          d.status = 'updating';
        }
      });
    }
    if (this.originalSource && targetIds.length > 0) {
      this.originalSource.forEach((d: any) => {
        if (targetIds.includes(d.id)) {
          d.status = 'updating';
        }
      });
    }
    this.clearSelection();
    // Router Native updates RouterOS and every installed package itself
    const isNative = this.delivery_method === 'native';
    this.data_provider
      .update_firmware(
        targetIds.toString(),
        isNative ? undefined : (this.target_firmware_version || undefined),
        isNative ? 'full' : this.packages_mode,
        !isNative && this.selected_extra_packages.length > 0 && this.packages_mode !== 'firmware_only' ? this.selected_extra_packages : undefined,
        this.auto_upgrade_routerboot,
        this.delivery_method,
        this.ptp_safe_ordering,
        !isNative && this.target_firmware_version === 'latest_cloud' ? this.latest_cloud_channel : undefined
      )
      .then((res) => {
        if ("error" in res && res.error && res.error.indexOf("Unauthorized") > -1) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else if ("error" in res) {
          _self.show_toast("Error", res.error, "danger");
        }
        else{
          _self.show_toast("info", "Updating Firmwares Sent", "light");
          _self.initGridTable();
        }
      });
  }

  upgrade_firmware() {
    var _self = this;
    this.ConfirmModalVisible = false;
    const targetIds = [...this.Selectedrows];
    if (this.source && targetIds.length > 0) {
      this.source.forEach((d: any) => {
        if (targetIds.includes(d.id)) {
          d.status = 'updating';
        }
      });
    }
    if (this.originalSource && targetIds.length > 0) {
      this.originalSource.forEach((d: any) => {
        if (targetIds.includes(d.id)) {
          d.status = 'updating';
        }
      });
    }
    this.clearSelection();
    this.data_provider
      .upgrade_firmware(targetIds.toString())
      .then((res) => {
        if ("error" in res && res.error && res.error.indexOf("Unauthorized") > -1) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
          _self.show_toast("info", "Upgrading Firmwares", "light");
          _self.initGridTable();
        }
      });
  }

  reboot_devices() {
    var _self = this;
    this.ConfirmModalVisible = false;
    const targetIds = [...this.Selectedrows];
    if (this.source && targetIds.length > 0) {
      this.source.forEach((d: any) => {
        if (targetIds.includes(d.id)) {
          d.status = 'rebooting';
        }
      });
    }
    if (this.originalSource && targetIds.length > 0) {
      this.originalSource.forEach((d: any) => {
        if (targetIds.includes(d.id)) {
          d.status = 'rebooting';
        }
      });
    }
    this.clearSelection();
    this.data_provider
      .reboot_devices(targetIds.toString())
      .then((res) => {
        if ("error" in res && res.error && res.error.indexOf("Unauthorized") > -1) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
          _self.show_toast("info", "Reboot sent", "light");
          _self.initGridTable();
        }
      });
  }

  get_groups() {
    var _self = this;
    this.data_provider.get_devgroup_list().then((res) => {
      if ("error" in res && res.error && res.error.indexOf("Unauthorized") > -1) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else{
      if( "status" in res && res.status == 'failed' )
        _self.groups = false
      else
        _self.groups = res;
  }
    });
  }

  updateDevicesData(res: any[]): void {
    if (!Array.isArray(res)) return;

    const existingMap = new Map<number, any>();
    if (Array.isArray(this.originalSource)) {
      for (const item of this.originalSource) {
        if (item && item.id != null) {
          existingMap.set(item.id, item);
        }
      }
    }

    this.upgrades = [];
    this.updates = [];
    const updatedSource: any[] = [];

    for (const newItem of res) {
      if (newItem.upgrade_availble) this.upgrades.push(newItem);
      if (newItem.update_availble) this.updates.push(newItem);

      const existingItem = existingMap.get(newItem.id);
      if (existingItem) {
        // In-place merge of properties so existing object references stay identical
        Object.assign(existingItem, newItem);
        updatedSource.push(existingItem);
      } else {
        updatedSource.push(newItem);
      }
    }

    this.originalSource = updatedSource;
    this.applyCurrentFilters();

    // Restore selection references if user has items selected
    if (this.Selectedrows && this.Selectedrows.length > 0) {
      this.selected_rows = this.source.filter((d: any) => this.Selectedrows.includes(d.id));
    }

    // Preserve table pagination index
    if (this.table && typeof this.table.first === 'number') {
      const currentFirst = this.table.first;
      const total = this.displayDevices ? this.displayDevices.length : 0;
      if (currentFirst >= total) {
        const rows = this.table.rows || 10;
        this.table.first = Math.max(0, Math.floor((total - 1) / rows) * rows);
      }
    }
  }

  initGridTable(): void {
    var _self = this;
    clearTimeout(this.list_update_timer);
    var data = {
      group_id: this.selected_group,
      search: false,
    };

    _self.data_provider.get_dev_list(data).then((res) => {
      if ("error" in res && res.error && res.error.indexOf("Unauthorized") > -1) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      } else {
        _self.updateDevicesData(res);
        _self.loading = false;
        _self.device_interval();
      }
    });
  }

  refreshGridTableData(): void {
    var _self = this;
    var data = {
      group_id: this.selected_group,
      search: false,
    };

    _self.data_provider.get_dev_list(data).then((res) => {
      if (res && !("error" in res)) {
        if (_self.isUserInteracting()) {
          _self.device_interval();
          return;
        }
        _self.updateDevicesData(res);
      }
      _self.device_interval();
    }).catch(() => {
      _self.device_interval();
    });
  }

  device_interval() {
    var _self = this;
    clearTimeout(this.list_update_timer);

    const hasActiveTasks = _self.source && _self.source.some(
      (d: any) => d.status === 'updating' || d.status === 'rebooting' || d.status === 'upgrading'
    );

    // If devices are actively updating/rebooting, poll every 4 seconds for real-time state changes
    const pollInterval = hasActiveTasks ? 4000 : 10000;

    _self.list_update_timer = setTimeout(function () {
      if (_self.isUserInteracting()) {
        // Defer polling while user has an action menu open, filter popup open, or modal open
        _self.device_interval();
        return;
      }

      if (hasActiveTasks || (!_self.Selectedrows || _self.Selectedrows.length < 1)) {
        _self.refreshGridTableData();
      } else {
        // Reschedule to keep polling alive when user unselects rows
        _self.device_interval();
      }
    }, pollInterval);
  }
  
  sanitizeString(desc:string) {
    var itemDesc:string='';
    if (desc) {
        itemDesc = desc.toString().replace(/"/g, '\"');
        itemDesc = itemDesc.replace(/'/g, '\'');
    } else {
        itemDesc = '';
    }
    return itemDesc;
  }

  exportToCsv(jsonResponse:any) {
    const data = jsonResponse;
    const columns = this.getColumns(data);
    const csvData = this.convertToCsv(data, columns);
    this.downloadFile(csvData, 'data.csv', 'text/csv');
  }

  getColumns(data: any[]): string[] {
    const columns : any  = [];
    data.forEach(row => {
      Object.keys(row).forEach((col) => {
        if (!columns.includes(col)) {
          columns.push(col);
        }
      });
    });
    return columns;
  }

  convertToCsv(data: any[], columns: string[]): string {
    var _self=this;
    let csv = '';
    csv += columns.join(',') + '\n';
    data.forEach(row => {
      const values : any = [];
      columns.forEach((col:any) => {
        values.push('"'+_self.sanitizeString(row[col])+'"');
      });
      csv += values.join(',') + '\n';
    });
    return csv;
  }

  downloadFile(data: string, filename: string, type: string) {
    const blob = new Blob([data], { type: type });
    const nav = (window.navigator as any);

    if (nav.msSaveOrOpenBlob) {
		nav.msSaveBlob(blob, filename);
    } else {
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  get_device_pass(){
    var _self=this;
    _self.selected_device['editform']['password']="Loading ...";
    if (_self.ispro && !this.show_pass){
      _self.data_provider.get_device_pass(this.selected_device['id']).then((res: any) => {
        if ("error" in res && res.error && res.error.indexOf("Unauthorized") > -1) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else {
          const resultObj = res.result ? (res.result.result ? res.result : res) : res;
          
          if (resultObj.result && resultObj.result.password) {
            _self.selected_device['editform']['password']=resultObj.result.password;
            this.show_pass=!this.show_pass;
          } else if (resultObj.password) {
            _self.selected_device['editform']['password']=resultObj.password;
            this.show_pass=!this.show_pass;
          } else if (res.password) {
            _self.selected_device['editform']['password']=res.password;
            this.show_pass=!this.show_pass;
          } else {
            _self.show_toast('Error', res.error || (res.result && res.result.err) || 'Failed to reveal password', 'danger');
          }
        }
      });
    }
    else{
      this.show_pass=!this.show_pass;
    }
  }
  show_exec(){
    var _self=this;
    this.ExecutedDataModalVisible = true;
    this.data_provider
    .scan_results()
    .then((res) => {
      if ("error" in res && res.error && res.error.indexOf("Unauthorized") > -1) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else{
      let index = 1;
      _self.ExecutedData= res.data.map((d: any) => {
        d.index = index;
        d.ended = formatInTimeZone(
          d.created.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss XXX"
        );
        d.info=JSON.parse(d.info);
        d.started = formatInTimeZone(
          d.info.created.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss XXX"
        );
        d.start_ip=d.info.start_ip || 'N/A';
        d.end_ip=d.info.end_ip || 'N/A';
        d.task_id=d.info.task_id || 'N/A';
        d.device_count=d.info.device_count || 0;
        d.username=d.info.username || 'N/A';
        d.result=JSON.parse(d.result);
        d.success_count = d.result.filter((r: any) => r.added === true).length;
        d.failed_count = d.result.filter((r: any) => r.added === false).length;
        index += 1;
        return d;
        });
      _self.filteredExecutedData = [..._self.ExecutedData];
      }
    });
    }

  filterByTaskType() {
    if (this.selectedTaskType === 'all') {
      this.filteredExecutedData = [...this.ExecutedData];
    } else {
      this.filteredExecutedData = this.ExecutedData.filter((d: any) => d.task_type === this.selectedTaskType);
    }
  }

  showTaskDetails(task: any) {
    this.selectedTaskDetails = task;
    this.detailsCurrentPage = 1;
    this.updateDetailsPagination();
    this.detailsModalVisible = true;
  }

  updateDetailsPagination() {
    if (!this.selectedTaskDetails?.result) return;
    
    // Filter results based on search term
    this.filteredDetailsResults = this.selectedTaskDetails.result.filter((result: any) => 
      result.ip.toLowerCase().includes(this.detailsSearchTerm.toLowerCase()) ||
      (result.failures && result.failures.toLowerCase().includes(this.detailsSearchTerm.toLowerCase())) ||
      (result.faileres && result.faileres.toLowerCase().includes(this.detailsSearchTerm.toLowerCase()))
    );
    
    const startIndex = (this.detailsCurrentPage - 1) * this.detailsPageSize;
    const endIndex = startIndex + this.detailsPageSize;
    this.detailsPaginatedResults = this.filteredDetailsResults.slice(startIndex, endIndex);
  }

  onDetailsPageChange(page: number) {
    this.detailsCurrentPage = page;
    this.updateDetailsPagination();
  }

  getTotalDetailsPages(): number {
    if (!this.filteredDetailsResults) return 0;
    return Math.ceil(this.filteredDetailsResults.length / this.detailsPageSize);
  }

  onDetailsSearch() {
    this.detailsCurrentPage = 1;
    this.updateDetailsPagination();
  }

  closeDetailsModal() {
    this.detailsModalVisible = false;
    this.selectedTaskDetails = null;
    this.detailsPaginatedResults = [];
    this.filteredDetailsResults = [];
    this.detailsCurrentPage = 1;
    this.detailsSearchTerm = '';
  }

  applyCurrentFilters(): void {
    if (!this.originalSource || !Array.isArray(this.originalSource)) {
      this.source = [];
      return;
    }
    switch (this.activeFirmwareFilter) {
      case 'updates':
        this.source = this.originalSource.filter((device: any) => device.update_availble);
        break;
      case 'upgrades':
        this.source = this.originalSource.filter((device: any) => device.upgrade_availble);
        break;
      case 'failed':
        this.source = this.originalSource.filter((device: any) => device.status === 'failed');
        break;
      case 'all':
      default:
        this.source = [...this.originalSource];
        break;
    }
  }

  filterUpdatable() {
    this.activeFirmwareFilter = this.activeFirmwareFilter === 'updates' ? 'all' : 'updates';
    this.applyCurrentFilters();
  }

  filterUpgradable() {
    this.activeFirmwareFilter = this.activeFirmwareFilter === 'upgrades' ? 'all' : 'upgrades';
    this.applyCurrentFilters();
  }

  filterFailedUpdates() {
    this.activeFirmwareFilter = this.activeFirmwareFilter === 'failed' ? 'all' : 'failed';
    this.applyCurrentFilters();
  }

  public get failedUpdatesCount(): number {
    if (!this.originalSource || !Array.isArray(this.originalSource)) return 0;
    return this.originalSource.filter((d: any) => d.status === 'failed').length;
  }

  clearFilter() {
    this.activeFirmwareFilter = 'all';
    this.applyCurrentFilters();
  }

  webAccess(device: any) {
    this.currentDeviceInfo = device;
    if (this.ispro) {
      this.showWebAccessModal = true;
    } else {
      this.openDirectAccess();
    }
  }

  openProxyAccess() {
    this.showWebAccessModal = false;
    if (this.currentDeviceInfo?.id) {
      this.connectDevice(this.currentDeviceInfo, 'webfig');
    } else {
      const ip = this.currentDeviceInfo?.ip;
      if (ip) {
        window.open(`/api/proxy/init?dev_ip=${ip}`, '_blank');
      }
    }
  }

  openDirectAccess() {
    const ip = this.currentDeviceInfo?.ip;
    if (ip) {
      window.open(`http://${ip}`, '_blank');
    }
    this.showWebAccessModal = false;
  }

  closeWebAccessModal() {
    this.showWebAccessModal = false;
  }

  isMikrotik(device: any): boolean {
    if (!device) return false;
    if (device.parent_id || device.is_child) return false;
    return !device.device_type || device.device_type === 'mikrotik' || device.brand === 'mikrotik';
  }

  isApp(device: any): boolean {
    if (!device) return false;
    if (device.parent_id || device.is_child) return true;
    if (device.protocol_config) {
      if (typeof device.protocol_config === 'string') {
        return device.protocol_config.indexOf('app_mode') > -1;
      }
      return !!device.protocol_config.app_mode;
    }
    return false;
  }

  isRdpHost(device: any): boolean {
    if (!device || this.isMikrotik(device) || this.isApp(device)) return false;
    return this.hasProtocol(device, 'rdp') || this.isRdp(device);
  }

  getAppCommand(device: any): string {
    if (!device) return '-';
    let cfg = device.protocol_config || {};
    if (typeof cfg === 'string') {
      try { cfg = JSON.parse(cfg); } catch (e) { cfg = {}; }
    }
    return cfg.remote_app || cfg.initial_program || 'RemoteApp';
  }

  getAvailableRdpServers(): any[] {
    if (!this.source || !Array.isArray(this.source)) return [];
    return this.source.filter((d: any) => this.isRdpHost(d));
  }

  openWebboxAccess(device?: any) {
    const dev = device || this.currentDeviceInfo;
    if (!dev || !dev.id) return;
    this.showWebAccessModal = false;
    this.connectDevice(dev, 'webbox');
  }

  openAddDeviceModal() {
    this.addDeviceModalVisible = true;
    this.resetAddDeviceForm();
    this.loadBrandsAndTemplates();
  }

  loadBrandsAndTemplates() {
    this.data_provider.listBrands().then((res: any) => {
      const data = Array.isArray(res) ? res : (res.data || res || []);
      let brands = data.filter((b: any) => b.brand !== 'mikrotik');
      if (!this.ispro) {
        brands = brands.filter((b: any) => (b.brand || b.id || '').toLowerCase() !== 'windows');
      }
      this.availableBrands = brands;
    });
    this.data_provider.listTemplates({}).then((res: any) => {
      let data = (res.data || res || []);
      if (!this.ispro) {
        data = data.filter((t: any) => {
          const brand = (t.brand || '').toLowerCase();
          const conn = t.connection || {};
          const pList = (conn.protocols ? [...conn.protocols] : (conn.protocol ? [conn.protocol] : ['ssh'])).map((p: string) => p.toLowerCase());
          const hasProProto = pList.some((p: string) => p === 'rdp' || p === 'vnc');
          return brand !== 'windows' && !hasProProto;
        });
      }
      this.availableTemplates = data.map((t: any) => {
        const conn = t.connection || {};
        const pList = conn.protocols ? [...conn.protocols] : (conn.protocol ? [conn.protocol] : ['ssh']);
        return {
          id: t.id,
          brand: t.brand,
          display_name: t.display_name,
          os_type: t.os_type,
          protocol: conn.protocol || (pList.length ? pList[0] : null),
          protocols: pList,
          has_enable: !!t.privilege_escalation,
          raw: t
        };
      });
    });
  }

  onBulkTypeChange() {
    this.addDeviceStep = 1;
    this.csvFile = null;
    this.csvData = [];
    this.csvHeaders = [];
    this.csvPreview = [];
    this.validationResults = [];
    this.validationPassed = false;
  }

  getTemplateProtocols(t: any): string {
    if (t.protocols && Array.isArray(t.protocols)) return t.protocols.join(', ');
    return '-';
  }

  filterTemplatesForBrand(brand: string) {
    if (!brand) {
      this.filteredTemplates = this.availableTemplates;
    } else {
      this.filteredTemplates = this.availableTemplates.filter((t: any) => t.brand === brand);
    }
  }

  downloadMikrotikCsvTemplate() {
    const csv = 'ip,username,password,port\n192.168.88.1,admin,password,8728\n10.0.0.1,user,pass,8729\n';
    this.downloadFile(csv, 'mikrotik-bulk-template.csv', 'text/csv');
  }

  downloadNonMikrotikCsvTemplate() {
    const csv = 'name,ip,username,password,device_type,template_id,protocol,port,enable_password,device_model\n' +
      'Core-Switch,10.0.0.1,admin,str0ng!,cisco,1,ssh,22,enable123,WS-C2960\n' +
      'Edge-Router,10.0.0.2,admin,pass456,cisco,4,telnet,23,admin789,\n' +
      'Linux-Server,10.0.0.3,root,r00t!,linux,7,ssh,2222,,Ubuntu-22.04\n' +
      'AP-Office,10.0.0.4,admin,ap1234,generic,1,telnet,23,,\n';
    this.downloadFile(csv, 'non-mikrotik-bulk-template.csv', 'text/csv');
  }

  closeAddDeviceModal() {
    this.addDeviceModalVisible = false;
    this.resetAddDeviceForm();
  }

  resetAddDeviceForm() {
    this.addDeviceStep = 1;
    this.bulkDeviceType = 'mikrotik';
    this.csvFile = null;
    this.csvData = [];
    this.csvHeaders = [];
    this.csvPreview = [];
    this.columnMapping = { ip: '', username: '', password: '', port: '', group_ids: '' };
    this.nonMikrotikColumnMapping = {
      name: '', ip: '', username: '', password: '',
      device_type: '', device_model: '', template_id: '',
      protocol: '', port: '', enable_password: '', group_ids: '', mac: ''
    };
    this.uploadStatus = 'Processing devices...';
    this.uploadResult = { success: 0, failed: 0, resultFile: null };
    this.currentTaskId = '';
    this.validationResults = [];
    this.validationPassed = false;
    this.validationHasWarnings = false;
    this.validationValidCount = 0;
    this.filteredTemplates = [];
    clearTimeout(this.statusCheckTimer);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      this.csvFile = file;
      this.parseCSV(file);
    }
  }

  parseCSV(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const csv = e.target.result;
      const lines = csv.split('\n').filter((line: string) => line.trim());
      
      if (lines.length > 0) {
        this.csvHeaders = lines[0].split(',').map((header: string) => header.trim());
        this.csvData = lines.slice(1).map((line: string) => 
          line.split(',').map((cell: string) => cell.trim())
        );
        this.csvPreview = this.csvData.slice(0, 3);
      }
    };
    reader.readAsText(file);
  }

  onNonMikrotikColumnMapped() {
    const deviceTypeIdx = this.nonMikrotikColumnMapping.device_type;
    if (deviceTypeIdx !== '' && this.csvPreview.length > 0) {
      const firstRowVal = this.csvData[0]?.[parseInt(deviceTypeIdx)];
      if (firstRowVal) {
        this.filterTemplatesForBrand(firstRowVal);
      }
    }
  }

  isNonMikrotikMappingValid(): boolean {
    return this.nonMikrotikColumnMapping.ip !== '' &&
           this.nonMikrotikColumnMapping.username !== '' &&
           this.nonMikrotikColumnMapping.password !== '' &&
           this.nonMikrotikColumnMapping.device_type !== '' &&
           this.csvData.length > 0;
  }

  validateNonMikrotikCSV() {
    if (!this.isNonMikrotikMappingValid()) return;
    
    const devices = this.csvData.map(row => {
      const dev: any = { ip: '', username: '', password: '', device_type: '' };
      if (this.nonMikrotikColumnMapping.name !== '') dev.name = row[parseInt(this.nonMikrotikColumnMapping.name)];
      dev.ip = row[parseInt(this.nonMikrotikColumnMapping.ip)];
      dev.username = row[parseInt(this.nonMikrotikColumnMapping.username)];
      dev.password = row[parseInt(this.nonMikrotikColumnMapping.password)];
      dev.device_type = row[parseInt(this.nonMikrotikColumnMapping.device_type)];
      if (this.nonMikrotikColumnMapping.device_model !== '') dev.device_model = row[parseInt(this.nonMikrotikColumnMapping.device_model)];
      if (this.nonMikrotikColumnMapping.template_id !== '') dev.template_id = row[parseInt(this.nonMikrotikColumnMapping.template_id)];
      if (this.nonMikrotikColumnMapping.protocol !== '') dev.protocol = row[parseInt(this.nonMikrotikColumnMapping.protocol)];
      if (this.nonMikrotikColumnMapping.port !== '') dev.port = row[parseInt(this.nonMikrotikColumnMapping.port)];
      if (this.nonMikrotikColumnMapping.enable_password !== '') dev.enable_password = row[parseInt(this.nonMikrotikColumnMapping.enable_password)];
      if (this.nonMikrotikColumnMapping.group_ids !== '') dev.group_ids = row[parseInt(this.nonMikrotikColumnMapping.group_ids)];
      if (this.nonMikrotikColumnMapping.mac !== '') dev.mac = row[parseInt(this.nonMikrotikColumnMapping.mac)];
      return dev;
    });

    this.data_provider.validate_non_mikrotik_bulk(devices).then((res: any) => {
      if (res && res.rows) {
        this.validationResults = res.rows;
        this.validationPassed = res.valid || false;
        this.validationHasWarnings = res.has_warnings || false;
        this.validationValidCount = res.rows.filter((r: any) => r.valid).length;
        this.addDeviceStep = 1.5;
        
        if (this.availableBrands.length === 0 && res.brands) {
          this.availableBrands = res.brands;
        }
        if (this.availableTemplates.length === 0 && res.templates) {
          this.availableTemplates = res.templates;
        }
      } else {
        this.show_toast('Error', 'Validation failed', 'danger');
      }
    }).catch(() => {
      this.show_toast('Error', 'Failed to validate devices', 'danger');
    });
  }

  isValidMapping(): boolean {
    return this.columnMapping.ip !== '' && 
           this.columnMapping.username !== '' && 
           this.columnMapping.password !== '' && 
           this.columnMapping.port !== '' &&
           this.csvData.length > 0;
  }

  uploadDevices() {
    this.addDeviceStep = 2;
    this.uploadStatus = 'Processing devices...';

    if (this.bulkDeviceType === 'mikrotik') {
      if (!this.isValidMapping()) return;
      const devices = this.csvData.map(row => ({
        ip: row[parseInt(this.columnMapping.ip)],
        username: row[parseInt(this.columnMapping.username)],
        password: row[parseInt(this.columnMapping.password)],
        port: row[parseInt(this.columnMapping.port)],
        group_ids: this.columnMapping.group_ids ? row[parseInt(this.columnMapping.group_ids)] : ''
      }));

      this.data_provider.bulk_add_devices(devices).then((res) => {
        this.handleBulkAddResponse(res, devices.length);
      }).catch(() => {
        this.handleBulkAddError(devices.length);
      });
    } else {
      const devices = this.csvData.map(row => {
        const dev: any = {};
        if (this.nonMikrotikColumnMapping.name !== '') dev.name = row[parseInt(this.nonMikrotikColumnMapping.name)];
        dev.ip = row[parseInt(this.nonMikrotikColumnMapping.ip)];
        dev.username = row[parseInt(this.nonMikrotikColumnMapping.username)];
        dev.password = row[parseInt(this.nonMikrotikColumnMapping.password)];
        dev.device_type = row[parseInt(this.nonMikrotikColumnMapping.device_type)];
        if (this.nonMikrotikColumnMapping.device_model !== '') dev.device_model = row[parseInt(this.nonMikrotikColumnMapping.device_model)];
        if (this.nonMikrotikColumnMapping.template_id !== '') dev.template_id = row[parseInt(this.nonMikrotikColumnMapping.template_id)];
        if (this.nonMikrotikColumnMapping.protocol !== '') dev.protocol = row[parseInt(this.nonMikrotikColumnMapping.protocol)];
        if (this.nonMikrotikColumnMapping.port !== '') dev.port = row[parseInt(this.nonMikrotikColumnMapping.port)];
        if (this.nonMikrotikColumnMapping.enable_password !== '') dev.enable_password = row[parseInt(this.nonMikrotikColumnMapping.enable_password)];
        if (this.nonMikrotikColumnMapping.group_ids !== '') dev.group_ids = row[parseInt(this.nonMikrotikColumnMapping.group_ids)];
        if (this.nonMikrotikColumnMapping.mac !== '') dev.mac = row[parseInt(this.nonMikrotikColumnMapping.mac)];
        return dev;
      });

      this.data_provider.bulk_add_non_mikrotik_devices(devices).then((res) => {
        if (res && res.status === 'validation_failed') {
          this.addDeviceStep = 1.5;
          this.validationResults = res.rows || [];
          this.validationPassed = false;
          this.validationValidCount = 0;
          this.show_toast('Error', 'Validation failed. Check rows for details.', 'danger');
        } else {
          this.handleBulkAddResponse(res, devices.length);
        }
      }).catch(() => {
        this.handleBulkAddError(this.csvData.length);
      });
    }
  }

  handleBulkAddResponse(res: any, totalCount: number) {
    if ('error' in res) {
      this.addDeviceStep = 3;
      this.show_toast('Error', 'Failed to start device upload', 'danger');
      this.uploadResult = { success: 0, failed: totalCount, resultFile: null };
    } else if ('taskId' in res) {
      this.currentTaskId = res.taskId;
      this.uploadStatus = 'Processing devices...';
      this.checkUploadStatus();
    } else {
      this.addDeviceStep = 3;
      this.show_toast('Error', 'Invalid response from server', 'danger');
      this.uploadResult = { success: 0, failed: totalCount, resultFile: null };
    }
  }

  handleBulkAddError(totalCount: number) {
    this.addDeviceStep = 3;
    this.uploadResult = { success: 0, failed: totalCount, resultFile: null };
    this.show_toast('Error', 'Failed to upload devices', 'danger');
  }

  checkUploadStatus() {
    clearTimeout(this.statusCheckTimer);
    
    this.data_provider.bulk_add_status(this.currentTaskId).then((res) => {
      if ('error' in res) {
        this.addDeviceStep = 3;
        this.show_toast('Error', 'Failed to check upload status', 'danger');
        this.uploadResult = { success: 0, failed: 0, resultFile: null };
        return;
      }
      
      if (res.status === 'completed') {
        this.addDeviceStep = 3;
        this.uploadResult = {
          success: res.success || 0,
          failed: res.failed || 0,
          resultFile: res.resultFile || null
        };
        this.show_toast('Success', `${res.success} devices added successfully`, 'success');
        this.initGridTable();
      } else if (res.status === 'failed') {
        this.addDeviceStep = 3;
        this.show_toast('Error', res.message || 'Upload failed', 'danger');
        this.uploadResult = { success: 0, failed: 0, resultFile: null };
      } else {
        // Still processing
        this.uploadStatus = res.message || 'Processing devices...';
        this.statusCheckTimer = setTimeout(() => {
          this.checkUploadStatus();
        }, 3000);
      }
    }).catch(() => {
      this.addDeviceStep = 3;
      this.show_toast('Error', 'Failed to check upload status', 'danger');
      this.uploadResult = { success: 0, failed: 0, resultFile: null };
    });
  }

  downloadResults() {
    if (this.uploadResult.resultFile) {
      const link = document.createElement('a');
      link.href = this.uploadResult.resultFile;
      link.download = 'device_upload_results.csv';
      link.click();
    }
  }

  getTaskTypeLabel(taskType: string): string {
    switch(taskType) {
      case 'ip-scan': return 'IP Scan';
      case 'bulk-add': return 'Bulk Add';
      default: return taskType;
    }
  }

  getStatusColor(success: number, failed: number): string {
    if (failed === 0) return 'success';
    if (success === 0) return 'danger';
    return 'warning';
  }

  ngOnDestroy(): void {
    clearTimeout(this.scan_timer);
    clearTimeout(this.statusCheckTimer);
    clearTimeout(this.list_update_timer);
    this.modeSub?.unsubscribe();
  }
}
