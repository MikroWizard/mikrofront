import {
  Component,
  OnInit,
  QueryList,
  ViewChildren,
  ViewEncapsulation,
} from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import {
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
import { TimeZones } from "./timezones-data";

@Component({
  templateUrl: "settings.component.html",
  styleUrls: ["settings.component.scss"],
  encapsulation: ViewEncapsulation.None,
})

export class SettingsComponent implements OnInit {
  public uid: number;
  public uname: string;
  public ispro:boolean=false;
  public filterText: string;
  public filters: any = {};
  public firms: any = {};
  public firmtodownload: any = {};
  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private TimeZones: TimeZones,
    private login_checker: loginChecker
  ) {
    var _self = this;
    if (!this.login_checker.isLoggedIn()) {
      setTimeout(function() {
      		_self.router.navigate(['login']);
      	}, 100);
    }
    this.data_provider.getSessionInfo().then((res) => {
      _self.uid = res.uid;
      _self.uname = res.name;
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

  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

  public source: Array<any> = [];
  public columns: Array<GuiColumn> = [];
  public loading: boolean = true;
  public SysConfigloading: boolean = true;

  public ConfirmModalVisible: boolean = false;
  public rows: any = [];
  public Selectedrows: any;
  public updateBehavior: string = "keep";
  public firmwaretoinstall: string = "none";
  public firmwaretoinstallv6: string = "none";
  public available_firmwares: any = [];
  public available_firmwaresv6: any = [];
  public sysconfigs: any = [];

  toasterForm = {
    autohide: true,
    delay: 3000,
    position: "fixed",
    fade: true,
    closeButton: true,
  };

  public sorting = {
    enabled: true,
    multiSorting: true,
  };

  public paging: GuiPaging = {
    enabled: true,
    page: 1,
    pageSize: 5,
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

  public rowSelection: boolean | GuiRowSelection = {
    enabled: true,
    type: GuiRowSelectionType.CHECKBOX,
    mode: GuiRowSelectionMode.MULTIPLE,
  };
  public timezones = this.TimeZones.timezones;

  ngOnInit(): void {
    this.initAvailbleFirms();
    this.initFirmsTable();
    this.initsettings();
  }

  start_download() {
    var _self = this;
    this.loading = true;
    this.data_provider
      .download_firmware_to_repository(this.firmtodownload)
      .then((res) => {
        if (res.status == true) {
          // show toast that we are already downloading
          _self.show_toast(
            "Firmware Download",
            "Firmware download in progress",
            "warning"
          );
        } else {
          // show toast that download started
          _self.show_toast(
            "Firmware Download",
            "Firmware download started",
            "success"
          );
        }
        _self.ConfirmModalVisible = !_self.ConfirmModalVisible;
        _self.loading = false;
      });
  }

  onSelectedRows(rows: Array<GuiSelectedRow>): void {
    this.rows = rows;
    this.Selectedrows = rows.map((m: GuiSelectedRow) => m.source.id);
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

  saveFirmwareSetting() {
    var _self = this;
    this.data_provider
      .save_firmware_setting(
        this.updateBehavior,
        this.firmwaretoinstall,
        this.firmwaretoinstallv6
      )
      .then((res) => {
        _self.initFirmsTable();
      });
  }

  saveSysSetting() {
    var _self = this;
    this.data_provider.save_sys_setting(this.sysconfigs).then((res) => {
      _self.initsettings();
    });
  }

  initFirmsTable(): void {
    var _self = this;
    this.data_provider.get_firms(0, 10000, false).then((res) => {
      let index = 1;
      _self.source = res.firms;
      _self.available_firmwares = [
        ...new Set(
          res["firms"].map((x: any) => {
            return x.version;
          })
        ),
      ];
      _self.available_firmwaresv6 = [
        ...new Set(
          res["firms"].map((x: any) => {
            return x.version;
          })
        ),
      ].filter((x: any) => x.match(/^6\./g));
      _self.firmwaretoinstall = res.firmwaretoinstall;
      _self.firmwaretoinstallv6 = res.firmwaretoinstallv6;
      _self.updateBehavior = res.updateBehavior;

    });
  }

  initsettings(): void {
    var _self = this;
    this.data_provider.get_settings().then((res) => {
      _self.sysconfigs = res.sysconfigs;
      _self.sysconfigs["default_user"]["value"] = "";
      _self.sysconfigs["default_password"]["value"] = "";
      _self.timezones = _self.TimeZones.timezones;
      _self.sysconfigs["force_syslog"]["value"] = /true/i.test(
        _self.sysconfigs["force_syslog"]["value"]
      );
      _self.sysconfigs["force_radius"]["value"] = /true/i.test(
        _self.sysconfigs["force_radius"]["value"]
      );
      _self.sysconfigs["force_perms"]["value"] = /true/i.test(
        _self.sysconfigs["force_perms"]["value"]
      );
      _self.sysconfigs["safe_install"]["value"] = /true/i.test(
        _self.sysconfigs["safe_install"]["value"]
      );
      _self.SysConfigloading = false;
    });
  }

  initAvailbleFirms(): void {
    var _self = this;
    this.data_provider.get_downloadable_firms().then((res) => {
      let index = 1;
      _self.firms = res.versions;
      _self.loading = false;
    });
  }
}
