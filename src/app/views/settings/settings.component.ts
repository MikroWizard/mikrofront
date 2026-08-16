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
import { LicenseService } from "../../providers/license.service";
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
  public licenseRefreshing: boolean = false;
  public filterText: string = '';
  public filters: any = {};
  public firms: any = {};
  public firmtodownload: any = {};
  public activeTab: string = 'firmware';

  @ViewChild('dt') dt!: Table;

  // SSL/TLS state
  public sslLoading: boolean = false;
  public sslPollingInterval: any = null;
  public sslStatus: any = null;
  public sslActionInProgress: boolean = false;
  public sslWarmingUp: boolean = false;
  private sslWarmupRetries: number = 0;

  public leDomains: string[] = [''];
  public leEmail: string = '';
  public leMethod: string = 'http';
  public leDnsProvider: string = 'cloudflare';
  public leDnsToken: string = '';

  public leDnsManualRecords: any[] = [];

  public manualCertPem: string = '';
  public manualKeyPem: string = '';
  public manualChainPem: string = '';

  public csrDomain: string = '';
  public csrCountry: string = '';
  public csrState: string = '';
  public csrCity: string = '';
  public csrOrg: string = '';
  public csrEmail: string = '';
  public csrKeySize: string = '2048';
  public csrOutput: string = '';

  public sslErrorModalVisible: boolean = false;
  public sslErrorTitle: string = '';
  public sslErrorOutput: string = '';

  public leDeleteModalVisible: boolean = false;
  public disableHttpsModalVisible: boolean = false;
  public forceSslEnabled: boolean = false;
  
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
    private login_checker: loginChecker,
    private licenseService: LicenseService
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

  refreshLicense() {
    var _self = this;
    this.licenseRefreshing = true;
    this.data_provider.refreshLicense().then((res: any) => {
      _self.licenseRefreshing = false;
      if (res && res.status === 'success') {
        _self.show_toast(
          "License",
          res.downloaded ? "License downloaded and updated successfully" : "License refreshed successfully",
          "success"
        );
        if (res.license) {
          _self.licenseService.setLicenseState(res.license);
        }
      } else {
        _self.show_toast("License", (res && res.err) || "License refresh failed", "danger");
      }
    }).catch((err: any) => {
      _self.licenseRefreshing = false;
      _self.show_toast("License", (err && (err.err || err.error)) || "License refresh failed", "danger");
    });
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

  providerModelPresets: { [key: string]: { id: string; name: string }[] } = {
    'gemini': [
      { id: 'gemini-3.7-flash', name: '⚡ Gemini 3.7 Flash (Recommended)' },
      { id: 'gemini-3.1-pro', name: '🧠 Gemini 3.1 Pro (Flagship Reasoning)' },
      { id: 'gemini-2.5-flash', name: '⚡ Gemini 2.5 Flash (Fast Multimodal)' },
      { id: 'gemini-2.0-flash', name: '⚡ Gemini 2.0 Flash (Legacy Fast)' },
      { id: 'gemini-1.5-pro', name: '📊 Gemini 1.5 Pro (Legacy Pro)' },
    ],
    'openai': [
      { id: 'gpt-4o-mini', name: '⚡ GPT-4o-mini (Recommended - Fast)' },
      { id: 'gpt-4o', name: '🧠 GPT-4o (Flagship Multimodal)' },
      { id: 'o3-mini', name: '🔬 o3-mini (High-Speed Reasoning)' },
      { id: 'o1', name: '🔬 o1 (Deep Reasoning)' },
    ],
    'anthropic': [
      { id: 'claude-3-7-sonnet-20250219', name: '⚡ Claude 3.7 Sonnet (Recommended)' },
      { id: 'claude-3-5-haiku-20241022', name: '⚡ Claude 3.5 Haiku (Fast)' },
      { id: 'claude-3-5-sonnet-20241022', name: '🧠 Claude 3.5 Sonnet (Previous Flagship)' },
    ],
    'deepseek': [
      { id: 'deepseek-chat', name: '⚡ DeepSeek-V3 Chat (Recommended)' },
      { id: 'deepseek-reasoner', name: '🔬 DeepSeek-R1 (Deep Reasoning)' },
    ]
  };

  onProviderChange(newProvider: string): void {
    if (!this.sysconfigs || !this.sysconfigs['ai_model']) return;
    
    const defaults: {[key: string]: string} = {
      'gemini': 'gemini-3.7-flash',
      'openai': 'gpt-4o-mini',
      'anthropic': 'claude-3-7-sonnet-20250219',
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
      const aiKeys = ['ai_provider', 'ai_api_key', 'ai_model', 'ai_system_instruction', 'ai_reasoning_effort', 'ai_temperature', 'ai_max_tokens', 'ai_openrouter_mode', 'ai_openrouter_models'];
      aiKeys.forEach(k => {
        if (!(k in _self.sysconfigs) || !_self.sysconfigs[k] || typeof _self.sysconfigs[k] !== 'object') {
          if (k === 'ai_provider') _self.sysconfigs[k] = { value: 'gemini' };
          else if (k === 'ai_model') _self.sysconfigs[k] = { value: 'gemini-3.7-flash' };
          else if (k === 'ai_reasoning_effort') _self.sysconfigs[k] = { value: 'auto' };
          else if (k === 'ai_temperature') _self.sysconfigs[k] = { value: 0 };
          else if (k === 'ai_max_tokens') _self.sysconfigs[k] = { value: 4096 };
          else if (k === 'ai_openrouter_mode') _self.sysconfigs[k] = { value: 'auto' };
          else if (k === 'ai_openrouter_models') _self.sysconfigs[k] = { value: ['', '', ''] };
          else _self.sysconfigs[k] = { value: '' };
        } else if (!('value' in _self.sysconfigs[k])) {
          if (k === 'ai_provider') _self.sysconfigs[k]['value'] = 'gemini';
          else if (k === 'ai_model') _self.sysconfigs[k]['value'] = 'gemini-3.7-flash';
          else if (k === 'ai_reasoning_effort') _self.sysconfigs[k]['value'] = 'auto';
          else if (k === 'ai_temperature') _self.sysconfigs[k]['value'] = 0;
          else if (k === 'ai_max_tokens') _self.sysconfigs[k]['value'] = 4096;
          else if (k === 'ai_openrouter_mode') _self.sysconfigs[k]['value'] = 'auto';
          else if (k === 'ai_openrouter_models') _self.sysconfigs[k]['value'] = ['', '', ''];
          else _self.sysconfigs[k]['value'] = '';
        } else if (k === 'ai_provider' && !_self.sysconfigs[k]['value']) {
          _self.sysconfigs[k]['value'] = 'gemini';
        } else if (k === 'ai_reasoning_effort' && !_self.sysconfigs[k]['value']) {
          _self.sysconfigs[k]['value'] = 'auto';
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

  // ---- SSL/TLS Management ----

  openSslTab(): void {
    this.activeTab = 'ssl';
    this.loadSslStatus();
    this.clearSslPolling();
    this.sslPollingInterval = setInterval(() => {
      if (this.activeTab === 'ssl') {
        this.loadSslStatus(true);
      }
    }, 30000);
  }

  clearSslPolling(): void {
    if (this.sslPollingInterval) {
      clearInterval(this.sslPollingInterval);
      this.sslPollingInterval = null;
    }
  }

  loadSslStatus(silent: boolean = false): void {
    if (!silent) {
      this.sslLoading = true;
    }
    this.data_provider.ssl_status().then((res: any) => {
      this.sslLoading = false;
      this.sslWarmingUp = false;
      this.sslWarmupRetries = 0;
      this.sslStatus = res;
      this.forceSslEnabled = res.force_ssl || false;
    }).catch((err: any) => {
      this.sslLoading = false;
      if (this.isSslAgentWarmingUp(err)) {
        this.sslWarmingUp = true;
        if (this.sslWarmupRetries < 12) {
          this.sslWarmupRetries++;
          setTimeout(() => this.loadSslStatus(true), 5000);
        } else {
          this.sslWarmupRetries = 0;
          this.sslWarmingUp = false;
          this.show_toast('SSL Status', 'SSL service is still starting. It will be available shortly.', 'info');
        }
        return;
      }
      if (!silent) {
        this.show_toast('SSL Status', 'Failed to load SSL status: ' + (err?.error || err), 'danger');
      }
    });
  }

  isSslAgentWarmingUp(err: any): boolean {
    const m = (typeof err === 'string') ? err : (err?.error || err?.message || '');
    return m === 'ssl_agent_unreachable' || m === 'ssl_agent_timeout' || m === 'ssl_agent_error';
  }

  addLeDomain(): void {
    this.leDomains.push('');
  }

  trackByIndex(index: number): number {
    return index;
  }

  removeLeDomain(i: number): void {
    if (this.leDomains.length > 1) {
      this.leDomains.splice(i, 1);
    }
  }

  requestLetsEncrypt(): void {
    const domains = this.leDomains.filter(d => d.trim() !== '');
    if (domains.length === 0) {
      this.show_toast('Let\'s Encrypt', 'Please enter at least one domain', 'warning');
      return;
    }
    if (!this.leEmail || this.leEmail.indexOf('@') === -1) {
      this.show_toast('Let\'s Encrypt', 'Please enter a valid email address', 'warning');
      return;
    }
    if (this.leMethod === 'dns' && !this.leDnsToken) {
      this.show_toast('Let\'s Encrypt', 'DNS API token is required for DNS-01 challenge', 'warning');
      return;
    }

    this.sslActionInProgress = true;
    const payload: any = {
      domains: domains,
      email: this.leEmail,
      method: this.leMethod,
    };
    if (this.leMethod === 'dns') {
      payload.dns_provider = this.leDnsProvider;
      if (this.leDnsProvider === 'cloudflare') {
        payload.dns_credentials = { dns_cloudflare_api_token: this.leDnsToken };
      } else {
        payload.dns_credentials = { api_token: this.leDnsToken };
      }
    }

    this.data_provider.ssl_letsencrypt_request(payload).then((res: any) => {
      this.sslActionInProgress = false;
      this.show_toast('Let\'s Encrypt', 'Certificate obtained successfully!', 'success');
      this.loadSslStatus();
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      const title = errData.error || 'Certificate Request Failed';
      const output = errData.output || errData.detail || JSON.stringify(err, null, 2);
      this.showSslError(title, output);
    });
  }

  renewLetsEncrypt(): void {
    if (!this.sslStatus?.certificate?.installed) {
      this.show_toast('Let\'s Encrypt', 'No certificate installed to renew', 'warning');
      return;
    }
    this.sslActionInProgress = true;
    const payload: any = {};
    if (this.sslStatus.certificate.domain) {
      payload.domain = this.sslStatus.certificate.domain;
    }
    this.data_provider.ssl_letsencrypt_renew(payload).then((res: any) => {
      this.sslActionInProgress = false;
      this.show_toast('Let\'s Encrypt', 'Certificate renewed successfully!', 'success');
      this.loadSslStatus();
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      const title = errData.error || 'Certificate Renewal Failed';
      const output = errData.output || errData.detail || JSON.stringify(err, null, 2);
      this.showSslError(title, output);
    });
  }

  confirmDeleteLeCert(): void {
    this.leDeleteModalVisible = true;
  }

  deleteLetsEncrypt(): void {
    this.leDeleteModalVisible = false;
    if (!this.sslStatus?.certificate?.domain) {
      this.show_toast('Let\'s Encrypt', 'No certificate domain found', 'warning');
      return;
    }
    this.sslActionInProgress = true;
    this.data_provider.ssl_letsencrypt_delete({ domain: this.sslStatus.certificate.domain }).then(() => {
      this.sslActionInProgress = false;
      this.show_toast('Let\'s Encrypt', 'Certificate deleted', 'success');
      this.forceSslEnabled = false;
      this.loadSslStatus();
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      const title = errData.error || 'Certificate Deletion Failed';
      const output = errData.output || errData.detail || JSON.stringify(err, null, 2);
      this.showSslError(title, output);
    });
  }

  installManualCert(): void {
    if (!this.manualCertPem || !this.manualKeyPem) {
      this.show_toast('Manual Certificate', 'Certificate and private key are required', 'warning');
      return;
    }
    if (this.manualCertPem.indexOf('BEGIN CERTIFICATE') === -1) {
      this.show_toast('Manual Certificate', 'Invalid certificate format. Must be PEM with BEGIN CERTIFICATE header', 'warning');
      return;
    }
    if (this.manualKeyPem.indexOf('BEGIN') === -1 || this.manualKeyPem.indexOf('PRIVATE KEY') === -1) {
      this.show_toast('Manual Certificate', 'Invalid private key format. Must be PEM with BEGIN PRIVATE KEY header', 'warning');
      return;
    }

    this.sslActionInProgress = true;
    this.data_provider.ssl_install_cert({
      cert_pem: this.manualCertPem,
      key_pem: this.manualKeyPem,
      chain_pem: this.manualChainPem,
    }).then((res: any) => {
      this.sslActionInProgress = false;
      this.show_toast('Manual Certificate', 'Certificate installed successfully!', 'success');
      this.manualCertPem = '';
      this.manualKeyPem = '';
      this.manualChainPem = '';
      this.loadSslStatus();
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      const title = errData.error || 'Certificate Installation Failed';
      const output = errData.output || errData.detail || JSON.stringify(err, null, 2);
      this.showSslError(title, output);
    });
  }

  generateCsr(): void {
    if (!this.csrDomain) {
      this.show_toast('Generate CSR', 'Domain is required', 'warning');
      return;
    }
    if (this.csrCountry && this.csrCountry.length !== 2) {
      this.show_toast('Generate CSR', 'Country must be exactly 2 letters (e.g. US)', 'warning');
      return;
    }

    this.sslActionInProgress = true;
    this.data_provider.ssl_generate_csr({
      domain: this.csrDomain,
      country: this.csrCountry,
      state: this.csrState,
      city: this.csrCity,
      org: this.csrOrg,
      email: this.csrEmail,
      key_size: this.csrKeySize,
    }).then((res: any) => {
      this.sslActionInProgress = false;
      this.csrOutput = res.csr || '';
      this.show_toast('Generate CSR', 'CSR generated successfully!', 'success');
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      const title = errData.error || 'CSR Generation Failed';
      const output = errData.output || errData.detail || JSON.stringify(err, null, 2);
      this.showSslError(title, output);
    });
  }

  toggleForceSsl(): void {
    if (this.forceSslEnabled && !this.sslStatus?.https_configured) {
      this.show_toast('Force HTTPS', 'Install a certificate before enabling Force HTTPS', 'warning');
      this.forceSslEnabled = false;
      return;
    }
    this.sslActionInProgress = true;
    this.data_provider.ssl_force_ssl({ enabled: this.forceSslEnabled }).then(() => {
      this.sslActionInProgress = false;
      this.show_toast('Force HTTPS', this.forceSslEnabled ? 'HTTP redirect enabled' : 'HTTP redirect disabled', 'success');
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      this.forceSslEnabled = !this.forceSslEnabled;
      const errData = err?.error || err || {};
      const title = errData.error || 'Force HTTPS Failed';
      const output = errData.output || errData.detail || JSON.stringify(err, null, 2);
      this.showSslError(title, output);
    });
  }

  confirmDisableHttps(): void {
    this.disableHttpsModalVisible = true;
  }

  disableHttps(): void {
    this.disableHttpsModalVisible = false;
    this.sslActionInProgress = true;
    this.data_provider.ssl_disable().then(() => {
      this.sslActionInProgress = false;
      this.forceSslEnabled = false;
      this.show_toast('HTTPS', 'HTTPS disabled', 'info');
      this.loadSslStatus();
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      const title = errData.error || 'Disable HTTPS Failed';
      const output = errData.output || errData.detail || JSON.stringify(err, null, 2);
      this.showSslError(title, output);
    });
  }

  testNginxConfig(): void {
    this.data_provider.ssl_nginx_test().then((res: any) => {
      if (res.valid) {
        this.show_toast('Nginx Config', 'Configuration syntax is valid', 'success');
      } else {
        this.showSslError('Nginx Config Test Failed', res.output || 'Unknown error');
      }
    }).catch((err: any) => {
      const errData = err?.error || err || {};
      this.showSslError('Nginx Config Test Failed', errData.output || errData.detail || JSON.stringify(err, null, 2));
    });
  }

  reloadNginx(): void {
    this.sslActionInProgress = true;
    this.data_provider.ssl_nginx_reload().then((res: any) => {
      this.sslActionInProgress = false;
      if (res.success) {
        this.show_toast('Nginx', 'Nginx reloaded successfully', 'success');
      } else {
        this.showSslError('Nginx Reload Failed', res.output || 'Unknown error');
      }
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      this.showSslError('Nginx Reload Failed', errData.output || errData.detail || JSON.stringify(err, null, 2));
    });
  }

  copyMigrationCommand(): void {
    this.data_provider.ssl_migration_script().then((res: any) => {
      if (res.script) {
        this.copyToClipboard(res.script);
        this.show_toast('Copied', 'Migration script copied. Paste and run on your server.', 'success');
      }
    }).catch(() => {
      const cmd = 'sudo bash /opt/mikrowizard/recreate-ssl.sh';
      this.copyToClipboard(cmd);
      this.show_toast('Copied', 'Command copied. Run: ' + cmd, 'info');
    });
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {}).catch(() => {});
    }
  }

  showSslError(title: string, output: string): void {
    this.sslErrorTitle = title;
    this.sslErrorOutput = output || 'No output available.';
    this.sslErrorModalVisible = true;
  }

  startDnsManual(): void {
    const domains = this.leDomains.filter(d => d.trim() !== '');
    if (domains.length === 0) {
      this.show_toast('Manual DNS', 'Please enter at least one domain', 'warning');
      return;
    }
    if (!this.leEmail || this.leEmail.indexOf('@') === -1) {
      this.show_toast('Manual DNS', 'Please enter a valid email address', 'warning');
      return;
    }
    this.sslActionInProgress = true;
    this.data_provider.ssl_dns_manual_start({ domains, email: this.leEmail }).then((res: any) => {
      this.sslActionInProgress = false;
      this.show_toast('Manual DNS', 'Challenge started. Waiting for TXT records...', 'info');
      this.pollDnsManualStatus();
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      this.showSslError(errData.error || 'DNS Challenge Failed', errData.output || errData.detail || JSON.stringify(err, null, 2));
    });
  }

  pollDnsManualStatus(): void {
    this.data_provider.ssl_dns_manual_status().then((res: any) => {
      if (res.records && res.records.length > 0) {
        this.leDnsManualRecords = res.records;
        this.show_toast('Manual DNS', 'TXT records ready. Add them to your DNS provider and click Continue.', 'info');
        return;
      }
      if (res.state === 'error') {
        this.showSslError('DNS Challenge Failed', res.error || 'Certbot exited with error. Check the SSL agent logs.');
        return;
      }
      if (res.state === 'success') {
        this.leDnsManualRecords = [];
        this.show_toast('Manual DNS', 'Certificate obtained successfully!', 'success');
        this.loadSslStatus();
        return;
      }
      setTimeout(() => this.pollDnsManualStatus(), 3000);
    }).catch((err: any) => {
      const errData = err?.error || err || {};
      this.showSslError(errData.error || 'DNS Status Check Failed', errData.detail || JSON.stringify(err, null, 2));
    });
  }

  continueDnsManual(): void {
    this.sslActionInProgress = true;
    this.data_provider.ssl_dns_manual_continue().then(() => {
      this.show_toast('Manual DNS', 'DNS records submitted for verification. Polling for result...', 'info');
      this.pollDnsManualResult();
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      this.showSslError(errData.error || 'DNS Continue Failed', errData.detail || JSON.stringify(err, null, 2));
    });
  }

  pollDnsManualResult(): void {
    this.data_provider.ssl_dns_manual_status().then((res: any) => {
      if (res.state === 'success') {
        this.sslActionInProgress = false;
        this.leDnsManualRecords = [];
        this.show_toast('Manual DNS', 'Certificate obtained successfully!', 'success');
        this.loadSslStatus();
        return;
      }
      if (res.state === 'error') {
        this.sslActionInProgress = false;
        this.showSslError('DNS Challenge Failed', res.error || 'Certbot verification failed. Check DNS TXT records and try again.');
        return;
      }
      setTimeout(() => this.pollDnsManualResult(), 3000);
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      this.showSslError(errData.error || 'DNS Verification Failed', errData.detail || JSON.stringify(err, null, 2));
    });
  }

  cancelDnsManual(): void {
    this.leDnsManualRecords = [];
    this.sslActionInProgress = false;
  }

  installCertbot(): void {
    this.sslActionInProgress = true;
    this.data_provider.ssl_install_certbot().then(() => {
      this.show_toast('Certbot', 'Installation started...', 'info');
      this.pollCertbotInstall();
    }).catch((err: any) => {
      this.sslActionInProgress = false;
      const errData = err?.error || err || {};
      this.showSslError('Certbot Installation Failed', errData.detail || JSON.stringify(err, null, 2));
    });
  }

  pollCertbotInstall(): void {
    this.data_provider.ssl_install_certbot_status().then((res: any) => {
      if (res.state === 'success' || res.installed) {
        this.sslActionInProgress = false;
        this.show_toast('Certbot', 'Certbot installed successfully!', 'success');
        this.loadSslStatus();
        return;
      }
      if (res.state === 'error') {
        this.sslActionInProgress = false;
        this.showSslError('Certbot Installation Failed', res.error || 'Unknown error');
        return;
      }
      setTimeout(() => this.pollCertbotInstall(), 3000);
    }).catch(() => {
      setTimeout(() => this.pollCertbotInstall(), 3000);
    });
  }
}
