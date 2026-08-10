import { Component, OnInit, OnDestroy, ViewChild, ViewEncapsulation, Input } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { formatInTimeZone } from "date-fns-tz";

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
  selector: 'app-authlogs',
  templateUrl: "auth.component.html",
  styleUrls: ["auth.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class AuthComponent implements OnInit, OnDestroy {
  @Input() component_devid: any=false;
  public uid!: number;
  public uname!: string;
  public tz: string = "UTC";
  public filterText!: string;
  public detailsVisible: boolean = false;
  public selectedLog: any = null;
  public role: string = "";
  public isAllowed: boolean = true;
  private deviceChangeSub: any;
  
  public recordingModalVisible: boolean = false;
  public recordingUrl: SafeResourceUrl | null = null;
  public selectedSessionId: string = "";

  public exportModalVisible: boolean = false;
  public exportColumns = [
    { field: 'id', label: 'ID', selected: true },
    { field: 'created', label: 'Event Time', selected: true },
    { field: 'username', label: 'User Name', selected: true },
    { field: 'ip', label: 'User IP', selected: true },
    { field: 'devip', label: 'Router IP', selected: true },
    { field: 'name', label: 'Router Name', selected: true },
    { field: 'message', label: 'Status / Reply', selected: true },
    { field: 'ltype', label: 'Connection Type', selected: true },
    { field: 'by', label: 'Server / By', selected: false },
    { field: 'started', label: 'Session Started', selected: false },
    { field: 'ended', label: 'Session Ended', selected: false }
  ];

  openExportModal() {
    this.exportModalVisible = true;
  }

  fetchExportData = async (params: { startDate?: string; endDate?: string; scope?: string }) => {
    const filterCopy = { ...this.filters };
    if (params.startDate) {
      filterCopy['start_time'] = `${params.startDate}T00:00:00.000Z`;
    } else {
      filterCopy['start_time'] = '1970-01-01T00:00:00.000Z';
    }
    if (params.endDate) {
      filterCopy['end_time'] = `${params.endDate}T23:59:59.000Z`;
    } else {
      const today = new Date().toISOString().slice(0, 10);
      filterCopy['end_time'] = `${today}T23:59:59.000Z`;
    }
    const res = this.role === 'customer'
      ? await this.data_provider.customerGetAuthLogs(filterCopy)
      : await this.data_provider.get_auth_logs(filterCopy);
    return res.result || res || [];
  };

  @ViewChild('dt') table!: Table;
  public devid: number = 0;
  public reloading: boolean = false;
  public filters: any = {
    devid: false,
    ip: "",
    devip: "",
    user: "",
    state: "All",
    server: "All",
    connection_type: "All",
    start_time: false,
    end_time: false,
  };
  public filters_visible: boolean = false;
  public connection_types: any = [];

  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
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
      _self.role = res.role;
      const userId = _self.uid;

      if (res.role !== "admin" && res.role !== "customer") {
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
  public source: Array<any> = [];
  public loading: boolean = true;
  public rows: any = [];
  public selected_rows: any[] = []; // Used by p-table selection
  public Selectedrows: any[] = []; // ID array for legacy actions

  showLogDetails(log: any) {
    this.selectedLog = log;
    this.detailsVisible = true;
  }

  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  reinitgrid(field: string, $event: any) {
    if (field == "start") this.filters["start_time"] = $event.target.value;
    else if (field == "end") this.filters["end_time"] = $event.target.value;
    else if (field == "ip") this.filters["ip"] = $event;
    else if (field == "devip") this.filters["devip"] = $event;
    else if (field == "user") this.filters["user"] = $event;
    else if (field == "connection_type")
      this.filters["connection_type"] = $event;
    else if (field == "state") this.filters["state"] = $event;
    else if (field == "server") this.filters["server"] = $event;
    this.initGridTable();
  }
  secondsToString(seconds: number) {
    var years = Math.floor(seconds / 31536000);
    var max = 2;
    var current = 0;
    var str = "";
    if (years && current < max) {
      str += years + "y ";
      current++;
    }
    var days = Math.floor((seconds %= 31536000) / 86400);
    if (days && current < max) {
      str += days + "d ";
      current++;
    }
    var hours = Math.floor((seconds %= 86400) / 3600);
    if (hours && current < max) {
      str += hours + "h ";
      current++;
    }
    var minutes = Math.floor((seconds %= 3600) / 60);
    if (minutes && current < max) {
      str += minutes + "m ";
      current++;
    }
    var seconds = seconds % 60;
    if (seconds && current < max) {
      str += seconds + "s ";
      current++;
    }

    return str;
  }
  ngOnInit(): void {
    if (this.component_devid) {
      this.devid = this.component_devid;
    } else{
      this.devid = Number(this.route.snapshot.paramMap.get("devid"));
    }
    
    if (this.role === 'customer' || (!this.devid && localStorage.getItem('customer_selected_device_id'))) {
      const cached = localStorage.getItem('customer_selected_device_id');
      if (cached) {
        this.devid = +cached;
      }
    }
    
    if (this.devid > 0) {
      this.filters["devid"] = this.devid;
    }

    // Register global device selection change listener for customers
    this.deviceChangeSub = (event: Event) => {
      if (this.role === 'customer') {
        const customEvent = event as CustomEvent;
        this.devid = customEvent.detail;
        this.filters["devid"] = this.devid;
        this.checkPermissionAndInit();
      }
    };
    window.addEventListener('customerDeviceChanged', this.deviceChangeSub);

    this.checkPermissionAndInit();
  }

  ngOnDestroy(): void {
    if (this.deviceChangeSub) {
      window.removeEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
  }

  onSelectionChange(value: any[]) {
    this.selected_rows = value;
    this.Selectedrows = value.map(item => item.id);
    this.rows = value;
  }

  removefilter(filter: any) {
    delete this.filters[filter];
    this.checkPermissionAndInit();
  }

  toggleCollapse(): void {
    this.filters_visible = !this.filters_visible;
  }

  logger(item: any) {
    console.dir(item);
  }

  checkPermissionAndInit() {
    if (this.role !== 'customer') {
      this.isAllowed = true;
      this.initGridTable();
      return;
    }
    
    this.data_provider.customerGetDevices().then((res: any) => {
      const devs = res.result || res || [];
      const dev = devs.find((d: any) => +d.id === +this.devid);
      this.isAllowed = dev ? dev.allow_log_auth === true : false;
      if (this.isAllowed) {
        this.initGridTable();
      } else {
        this.source = [];
        this.loading = false;
      }
    }).catch(() => {
      this.isAllowed = false;
      this.source = [];
      this.loading = false;
    });
  }

  initGridTable(): void {
    var _self = this;
    if(this.reloading) return;
    this.reloading = true;

    const logsPromise = this.role === 'customer'
      ? this.data_provider.customerGetAuthLogs(this.filters)
      : this.data_provider.get_auth_logs(this.filters);

    logsPromise.then((res: any) => {
      let data = res.result || res || [];
      let index = 1;
      this.source = data.map((d: any) => {
        d.index = index;
        if (!_self.connection_types.includes(d.by))
          _self.connection_types.push(d.by);

        if (!d.sessionid) {
          d.stype = "local";
          d.duration = "Local Access";
        } else {
          d.stype = d.by === 'Web-Proxy' || d.by === 'proxy' ? 'web-proxy' : 'radius';
          if (!d.ended || d.ended === 0) {
            d.duration = "live";
          } else {
            const diff = d.ended - d.started;
            d.duration = diff > 0 ? _self.secondsToString(diff) : "0s";
          }
        }
        if (d.created && typeof d.created === 'string') {
          d.created = formatInTimeZone(
            d.created.split(".")[0] + ".000Z",
            _self.tz,
            "yyyy-MM-dd HH:mm:ss XXX"
          );
        }
        index += 1;
        return d;
      });
      this.loading = false;
      this.reloading = false;
    }).catch(() => {
      this.loading = false;
      this.reloading = false;
      this.source = [];
    });
  }

  openRecordingModal(item: any, event: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const sessionId = item.sessionid || item.id;
    this.selectedSessionId = sessionId;
    const url = item.by === 'Web-Proxy' || item.by === 'proxy'
      ? this.data_provider.getWebfigRecordingStreamUrl(sessionId)
      : '/api/terminal/recording/stream/' + sessionId;
    this.recordingUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.recordingModalVisible = true;
  }

  openLiveMonitorModal(item: any, event: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const sessionId = item.sessionid || item.id;
    this.selectedSessionId = sessionId;
    const url = this.data_provider.getWebfigLiveStreamUrl(sessionId);
    this.recordingUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.recordingModalVisible = true;
  }
}
