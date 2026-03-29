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
import {
  ToasterComponent
} from "@coreui/angular";
import { Table } from 'primeng/table';
import { AppToastComponent } from "../toast-simple/toast.component";
import { formatInTimeZone } from "date-fns-tz";



@Component({
  templateUrl: "devices.component.html",
})
export class DevicesComponent implements OnInit, OnDestroy {
  public uid!: number;
  public uname!: string;
  public tz!: string;
  public ispro:boolean=false;

  constructor( 
    private data_provider: dataProvider,
    private route: ActivatedRoute,
    private router: Router,
    private login_checker: loginChecker
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
  public columnMapping = { ip: '', username: '', password: '', port: '' };
  public uploadStatus: string = 'Processing devices...';
  public uploadResult = { success: 0, failed: 0, resultFile: null };
  public currentTaskId: string = '';
  public statusCheckTimer: any;

  public selected_rows: any[] = []; // Used by p-table selection
  public Selectedrows: any[] = []; // Legacy ID array used by actions
  public rows: any = []; // For legacy internal use
  
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
  public ip_scanner: any;

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
    this.data_provider.get_editform(dev.id).then((res) => {
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
        this.EditDevModalVisible = true;
      }
    });
  }
  
  save_device() {
    var _self = this;
    this.data_provider
      .save_editform(this.selected_device["editform"])
      .then((res) => {
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
        };
      }
      if (step == 2) {
        _self.scan_type = "";
        if (type == "ip") {
          _self.scan_type = "ip";
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
      if ("error" in res && res.error.indexOf("Unauthorized")) {
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
      _self.data_provider.get_device_pass(this.selected_device['id']).then((res) => {
        if ("error" in res && "error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
        _self.selected_device['editform']['password']=res['password'];
        this.show_pass=!this.show_pass;
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
  }

  closeAddDeviceModal() {
    this.addDeviceModalVisible = false;
    this.resetAddDeviceForm();
  }

  resetAddDeviceForm() {
    this.addDeviceStep = 1;
    this.csvFile = null;
    this.csvData = [];
    this.csvHeaders = [];
    this.csvPreview = [];
    this.columnMapping = { ip: '', username: '', password: '', port: '' };
    this.uploadStatus = 'Processing devices...';
    this.uploadResult = { success: 0, failed: 0, resultFile: null };
    this.currentTaskId = '';
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

  isValidMapping(): boolean {
    return this.columnMapping.ip !== '' && 
           this.columnMapping.username !== '' && 
           this.columnMapping.password !== '' && 
           this.columnMapping.port !== '' &&
           this.csvData.length > 0;
  }

  uploadDevices() {
    if (!this.isValidMapping()) return;
    
    this.addDeviceStep = 2;
    
    const devices = this.csvData.map(row => ({
      ip: row[parseInt(this.columnMapping.ip)],
      username: row[parseInt(this.columnMapping.username)],
      password: row[parseInt(this.columnMapping.password)],
      port: row[parseInt(this.columnMapping.port)]
    }));

    this.data_provider.bulk_add_devices(devices).then((res) => {
      if ('error' in res) {
        this.addDeviceStep = 3;
        this.show_toast('Error', 'Failed to start device upload', 'danger');
        this.uploadResult = { success: 0, failed: devices.length, resultFile: null };
      } else if ('taskId' in res) {
        this.currentTaskId = res.taskId;
        this.uploadStatus = 'Processing devices...';
        this.checkUploadStatus();
      } else {
        this.addDeviceStep = 3;
        this.show_toast('Error', 'Invalid response from server', 'danger');
        this.uploadResult = { success: 0, failed: devices.length, resultFile: null };
      }
    }).catch(() => {
      this.addDeviceStep = 3;
      this.uploadResult = { success: 0, failed: devices.length, resultFile: null };
      this.show_toast('Error', 'Failed to upload devices', 'danger');
    });
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
