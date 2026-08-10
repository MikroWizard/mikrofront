import { Component, OnInit, OnDestroy, ViewChild, ViewEncapsulation, Input } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { formatInTimeZone } from "date-fns-tz";



@Component({
  selector: 'app-acclogs',
  templateUrl: "acc.component.html",
  styleUrls: ["acc.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class AccComponent implements OnInit, OnDestroy {
  @Input() component_devid: any=false;
  public uid!: number;
  public uname!: string;
  public tz!: string;
  public filterText!: string;
  public detailsVisible: boolean = false;
  public selectedLog: any = null;
  public role: string = "";
  public isAllowed: boolean = true;
  private deviceChangeSub: any;
  
  @ViewChild('dt') table!: Table;
  public reloading: boolean = false;
  public filters: any = {
    devid: false,
    ip: "",
    command: "",
    user: false,
    state: "all",
    with: "all",
    start_time: false,
    end_time: false,
  };
  public filters_visible: boolean = false;
  public event_action: any = [];
  public event_section: any = [];

  public exportModalVisible: boolean = false;
  public exportColumns = [
    { field: 'id', label: 'ID', selected: true },
    { field: 'created', label: 'Event Time', selected: true },
    { field: 'username', label: 'User Name', selected: true },
    { field: 'address', label: 'User IP', selected: true },
    { field: 'devip', label: 'Router IP', selected: true },
    { field: 'name', label: 'Router Name', selected: true },
    { field: 'action', label: 'Action', selected: true },
    { field: 'section', label: 'Section', selected: true },
    { field: 'ctype', label: 'Connection Type', selected: true },
    { field: 'message', label: 'Message / Detail', selected: false },
    { field: 'config', label: 'Config', selected: false }
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
      ? await this.data_provider.customerGetAccountingLogs(filterCopy)
      : await this.data_provider.get_account_logs(filterCopy);
    return res.result || res || [];
  };

  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private route: ActivatedRoute,
    private login_checker: loginChecker,
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
  public selected_rows: any[] = [];
  public Selectedrows: any[] = [];
  public devid: number = 0;

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
    else if (field == "section") this.filters["section"] = $event;
    else if (field == "config") this.filters["config"] = $event;
    else if (field == "action") this.filters["action"] = $event;
    this.initGridTable();
  }

  ngOnInit(): void {
    if (this.component_devid) {
      this.devid = this.component_devid;
    } else {
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
      this.isAllowed = dev ? dev.allow_log_acc === true : false;
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
      ? this.data_provider.customerGetAccountingLogs(this.filters)
      : this.data_provider.get_account_logs(this.filters);

    logsPromise.then((res: any) => {
      let data = res.result || res || [];
      let index = 1;
      this.source = data.map((d: any) => {
        d.index = index;
        if (!_self.event_section.includes(d.section))
          _self.event_section.push(d.section);

        if (!_self.event_action.includes(d.action))
          _self.event_action.push(d.action);
        d.created = formatInTimeZone(
          d.created.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss XXX"
        );
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
}
