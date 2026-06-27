import { Component, OnInit, OnDestroy, ViewChild, ViewEncapsulation, Input } from "@angular/core";
import { FormControl } from "@angular/forms";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { formatInTimeZone } from "date-fns-tz";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";


@Component({
  selector: 'app-devlogs',
  templateUrl: "devlogs.component.html",
  styleUrls: ["devlogs.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class DevLogsComponent implements OnInit, OnDestroy {
  @Input() component_devid: any=false;
  public uid!: number;
  public uname!: string;
  public tz: string = "UTC"
  public filterText!: string;
  public detailsVisible: boolean = false;
  public selectedLog: any = null;
  public role: string = "";
  public isAllowed: boolean = true;
  private deviceChangeSub: any;
  
  @ViewChild('dt') table!: Table;
  public filters: any = {
    start_time: false,
    end_time: false,
    detail: [],
    level: false,
    comment: "",
    status: "all",
  };
  public event_types: any = [];
  public event_types_filtered: any = [];
  public filters_visible: boolean = false;
  public reloading: boolean = false;
  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private route: ActivatedRoute,
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
  public bankMultiFilterCtrl: FormControl = new FormControl<string>("");
  protected _onDestroy = new Subject<void>();

  getSeverityColor(level: string): string {
    if (level === "Critical") return "#e55353";
    if (level === "Warning") return "#f9b115";
    return "#3399ff";
  }

  showLogDetails(log: any) {
    this.selectedLog = log;
    this.detailsVisible = true;
  }

  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }
  ngOnInit(): void {
    var _self = this;
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

    this.bankMultiFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        let search = this.bankMultiFilterCtrl.value;
        if (!search) {
          this.event_types_filtered = this.event_types;
        }
        _self.event_types_filtered = _self.event_types_filtered.filter(
          (item: any) => item.toLowerCase().indexOf(search.toLowerCase()) > -1
        );
        console.dir(_self.event_types_filtered);
      });
  }

  ngOnDestroy(): void {
    if (this.deviceChangeSub) {
      window.removeEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  toggleCollapse(): void {
    this.filters_visible = !this.filters_visible;
  }

  logger(item: any) {
    console.dir(item);
  }

  reinitgrid(field: string, $event: any) {
    if (field == "start") this.filters["start_time"] = $event.target.value;
    else if (field == "end") this.filters["end_time"] = $event.target.value;
    else if (field == "detail") this.filters["detail"] = $event;
    else if (field == "level") this.filters["level"] = $event;
    else if (field == "comment") this.filters["comment"] = $event;
    else if (field == "status") this.filters["status"] = $event;
    this.initGridTable();
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
      this.isAllowed = dev ? dev.allow_log_dev === true : false;
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
      ? this.data_provider.customerGetDeviceLogs(this.filters)
      : this.data_provider.get_dev_logs(this.filters);

    logsPromise.then((res: any) => {
      let data = res.result || res || [];
      let index = 1;
      this.source = data.map((d: any) => {
        d.index = index;
        if (d.detail.indexOf("Link Down") >= 0) d.detail = "Link Down";
        else if (d.detail.indexOf("Link Up") >= 0) d.detail = "Link Up";
        if (!_self.event_types.includes(d.detail))
          _self.event_types.push(d.detail);
        d.eventtime = formatInTimeZone(
          d.eventtime.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss XXX"
        );
        if (d.fixtime)
          d.fixtime = formatInTimeZone(
            d.fixtime.split(".")[0] + ".000Z",
            _self.tz,
            "yyyy-MM-dd HH:mm:ss XXX"
          );
        index += 1;
        return d;
      });
      _self.event_types_filtered = _self.event_types;
      this.loading = false;
      this.reloading = false;
    }).catch(() => {
      this.loading = false;
      this.reloading = false;
      this.source = [];
    });
  }
}
