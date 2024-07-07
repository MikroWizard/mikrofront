import { Component, OnInit,  ViewEncapsulation } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import {
  GuiRowDetail,
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



@Component({
  templateUrl: "acc.component.html",
  styleUrls: ["acc.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class AccComponent implements OnInit {
  public uid: number;
  public uname: string;
  public tz: string;
  public filterText: string;
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
  public columns: Array<GuiColumn> = [];
  public loading: boolean = true;
  public rows: any = [];
  public Selectedrows: any;
  public devid: number = 0;
  public sorting = {
    enabled: true,
    multiSorting: true,
  };
  rowDetail: GuiRowDetail = {
    enabled: true,
    template: (item) => {
      return `
			<div class='log-detail'>
				<h1>${item.name}</h1>
				<small>${item.devip}</small>
				<table>
				<tr>
					<td>User Address</td>
					<td>${item.address}</td>
				</tr>
				<tr>
					<td>User Name</td>
					<td>${item.username}</td>
				</tr>
				<tr>
					<td>Connection Type</td>
					<td>${item.ctype}</td>
				</tr>
				<tr>
					<td>Section</td>
					<td>${item.section}</td>
				</tr>
				<tr>
					<td>Exec time</td>
					<td>${item.created}</td>
				</tr>
				</table>
				<div class="code-title">Executed Config</div>
				<code>
					${item.config}
				</code>
			</div>`;
    },
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
    else if (field == "section") this.filters["section"] = $event;
    else if (field == "config") this.filters["config"] = $event;
    else if (field == "action") this.filters["action"] = $event;
    this.initGridTable();
  }

  ngOnInit(): void {
    this.devid = Number(this.route.snapshot.paramMap.get("devid"));
    if (this.devid > 0) {
      this.filters["devid"] = this.devid;
    }
    this.initGridTable();
  }
  OnDestroy(): void {}
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
    });
  }
}
