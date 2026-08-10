import { Component, OnInit, ViewChild, ViewEncapsulation } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { formatInTimeZone } from "date-fns-tz";


@Component({
  templateUrl: "syslog.component.html",
  styleUrls: ["syslog.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class SyslogComponent implements OnInit {
  public uid!: number;
  public uname!: string;
  public tz: string= "UTC";
  public filterText!: string;
  public userid: number = 0;
  public filters: any = {
    start_time: false,
    end_time: false,
    section: "All",
    action: "All",
    ip: "",
  };
  public event_section: any = [];
  public event_action: any = [];
  public filters_visible: boolean = false;
  public detailsVisible: boolean = false;
  public selectedLog: any = null;

  public exportModalVisible: boolean = false;
  public exportColumns = [
    { field: 'id', label: 'ID', selected: true },
    { field: 'created', label: 'Timestamp', selected: true },
    { field: 'username', label: 'User Name', selected: true },
    { field: 'ip', label: 'User IP', selected: true },
    { field: 'section', label: 'Section', selected: true },
    { field: 'action', label: 'Action', selected: true },
    { field: 'data', label: 'Details / Data', selected: true },
    { field: 'agent', label: 'User Agent', selected: false }
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
    const res = await this.data_provider.get_syslog(filterCopy);
    return res.result || res || [];
  };
  
  @ViewChild('dt') table!: Table;
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
  showLogDetails(log: any) {
    this.selectedLog = log;
    this.detailsVisible = true;
  }
  
  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  // Removed legacy GuiGrid configs
  ngOnInit(): void {
    var _self = this;
    this.userid = Number(this.route.snapshot.paramMap.get("userid"));
    if (this.userid > 0) {
      this.filters["userid"] = this.userid;
    }
    this.initGridTable();
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
    else if (field == "section") this.filters["section"] = $event;
    else if (field == "action") this.filters["action"] = $event;
    else if (field == "ip") this.filters["ip"] = $event;
    this.initGridTable();
  }

  initGridTable(): void {
    var _self = this;
    _self.event_section = [];
    _self.event_action = [];
    this.data_provider.get_syslog(this.filters).then((res) => {
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
    });
  }
}
