import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
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
  templateUrl: "auth.component.html",
  styleUrls: ["auth.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class AuthComponent implements OnInit {
  public uid: number;
  public uname: string;
  public tz: string = "UTC";
  public filterText: string;
  public devid: number = 0;
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
    private route: ActivatedRoute
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
  public columns: Array<GuiColumn> = [];
  public loading: boolean = true;
  public rows: any = [];
  public Selectedrows: any;

  public sorting = {
    enabled: true,
    multiSorting: true,
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

  public rowSelection: boolean | GuiRowSelection = {
    enabled: true,
    type: GuiRowSelectionType.CHECKBOX,
    mode: GuiRowSelectionMode.MULTIPLE,
  };

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
    this.devid = Number(this.route.snapshot.paramMap.get("devid"));
    if (this.devid > 0) {
      this.filters["devid"] = this.devid;
    }
    this.initGridTable();
  }
  onSelectedRows(rows: Array<GuiSelectedRow>): void {
    this.rows = rows;
    this.Selectedrows = rows.map((m: GuiSelectedRow) => m.source.id);
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
    this.data_provider.get_auth_logs(this.filters).then((res) => {
      let index = 1;
      this.source = res.map((d: any) => {
        d.index = index;
        if (!_self.connection_types.includes(d.by))
          _self.connection_types.push(d.by);

        if (!d.sessionid) {
          d.stype = "local";
          d.duration = "Local Access";
        } else {
          d.stype = "radius";
          if (d.ended != 0) {
            d.duration = _self.secondsToString(d.ended - d.started);
          } else {
            d.duration = "live";
          }
        }
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
