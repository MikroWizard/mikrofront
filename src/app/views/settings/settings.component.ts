import {
  Component,
  OnInit,
  QueryList,
  ViewChildren,
  ViewEncapsulation,
  ViewChild
} from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { ToasterComponent } from "@coreui/angular";
import { AppToastComponent } from "../toast-simple/toast.component";
import { TimeZones } from "./timezones-data";

@Component({
  templateUrl: "settings.component.html",
  styleUrls: ["settings.component.scss"],
  encapsulation: ViewEncapsulation.None,
})

export class SettingsComponent implements OnInit {
  public uid: number = 0;
  public uname: string = '';
  public ispro:boolean=false;
  public filterText: string = '';
  public filters: any = {};
  public firms: any = {};
  public firmtodownload: any = {};
  public activeTab: string = 'firmware';

  @ViewChild('dt') dt!: Table;
  
  // Search functionality properties
  public firmwareSearch: string = '';
  public showFirmwareDropdown: boolean = false;
  public filteredFirmwares: any[] = [];
  
  public timezoneSearch: string = '';
  public showTimezoneDropdown: boolean = false;
  public filteredTimezones: any[] = [];
  
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
  public loading: boolean = true;
  public SysConfigloading: boolean = true;

  public ConfirmModalVisible: boolean = false;
  public DeleteConfirmModalVisible: boolean = false;
  public rows: any = [];
  public Selectedrows: any;
  public updateBehavior: string = "keep";
  public firmwaretoinstall: string = "none";
  public firmwaretoinstallv6: string = "none";
  public available_firmwares: any = [];
  public available_firmwaresv6: any = [];
  public sysconfigs: any = [];
  public currentFirm:any = [];
  toasterForm = {
    autohide: true,
    delay: 3000,
    position: "fixed",
    fade: true,
    closeButton: true,
  };

  applyFilterGlobal($event: any, stringVal: string) {
    this.dt.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }
  public timezones = this.TimeZones.timezones;

  ngOnInit(): void {
    this.initAvailbleFirms();
    this.initFirmsTable();
    this.initsettings();
  }
  delete_fimrware(firm:any,del:boolean=false) {
    var _self = this;
    _self.currentFirm=firm;
    if(del){
      this.data_provider.delete_firm(this.currentFirm.id).then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
        if (res.status == true){
          _self.DeleteConfirmModalVisible=false;
          _self.initFirmsTable();
        }
        else if ('err' in res){
          _self.show_toast(
            "Firmware Delete",
            res.err,
            "danger"
          );
        }
      }
      });
    }
    else
      _self.DeleteConfirmModalVisible=true;

  }
  start_download() {
    var _self = this;
    this.loading = true;
    this.data_provider
      .download_firmware_to_repository(this.firmtodownload)
      .then((res) => {
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
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
      }
      });
  }

  onSelectedRows(rows: any[]): void {
    this.rows = rows;
    this.Selectedrows = rows.map((m: any) => m.id);
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
        if ("error" in res && res.error.indexOf("Unauthorized")) {
          _self.show_toast(
            "Error",
            "You are not authorized to perform this action",
            "danger"
          );
        }
        else{
        _self.initFirmsTable();
        }
      });
  }

  saveSysSetting() {
    var _self = this;
    this.data_provider.save_sys_setting(this.sysconfigs).then((res) => {
      if ("error" in res && res.error.indexOf("Unauthorized")) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else{
        _self.show_toast("Settings", "Settings saved", "success");
        _self.initsettings();

      }
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
      if ("error" in res && res.error.indexOf("Unauthorized")) {
        _self.show_toast(
          "Error",
          "You are not authorized to perform this action",
          "danger"
        );
      }
      else{
      _self.sysconfigs = res.sysconfigs;
      _self.sysconfigs["default_user"]["value"] = "";
      _self.sysconfigs["default_password"]["value"] = "";
      _self.timezones = _self.TimeZones.timezones;
      _self.filteredTimezones = _self.TimeZones.timezones;
      // Set initial timezone search display
      const currentTz = _self.timezones.find((tz: any) => tz.utc[0] === _self.sysconfigs['timezone']['value']);
      if (currentTz) {
        _self.timezoneSearch = currentTz.text;
      }
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
      if(_self.ispro){
        _self.sysconfigs["otp_force"]["value"] = /true/i.test(
          _self.sysconfigs["otp_force"]["value"]
        );
      }
      if(_self.ispro && "proxy_auto_login" in _self.sysconfigs){
        _self.sysconfigs["proxy_auto_login"]["value"] = /true/i.test(
          _self.sysconfigs["proxy_auto_login"]["value"]
        );
      }
      else if(_self.ispro){
        _self.sysconfigs["proxy_auto_login"] = {
          "value": true
        }
      }
      //check if update_mode is in the sysconfigs
      if ("update_mode" in _self.sysconfigs){
        //convert string to json
        _self.sysconfigs["update_mode"]["value"] = JSON.parse(_self.sysconfigs["update_mode"]["value"]);
      }
      else{
        //create default update_mode and set mode to auto
        _self.sysconfigs["update_mode"] = {
          "value": {
            "mode": "auto",
            "update_back" : false,
            "update_front" : false
          }
        }
      }
      _self.SysConfigloading = false;
    }
    });
  }

  initAvailbleFirms(): void {
    var _self = this;
    this.data_provider.get_downloadable_firms().then((res) => {
      let index = 1;
      _self.firms = res.versions;
      _self.filteredFirmwares = res.versions;
      _self.loading = false;
    });
  }

  // Firmware search methods
  filterFirmwares(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    this.firmwareSearch = searchTerm;
    this.filteredFirmwares = this.firms.filter((firm: string) => 
      firm.toLowerCase().includes(searchTerm)
    );
  }

  selectFirmware(firmware: string): void {
    this.firmtodownload = firmware;
    this.firmwareSearch = firmware;
    this.showFirmwareDropdown = false;
  }

  hideFirmwareDropdown(): void {
    setTimeout(() => {
      this.showFirmwareDropdown = false;
    }, 200);
  }

  // Timezone search methods
  filterTimezones(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    this.timezoneSearch = searchTerm;
    this.filteredTimezones = this.timezones.filter((tz: any) => 
      tz.text.toLowerCase().includes(searchTerm)
    );
  }

  selectTimezone(timezone: any): void {
    this.sysconfigs['timezone']['value'] = timezone.utc[0];
    this.timezoneSearch = timezone.text;
    this.showTimezoneDropdown = false;
  }

  hideTimezoneDropdown(): void {
    setTimeout(() => {
      this.showTimezoneDropdown = false;
    }, 200);
  }
}
