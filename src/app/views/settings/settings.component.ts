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
  
  // Alerts settings state
  public alertCatalog: any[] = [];
  public alertGlobalConfig: any = {};
  public alertEnabledIds: string[] = [];
  public alertGlobalEnabled: boolean = false;
  
  // Speed Test Server state
  public newServer: any = {
    name: '',
    host: '',
    api_port: '8200',
    btest_port: '2000',
    token: '',
    is_local: false
  };

  // OpenRouter model selection state
  public openrouterModels: any[] = [];
  public openrouterModelsLoading: boolean = false;
  public openrouterModelsError: string = '';
  public openrouterModelSearch: string = '';
  public openrouterModelSearch2: string = '';
  public openrouterModelSearch3: string = '';
  public showOpenrouterDropdown: boolean[] = [false, false, false];
  public filteredOpenrouterModels: any[] = [];

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
    this.loadAlertSettings();
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

  onProviderChange(newProvider: string): void {
    if (!this.sysconfigs || !this.sysconfigs['ai_model']) return;
    
    // Set sensible defaults when switching providers so the user knows what to type
    // and so old provider models don't bleed into the new one causing errors
    const defaults: {[key: string]: string} = {
      'gemini': 'gemini-2.5-flash',
      'openai': 'gpt-4o-mini',
      'anthropic': 'claude-3-5-sonnet-20241022',
      'deepseek': 'deepseek-chat',
      'openrouter': ''
    };
    
    if (newProvider in defaults) {
      this.sysconfigs['ai_model']['value'] = defaults[newProvider];
    }
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

      // Initialize AI configurations
      const aiKeys = ['ai_provider', 'ai_api_key', 'ai_model', 'ai_system_instruction', 'ai_openrouter_mode', 'ai_openrouter_models'];
      aiKeys.forEach(k => {
        if (!(k in _self.sysconfigs) || !_self.sysconfigs[k] || typeof _self.sysconfigs[k] !== 'object') {
          if (k === 'ai_provider') _self.sysconfigs[k] = { value: 'gemini' };
          else if (k === 'ai_openrouter_mode') _self.sysconfigs[k] = { value: 'auto' };
          else if (k === 'ai_openrouter_models') _self.sysconfigs[k] = { value: ['', '', ''] };
          else _self.sysconfigs[k] = { value: '' };
        } else if (!('value' in _self.sysconfigs[k])) {
          if (k === 'ai_provider') _self.sysconfigs[k]['value'] = 'gemini';
          else if (k === 'ai_openrouter_mode') _self.sysconfigs[k]['value'] = 'auto';
          else if (k === 'ai_openrouter_models') _self.sysconfigs[k]['value'] = ['', '', ''];
          else _self.sysconfigs[k]['value'] = '';
        } else if (k === 'ai_provider' && !_self.sysconfigs[k]['value']) {
          _self.sysconfigs[k]['value'] = 'gemini';
        } else if (k === 'ai_openrouter_mode' && !_self.sysconfigs[k]['value']) {
          _self.sysconfigs[k]['value'] = 'auto';
        } else if (k === 'ai_openrouter_models') {
          // Parse stored JSON string into array of 3 slots
          let models: string[] = ['', '', ''];
          try {
            const parsed = typeof _self.sysconfigs[k]['value'] === 'string'
              ? JSON.parse(_self.sysconfigs[k]['value'])
              : _self.sysconfigs[k]['value'];
            if (Array.isArray(parsed)) {
              for (let i = 0; i < 3; i++) models[i] = parsed[i] || '';
            }
          } catch (e) {}
          _self.sysconfigs[k]['value'] = models;
        }
      });
      _self.sysconfigs['ai_api_key']['value'] = ""; // Clear API key on load for input security

      // Initialize SMTP configurations
      const smtpKeys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from'];
      smtpKeys.forEach(k => {
        if (!(k in _self.sysconfigs)) {
          _self.sysconfigs[k] = { value: k === 'smtp_port' ? '587' : (k === 'smtp_from' ? 'noreply@mikrowizard.com' : '') };
        }
      });
      _self.sysconfigs['smtp_password']['value'] = ""; // Clear SMTP password on load for input security

      if (!('smtp_security' in _self.sysconfigs)) {
        _self.sysconfigs['smtp_security'] = { value: 'starttls' };
      } else {
        const val = _self.sysconfigs['smtp_security']['value'];
        if (typeof val === 'boolean') {
          _self.sysconfigs['smtp_security']['value'] = val ? 'starttls' : 'none';
        } else if (val && ['none', 'starttls', 'ssl_tls'].indexOf(val) === -1) {
          _self.sysconfigs['smtp_security']['value'] = /true/i.test(val) ? 'starttls' : 'none';
        }
      }

      if (!('smtp_enable_admin_reset' in _self.sysconfigs)) {
        _self.sysconfigs['smtp_enable_admin_reset'] = { value: false };
      } else {
        _self.sysconfigs['smtp_enable_admin_reset']['value'] = /true/i.test(_self.sysconfigs['smtp_enable_admin_reset']['value']);
      }

      // Initialize Speed Test configurations
      if (!('speedtest_servers' in _self.sysconfigs) || !_self.sysconfigs['speedtest_servers']) {
        _self.sysconfigs['speedtest_servers'] = { value: [] };
      } else {
        try {
          const parsed = typeof _self.sysconfigs['speedtest_servers']['value'] === 'string'
            ? JSON.parse(_self.sysconfigs['speedtest_servers']['value'])
            : _self.sysconfigs['speedtest_servers']['value'];
          _self.sysconfigs['speedtest_servers']['value'] = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          _self.sysconfigs['speedtest_servers']['value'] = [];
        }
      }

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

  public smtpTestModalVisible: boolean = false;
  public smtpTestStep: number = 1;
  public smtpTestStatus: string = 'idle';
  public smtpTestMessage: string = '';
  public smtpTestLog: any[] = [];
  public testRecipientEmail: string = 'admin@localhost';

  openSmtpTestModal(): void {
    this.smtpTestStep = 1;
    this.smtpTestStatus = 'idle';
    this.smtpTestMessage = '';
    this.smtpTestModalVisible = true;
  }

  closeSmtpTestModal(): void {
    this.smtpTestModalVisible = false;
  }

  runSmtpTest(): void {
    var _self = this;
    this.smtpTestStep = 2;
    this.smtpTestStatus = 'sending';
    this.smtpTestMessage = '';

    const payload = {
      recipient: this.testRecipientEmail,
      host: this.sysconfigs['smtp_host']['value'] || '',
      port: this.sysconfigs['smtp_port']['value'] || '587',
      user: this.sysconfigs['smtp_user']['value'] || '',
      password: this.sysconfigs['smtp_password']['value'] || '',
      security: this.sysconfigs['smtp_security']['value'] || 'starttls',
      from_email: this.sysconfigs['smtp_from']['value'] || '',
    };

    this.data_provider.adminSendSmtpTest(payload).then((res: any) => {
      _self.smtpTestStep = 3;
      _self.smtpTestLog = res['log'] || [];
      if (res['status'] === 'success') {
        _self.smtpTestStatus = 'success';
        _self.smtpTestMessage = res['message'] || 'Test email sent successfully!';
      } else {
        _self.smtpTestStatus = 'error';
        _self.smtpTestMessage = res['err'] || 'Failed to send test email.';
      }
    }).catch(() => {
      _self.smtpTestStep = 3;
      _self.smtpTestStatus = 'error';
      _self.smtpTestMessage = 'Connection error with server.';
      _self.smtpTestLog = [];
    });
  }

  retrySmtpTest(): void {
    this.smtpTestStep = 1;
    this.smtpTestStatus = 'idle';
    this.smtpTestMessage = '';
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

  // OpenRouter model management
  fetchOpenRouterModels(): void {
    this._self_ref = this;
    this.openrouterModelsLoading = true;
    this.openrouterModelsError = '';
    this.data_provider.getOpenRouterModels().then((res: any) => {
      this.openrouterModelsLoading = false;
      const data = res.result || res;
      if (data && data.models) {
        this.openrouterModels = data.models;
        this.filteredOpenrouterModels = data.models;
      } else if (data && data.error) {
        this.openrouterModelsError = data.error;
      }
    }).catch((err: any) => {
      this.openrouterModelsLoading = false;
      this.openrouterModelsError = 'Failed to fetch models. Please check your API key and network.';
    });
  }

  filterOpenrouterModels(event: any, slot: number): void {
    const term = (event.target.value || '').toLowerCase();
    if (slot === 0) this.openrouterModelSearch = term;
    else if (slot === 1) this.openrouterModelSearch2 = term;
    else this.openrouterModelSearch3 = term;

    if (term.length === 0) {
      this.filteredOpenrouterModels = this.openrouterModels;
    } else {
      this.filteredOpenrouterModels = this.openrouterModels.filter((m: any) =>
        m.name.toLowerCase().includes(term) || m.id.toLowerCase().includes(term)
      );
    }
    const drops = [...this.showOpenrouterDropdown];
    drops[slot] = true;
    this.showOpenrouterDropdown = drops;
  }

  selectOpenrouterModel(model: any, slot: number): void {
    if (!this.sysconfigs['ai_openrouter_models']) {
      this.sysconfigs['ai_openrouter_models'] = { value: ['', '', ''] };
    }
    const arr = [...(this.sysconfigs['ai_openrouter_models']['value'] || ['', '', ''])];
    arr[slot] = model.id;
    this.sysconfigs['ai_openrouter_models']['value'] = arr;

    if (slot === 0) this.openrouterModelSearch = model.name;
    else if (slot === 1) this.openrouterModelSearch2 = model.name;
    else this.openrouterModelSearch3 = model.name;

    const drops = [...this.showOpenrouterDropdown];
    drops[slot] = false;
    this.showOpenrouterDropdown = drops;
    this.filteredOpenrouterModels = this.openrouterModels;
  }

  hideOpenrouterDropdown(slot: number): void {
    setTimeout(() => {
      const drops = [...this.showOpenrouterDropdown];
      drops[slot] = false;
      this.showOpenrouterDropdown = drops;
    }, 220);
  }

  getOpenrouterModelName(id: string): string {
    const m = this.openrouterModels.find((x: any) => x.id === id);
    return m ? m.name : id;
  }

  addSpeedtestServer() {
    if (!this.newServer.name || !this.newServer.host) {
      this.show_toast("Speed Test Server", "Name and IP/Host are required", "warning");
      return;
    }
    if (!this.sysconfigs['speedtest_servers']) {
      this.sysconfigs['speedtest_servers'] = { value: [] };
    }
    const currentList = this.sysconfigs['speedtest_servers']['value'] || [];
    currentList.push({
      name: this.newServer.name,
      host: this.newServer.host,
      api_port: this.newServer.api_port || '8200',
      btest_port: this.newServer.btest_port || '2000',
      token: this.newServer.token || '',
      is_local: !!this.newServer.is_local
    });
    this.sysconfigs['speedtest_servers']['value'] = currentList;
    this.newServer = { name: '', host: '', api_port: '8200', btest_port: '2000', token: '', is_local: false };
    this.show_toast("Speed Test Server", "Server added. Don't forget to click Save System Settings.", "info");
  }

  deleteSpeedtestServer(index: number) {
    if (!this.sysconfigs['speedtest_servers'] || !this.sysconfigs['speedtest_servers']['value']) {
      return;
    }
    this.sysconfigs['speedtest_servers']['value'].splice(index, 1);
    this.show_toast("Speed Test Server", "Server removed. Don't forget to click Save System Settings.", "info");
  }

  // ---- Alert Channels Setup ----

  loadAlertSettings() {
    this.data_provider.alerts_services().then((res: any) => {
      this.alertCatalog = res.catalog || [];
      this.alertEnabledIds = res.enabled_ids || [];
      this.alertGlobalConfig = res.global_config || {};
      this.alertGlobalEnabled = res.global_enabled || false;
    }).catch(() => {});
  }

  toggleService(svcId: string, event: any) {
    if (event.target.checked) {
      if (!this.alertEnabledIds.includes(svcId)) this.alertEnabledIds.push(svcId);
    } else {
      this.alertEnabledIds = this.alertEnabledIds.filter(id => id !== svcId);
    }
  }

  getGlobalField(svcId: string, fieldKey: string): string {
    return this.alertGlobalConfig[svcId]?.[fieldKey] || '';
  }

  setGlobalField(svcId: string, fieldKey: string, value: string) {
    if (!this.alertGlobalConfig[svcId]) this.alertGlobalConfig[svcId] = {};
    this.alertGlobalConfig[svcId][fieldKey] = value;
  }

  getGlobalFieldsCount(svc: any): number {
    if (!svc || !svc.fields) return 0;
    return svc.fields.filter((f: any) => f.is_global).length;
  }

  getUserFieldsCount(svc: any): number {
    if (!svc || !svc.fields) return 0;
    return svc.fields.filter((f: any) => !f.is_global).length;
  }

  saveAlertSettings() {
    this.SysConfigloading = true;
    this.data_provider.alerts_settings_save({
      enabled_ids: this.alertEnabledIds,
      global_config: this.alertGlobalConfig,
      global_enabled: this.alertGlobalEnabled
    }).then(() => {
      this.SysConfigloading = false;
      this.show_toast('Alert Settings', 'Alert settings saved successfully', 'success');
      this.loadAlertSettings(); // refresh to get updated 'global_configured' flags
    }).catch((e: any) => {
      this.SysConfigloading = false;
      this.show_toast('Alert Settings', 'Failed to save: ' + e, 'danger');
    });
  }

  private _self_ref: any = null;
}
