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
  GuiGridComponent,
  GuiGridApi,
  GuiRowClass,
  GuiSearching,
  GuiSelectedRow,
  GuiInfoPanel,
  GuiColumn,
  GuiColumnMenu,
  GuiPaging,
  GuiPagingDisplay,
  GuiRowSelectionMode,
  GuiRowSelection,
  GuiRowSelectionType,
} from "@generic-ui/ngx-grid";
import { ToasterComponent } from "@coreui/angular";
import { AppToastComponent } from "../toast-simple/toast.component";

interface IUser {
  name: string;
  state: string;
  registered: string;
  country: string;
  usage: number;
  period: string;
  payment: string;
  activity: string;
  avatar: string;
  status: string;
  color: string;
}

@Component({
  templateUrl: "devices.component.html",
})
export class DevicesComponent implements OnInit, OnDestroy {
  public uid: number;
  public uname: string;

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
  @ViewChild("grid", { static: true }) gridComponent: GuiGridComponent;
  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;
  public source: Array<any> = [];
  public columns: Array<GuiColumn> = [];
  public loading: boolean = true;
  public rows: any = [];
  public Selectedrows: any;
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
  toasterForm = {
    autohide: true,
    delay: 3000,
    position: "fixed",
    fade: true,
    closeButton: true,
  };
  rowClass: GuiRowClass = {
    class: "row-highlighted",
  };
  public sorting = {
    enabled: true,
    multiSorting: true,
  };
  public ip_scanner: any;

  searching: GuiSearching = {
    enabled: true,
    placeholder: "Search Devices",
  };

  public paging: GuiPaging = {
    enabled: true,
    page: 1,
    pageSize: 10,
    pageSizes: [5, 10, 25, 50],
    display: GuiPagingDisplay.ADVANCED,
  };

  public columnMenu: GuiColumnMenu = {
    enabled: true,
    sort: true,
    columnsManager: true,
  };

  public infoPanel: GuiInfoPanel = {
    enabled: true,
    infoDialog: false,
    columnsManager: true,
    schemaManager: true,
  };

  public rowSelection: GuiRowSelection = {
    enabled: true,
    type: GuiRowSelectionType.CHECKBOX,
    mode: GuiRowSelectionMode.MULTIPLE,
  };

  ngOnInit(): void {
    this.selected_group = Number(this.route.snapshot.paramMap.get("id"));
    this.initGridTable();
    this.get_groups();
  }

  show_detail(item: any) {
    this.router.navigate(["/device-stats", { id: item.id }]);
  }

  single_device_action(dev: any, action: string) {
    const api: GuiGridApi = this.gridComponent.api;
    api.unselectAll();
    this.Selectedrows = [dev["id"]];
    switch (action) {
      case "edit":
        this.edit_device_form(dev);
        break;
      case "firmware":
        this.check_firmware();
        break;
      case "update":
        this.update_firmware();
        break;
      case "upgrade":
        this.upgrade_firmware();
        break;
      case "logauth":
        this.router.navigate(["/authlog", { devid: dev.id }]);
        break;
      case "logacc":
        this.router.navigate(["/accountlog", { devid: dev.id }]);
        break;
      case "backup":
        this.router.navigate(["/backups", { devid: dev.id }]);
        break;
      case "reboot":
        this.reboot_devices();
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
        if (res.error.indexOf("Unauthorized")) {
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
      _self.show_toast("Success", "Device Deleted", "success");
      this.initGridTable();
    });
  }

  onSelectedRows(rows: Array<GuiSelectedRow>): void {
    this.rows = rows;
    this.Selectedrows = rows.map((m: GuiSelectedRow) => m.source.id);
  }

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
    this.data_provider
      .check_firmware(this.Selectedrows.toString())
      .then((res) => {
        _self.show_toast("info", "Checking Firmwares", "light");
        _self.ConfirmModalVisible = false;
        setTimeout(function () {
          if (_self.Selectedrows.length < 1) _self.initGridTable();
        }, 1);
      });
  }

  update_firmware() {
    var _self = this;
    this.data_provider
      .update_firmware(this.Selectedrows.toString())
      .then((res) => {
        _self.show_toast("info", "Updating Firmwares Sent", "light");
        _self.initGridTable();
      });
  }

  upgrade_firmware() {
    var _self = this;
    this.data_provider
      .upgrade_firmware(this.Selectedrows.toString())
      .then((res) => {
        _self.show_toast("info", "Upgrading Firmwares", "light");
        _self.initGridTable();
      });
  }

  reboot_devices() {
    var _self = this;
    this.data_provider
      .reboot_devices(this.Selectedrows.toString())
      .then((res) => {
        _self.show_toast("info", "Reboot sent", "light");
        _self.ConfirmModalVisible = !_self.ConfirmModalVisible;
        _self.initGridTable();
      });
  }

  get_groups() {
    var _self = this;
    this.data_provider.get_devgroup_list().then((res) => {
      if( "status" in res && res.status == 'failed' )
        _self.groups = false
      else
        _self.groups = res;
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
      _self.source = res.map((x: any) => {
        if (x.upgrade_availble) _self.upgrades.push(x);
        if (x.update_availble) _self.updates.push(x);
        return x;
      });
      _self.device_interval();
      _self.loading = false;
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

  ngOnDestroy(): void {
    clearTimeout(this.scan_timer);
  }
}
