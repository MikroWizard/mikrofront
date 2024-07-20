import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router, ActivatedRoute } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import {
  GuiRowDetail,
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
  templateUrl: "syslog.component.html",
  styleUrls: ["syslog.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class SyslogComponent implements OnInit {
  public uid: number;
  public uname: string;
  public tz: string= "UTC";
  public filterText: string;
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
  public columns: Array<GuiColumn> = [];
  public loading: boolean = true;
  public rows: any = [];
  public Selectedrows: any;
  public userid: number = 0;
  public sorting = {
    enabled: true,
    multiSorting: true,
  };
  public campaignOnestart: any;
  public campaignOneend: any;
  rowDetail: GuiRowDetail = {
    enabled: true,
    template: (item) => {
      return `
			<div class='log-detail' style="width: 355px;color:#fff;background-color:#3399ff">
			<h2>System Log :</h2>
			<table>
				<tr>
					<td>Section</td>
					<td>${item.section}</td>
				</tr>
				<tr>
					<td>Action</td>
					<td>${item.action}</td>
				</tr>
				<tr>
					<td>Time</td>
					<td>${item.created}</td>
				</tr>
				</table>
				<h2 style="margin-top: 5px;">User Detail :
				</h2>
				<table>
				<tr>
					<td>User</td>
					<td>${item.username}</td>
				</tr>
				<tr>
					<td>FirstName</td>
					<td>${item.first_name}</td>
				</tr>
				<tr>
					<td>LastName</td>
					<td>${item.last_name}</td>
				</tr>
				<tr>
					<td>IP</td>
					<td>${item.ip}</td>
				</tr>
				<tr>
					<td>Agent</td>
					<td><div style="height: 40px;overflow-y: scroll;">${item.agent}</div></td>
				</tr>
				</table>
				<div class="code-title">data</div>
				<code>
					${item.data}
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
