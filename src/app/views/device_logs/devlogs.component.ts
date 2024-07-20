import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { FormControl } from "@angular/forms";
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
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";


@Component({
  templateUrl: "devlogs.component.html",
  styleUrls: ["devlogs.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class DevLogsComponent implements OnInit {
  public uid: number;
  public uname: string;
  public tz: string = "UTC"
  public filterText: string;
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
  public devid: number = 0;
  public sorting = {
    enabled: true,
    multiSorting: true,
  };
  public bankMultiFilterCtrl: FormControl = new FormControl<string>("");
  protected _onDestroy = new Subject<void>();

  public campaignOnestart: any;
  public campaignOneend: any;
  rowDetail: GuiRowDetail = {
    enabled: true,
    template: (item) => { 
      return `
			<div class='log-detail' style="width: 355px;color:#fff;background-color:${(() => {
        if (item.level == "Critical") return "#e55353";
        else if (item.level == "Warning") return "#f9b115";
        else item.level == "Info";
        return "#3399ff";
      })()}">
			<h1>Device :</h1>
			<table>
				<tr>
					<td>Device Name</td>
					<td>${item.name}</td>
				</tr>
				<tr>
					<td>Device IP</td>
					<td>${item.devip}</td>
				</tr>
				<tr>
					<td>Device MAC</td>
					<td>${item.mac}</td>
				</tr>
				</table>
				<h1 style="margin-top: 10px;">Alert Detail :
				
				</h1>
				<table>
				<tr>
					<td>Event</td>
					<td>${item.detail}</td>
				</tr>
				<tr>
					<td>Event Status</td>
					<td><span (click)="logger(${item})" style="display:inline-block;background-color:${
        item.status ? "green" : "#db4848"
      } ;padding: 4px 10px;border-radius: 5px;line-height: 10px;color: rgba(255, 255, 255, 0.87);">${
        item.status ? "Fixed" : "Not Fixed"
      }</span></td>
				</tr>
				<tr>
					<td>Event Category</td>
					<td>${item.eventtype}</td>
				</tr>
				<tr>
					<td>Exec time</td>
					<td>${item.eventtime}</td>
				</tr>
				<tr>
					<td>Detail</td>
					<td>${item.comment}</td>
				</tr>
				<tr>
					<td>Source</td>
					<td>${item.src}</td>
				</tr>
				</table>
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
    this.devid = Number(this.route.snapshot.paramMap.get("devid"));
    if (this.devid > 0) {
      this.filters["devid"] = this.devid;
    }
    this.initGridTable();

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
  initGridTable(): void {
    var _self = this;
    this.data_provider.get_dev_logs(this.filters).then((res) => {
      let index = 1;
      this.source = res.map((d: any) => {
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
      console.dir(this.source);
      this.loading = false;
    });
  }
}
