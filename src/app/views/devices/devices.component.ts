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



@Component({
  templateUrl: "devices.component.html",
  styleUrls: ["devices.component.scss"],
})
export class DevicesComponent implements OnInit, OnDestroy {
  public uid!: number;
  public uname!: string;
  public tz!: string;
  public ispro:boolean=false;
  public deviceTab: string = 'mikrotik';
  public get displayDevices(): any[] {
    if (!this.source || !Array.isArray(this.source)) return [];
    return this.source.filter((d: any) => d.device_type === 'mikrotik' || !d.device_type);
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
    private licenseService: LicenseService
  ) {
    var _self = this;
    if (!this.login_checker.isLoggedIn()) {
      setTimeout(function () {
        _self.router.navigate(["login"]);
      }, 100);
    }
    this.data_provider.getSessionInfo().then((res) => {
      _self.uid = res.uid;
      _self.uname = res.name;
      _self.tz = res.tz;
      _self.ispro = res.ISPRO;
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
  public ip_scanner: any = {
    start: "",
    end: "",
    port: "",
    user: "",
    password: "",
    ssl: false,
  };

  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
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
    this.Selectedrows = value.map(item => item.id);
    this.rows = value; // For legacy compat if needed
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
    switch (action) {
      case "edit":
        this.edit_device_form(dev);
        break;
      case "firmware":
        this.check_firmware();
        break;
      case "update":
        this.ConfirmAction = "update";
        this.ConfirmModalVisible = true;
        break;
      case "upgrade":
        this.ConfirmAction = "upgrade";
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

  edit_device_form(dev: any) {
    var _self = this;
    this.selected_device = dev;
    
    let method = this.ispro ? this.data_provider.get_editform_pro(dev.id) : this.data_provider.get_editform(dev.id);
    method.then((res) => {
      if ("error" in res) {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
      } else {
        this.selected_device["editform"] = res;
        const types = res["connection_types"] || [];
        res["mikrotik_protocol"] = types.includes("ssh") ? "ssh" : (types.includes("telnet") ? "telnet" : "ssh");
        res["mikrotik_webfig"] = types.includes("webfig");
        res["connection_port"] = res["connection_port"] || (res["mikrotik_protocol"] === "telnet" ? 23 : 22);
        this.EditDevModalVisible = true;
      }
    });
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
        this.EditDevModalVisible = false;
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
    const query = event.target.value.toLowerCase();
    this.filteredGroupSearch = this.groups.filter((g: any) =>
      g.name.toLowerCase().includes(query)
    );
  }

  selectGroupSearch(group: any): void {
    this.selected_group = group.id;
    this.groupFilterSearch = group.id === 0 ? '' : group.name;
    this.showGroupSearchDropdown = false;
    if (this.selected_group != 0) {
      this.router.navigate([".", { id: this.selected_group }]);
    }
    this.initGridTable();
  }

  hideGroupSearchDropdown(): void {
    setTimeout(() => this.showGroupSearchDropdown = false, 200);
  }

  delete_device() {
    var _self = this;
    this.ConfirmModalVisible = false;
    this.data_provider.delete_devices(this.Selectedrows).then((res) => {
      if ("error" in res && res.error.indexOf("Unauthorized")) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else{
      _self.show_toast("Success", "Device Deleted", "success");
      this.initGridTable();
      }
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
    this.data_provider
      .check_firmware(this.Selectedrows.toString())
      .then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
        _self.show_toast("info", "Checking Firmwares", "light");
        _self.ConfirmModalVisible = false;
        setTimeout(function () {
          if (_self.Selectedrows.length < 1) _self.initGridTable();
        }, 1);
      }
      });
  }

  update_firmware() {
    var _self = this;
    this.ConfirmModalVisible = false;
    this.data_provider
      .update_firmware(this.Selectedrows.toString())
      .then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
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
        _self.initGridTable();}
      });
  }

  upgrade_firmware() {
    var _self = this;
    this.ConfirmModalVisible = false;
    this.data_provider
      .upgrade_firmware(this.Selectedrows.toString())
      .then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
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
    this.data_provider
      .reboot_devices(this.Selectedrows.toString())
      .then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
        _self.show_toast("info", "Reboot sent", "light");
        _self.ConfirmModalVisible = !_self.ConfirmModalVisible;
        _self.initGridTable();
        }
      });
  }

  get_groups() {
    var _self = this;
    this.data_provider.get_devgroup_list().then((res) => {
      if ("error" in res && res.error.indexOf("Unauthorized")) {
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

  initGridTable(): void {
    var _self = this;
    _self.upgrades = [];
    _self.updates = [];
    clearTimeout(this.list_update_timer);
    var data = {
      group_id: this.selected_group,
      search: false,
    };

    _self.data_provider.get_dev_list(data).then((res) => {
      if ("error" in res && res.error.indexOf("Unauthorized")) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else{
      _self.originalSource = res.map((x: any) => {
        if (x.upgrade_availble) _self.upgrades.push(x);
        if (x.update_availble) _self.updates.push(x);
        return x;
      });
      _self.source = [..._self.originalSource];
      _self.device_interval();
      _self.loading = false;
    }
    });
  }

  device_interval() {
    var _self = this;
    var data = {
      group_id: this.selected_group,
      search: false,
    };
    clearTimeout(this.list_update_timer);
    _self.list_update_timer = setTimeout(function () {
      // 	_self.data_provider.get_dev_list(data).then(res => {
      // 		_self.source =res.map( (x:any) => {
      // 			if(x.upgrade_availble)
      // 				_self.upgrades.push(x);
      // 			if(x.update_availble)
      // 				_self.updates.push(x);
      // 			return x;
      // 		});
      // 		// _self.device_interval()
      // 		_self.loading = false;
      // });
      //we don't want to reload table if user is selected devices from list
      if (_self.Selectedrows && _self.Selectedrows.length < 1) _self.initGridTable();
    }, 10000);
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
      if ("error" in res && res.error.indexOf("Unauthorized")) {
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

  filterUpdatable() {
    this.source = this.originalSource.filter(device => device.update_availble);
  }

  filterUpgradable() {
    this.source = this.originalSource.filter(device => device.upgrade_availble);
  }

  clearFilter() {
    this.source = [...this.originalSource];
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
    if (this.currentDeviceInfo?.id) {
      window.open(`/api/proxy/init?devid=${this.currentDeviceInfo.id}`, '_blank');
    } else {
      const ip = this.currentDeviceInfo?.ip;
      if (ip) {
        window.open(`/api/proxy/init?dev_ip=${ip}`, '_blank');
      }
    }
    this.showWebAccessModal = false;
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

  openAddDeviceModal() {
    this.addDeviceModalVisible = true;
    this.resetAddDeviceForm();
    this.loadBrandsAndTemplates();
  }

  loadBrandsAndTemplates() {
    this.data_provider.listBrands().then((res: any) => {
      const data = Array.isArray(res) ? res : (res.data || res || []);
      this.availableBrands = data.filter((b: any) => b.brand !== 'mikrotik');
    });
    this.data_provider.listTemplates({}).then((res: any) => {
      const data = (res.data || res || []);
      this.availableTemplates = data.map((t: any) => {
        const conn = t.connection || {};
        return {
          id: t.id,
          brand: t.brand,
          display_name: t.display_name,
          os_type: t.os_type,
          protocols: conn.protocols || [],
          has_enable: !!t.privilege_escalation,
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
  }
}
