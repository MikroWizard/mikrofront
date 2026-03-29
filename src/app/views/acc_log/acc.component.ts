import { Component, OnInit, ViewChild, ViewEncapsulation, Input } from "@angular/core";
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
export class AccComponent implements OnInit {
  @Input() component_devid: any=false;
  public uid!: number;
  public uname!: string;
  public tz!: string;
  public filterText!: string;
  public detailsVisible: boolean = false;
  public selectedLog: any = null;
  
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
    } else{
      this.devid = Number(this.route.snapshot.paramMap.get("devid"));
    }
    if (this.devid > 0) {
      this.filters["devid"] = this.devid;
    }
    this.initGridTable();
  }
  OnDestroy(): void {}
  onSelectionChange(value: any[]) {
    this.selected_rows = value;
    this.Selectedrows = value.map(item => item.id);
    this.rows = value;
  }

  removefilter(filter: any) {
    delete this.filters[filter];
    this.initGridTable();
  }
  toggleCollapse(): void {
    this.filters_visible = !this.filters_visible;
  }
  logger(item: any) {
    console.dir(item);
  }

  initGridTable(): void {
    var _self = this;
    if(this.reloading) return;
    this.reloading = true;
    this.data_provider.get_account_logs(this.filters).then((res) => {
      let index = 1;
      this.source = res.map((d: any) => {
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
    });
  }
}
