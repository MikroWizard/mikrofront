import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  Renderer2,
  ViewChild,
  ViewChildren,
  QueryList,
  ElementRef,
  TemplateRef,
} from "@angular/core";
import { UntypedFormControl, UntypedFormGroup } from "@angular/forms";
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { HttpClient, HttpParams } from "@angular/common/http";
import { formatInTimeZone } from "date-fns-tz";
import { Table } from 'primeng/table';
import { ToasterComponent } from '@coreui/angular';
import { AppToastComponent } from '../toast-simple/toast.component';


@Component({
  templateUrl: "snippets.component.html",
})
export class SnippetsComponent implements OnInit, OnDestroy {
  public uid!: number;
  public uname!: string;
  public tz!: string;
  public ispro: boolean = false;

  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;
  toasterForm = {
    placement: 'top-end',
    delay: 5000,
  };

  show_toast(title: string, body: string, color: string) {
    const { ...props } = { ...this.toasterForm, color, title, body };
    if (this.viewChildren && this.viewChildren.first) {
      this.viewChildren.first.addToast(AppToastComponent, props);
    }
  }

  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker,
    private renderer: Renderer2,
    private httpClient: HttpClient,
  ) {
    var _self = this;
    if (!this.login_checker.isLoggedIn()) {
      // setTimeout(function() {
      // 		_self.router.navigate(['login']);
      // 	}, 100);
    }
    this.data_provider.getSessionInfo().then((res) => {
      // console.dir("res",res)
      _self.uid = res.uid;
      _self.uname = res.name;
      _self.tz = res.tz;
      _self.ispro = res.ispro;
      // console.dir("role",res.role);
      const userId = _self.uid;

      if (res.role != "admin") {
        // console.dir(res.role);
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
  @ViewChild("nameSummaryCell")
  nameSummaryCell!: TemplateRef<any>;
  public source: Array<any> = [];
  public columns: Array<any> = [];
  public loading: boolean = true;
  public rows: any = [];
  public Selectedrows: any;
  public EditModalVisible: boolean = false;
  public ModalAction: string = "checkfirm";
  public lineNum: number = 0;
  public DeleteConfirmModalVisible: boolean = false;
  public ExecSnipetModalVisible: boolean = false;
  public NewMemberModalVisible: boolean = false;
  public ExecutedDataModalVisible: boolean = false;
  public ExecutedData: any = [];
  public SelectedSnippet: any = { name: "" };
  public SelectedMembers: any = [];
  public SelectedTaskItems: any = "";
  public availbleMembers: any = [];
  public NewMemberRows: any = [];
  public SelectedNewMemberRows: any;
  public CsvViewModalVisible: boolean = false;
  public CsvViewData: any[] = [];
  public CsvViewColumns: string[] = [];
  public CsvViewIsText: boolean = false;
  public CsvViewTextContent: string = '';
  public textOutputExpanded: boolean = false;

  public exportModalVisible: boolean = false;
  public exportDataPayload: any[] = [];
  public exportTitle: string = "Export Snippet Report";

  openSnippetExportModal(data: any[], title: string = "Export Snippet Report") {
    this.exportDataPayload = data || [];
    this.exportTitle = title;
    this.exportModalVisible = true;
  }

  @ViewChild('dtNewMember') dtNewMember!: Table;
  @ViewChild('dtHistory') dtHistory!: Table;

  public current_snippet: any = {
    content: "",
    created: "",
    description: "",
    id: 0,
    name: "",
    brand: "mikrotik",
    is_default: false,
    is_config_mode: false,
    store_in_backup: false,
  };

  public default_snippet: any = {
    content: "",
    created: "",
    description: "",
    id: 0,
    name: "",
    brand: "mikrotik",
    is_default: false,
    is_config_mode: false,
    store_in_backup: false,
  };

  public brands: any[] = [];

  public ip_scanner: any;

  applyFilterNewMember($event: any, stringVal: string) {
    this.dtNewMember.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  applyFilterHistory($event: any, stringVal: string) {
    this.dtHistory.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  ngOnInit(): void {
    this.initGridTable();
    this.data_provider.listBrands().then((res: any) => {
      this.brands = Array.isArray(res) ? res : (res.data || res.result || []);
    });
  }

  confirm_delete(item: any = "", del: boolean = false) {
    if (!del) {
      this.SelectedSnippet = { ...item };
      this.DeleteConfirmModalVisible = true;
      console.dir(this.SelectedSnippet);
    } else {
      var _self = this;
      this.data_provider
        .delete_snippet(_self.SelectedSnippet["id"])
        .then((res) => {
          _self.initGridTable();
          _self.DeleteConfirmModalVisible = false;
        });
    }
  }

  Edit_Snippet(item: any, action: string = "showadd") {
    if (action == "showadd") {
      this.current_snippet = { ...this.default_snippet };
      this.EditModalVisible = true;
      this.ModalAction = "add";
    } else {
      this.current_snippet = { ...item, store_in_backup: item.store_in_backup || false };
      this.EditModalVisible = true;
      this.lineNum = this.current_snippet["content"] ? (this.current_snippet["content"].match(/\n/g) || []).length : 0;

      this.ModalAction = "edit";
    }
  }
  show_exec(item: any) {
    var _self = this;
    this.SelectedSnippet = item;
    this.ExecutedDataModalVisible = true;
    this.data_provider
      .get_executed_snipet(_self.SelectedSnippet["id"])
      .then((res) => {
        let index = 1;
        _self.ExecutedData = res.map((d: any) => {
          d.index = index;
          d.ended = formatInTimeZone(
            d.created.split(".")[0] + ".000Z",
            _self.tz,
            "yyyy-MM-dd HH:mm:ss XXX"
          );
          d.started = formatInTimeZone(
            d.info.created.split(".")[0] + ".000Z",
            _self.tz,
            "yyyy-MM-dd HH:mm:ss XXX"
          );
          index += 1;
          return d;
        });
        _self.DeleteConfirmModalVisible = false;
      });
  }

  form_changed() {
    // this.editAddTask(this.SelectedTask, "select_change");
    this.SelectedMembers = [];
    this.SelectedTaskItems = [];
  }
  remove_member(item: any) {
    var _self = this;
    _self.SelectedMembers = _self.SelectedMembers.filter(
      (x: any) => x.id != item.id
    );
    _self.SelectedTaskItems = _self.SelectedMembers.map((x: any) => {
      return x.id;
    });
  }

  show_new_member_form() {
    this.NewMemberModalVisible = true;
    var _self = this;
    _self.availbleMembers = [];
    this.SelectedNewMemberRows = [];
    this.NewMemberRows = [];

    var data = {
      group_id: false,
      search: false,
      page: false,
      size: 10000,
    };

    if (this.current_snippet["selection_type"] == "devices")
      _self.data_provider.get_dev_list(data).then((res) => {
        _self.availbleMembers = res.filter(
          (x: any) => !_self.SelectedTaskItems.includes(x.id)
        );
        _self.NewMemberModalVisible = true;
      });
    else
      _self.data_provider.get_devgroup_list().then((res) => {
        _self.availbleMembers = res.filter(
          (x: any) => !_self.SelectedTaskItems.includes(x.id)
        );
        _self.NewMemberModalVisible = true;
      });
  }

  onSelectedRowsNewMembers(rows: Array<any>): void {
    this.NewMemberRows = rows;
    this.SelectedNewMemberRows = rows.map((m: any) => m.source || m);
  }

  add_new_members() {
    var _self = this;
    _self.SelectedMembers = [
      ...new Set(_self.SelectedMembers.concat(_self.SelectedNewMemberRows)),
    ];

    _self.SelectedTaskItems = _self.SelectedMembers.map((x: any) => {
      return x.id;
    });

    this.NewMemberModalVisible = false;
  }

  submit(action: string) {
    var _self = this;
    _self.saveSelectionToStorage(_self.current_snippet.id);
    this.data_provider
      .Exec_snipet(_self.current_snippet, _self.SelectedTaskItems)
      .then((res) => {
        if (res && typeof res === 'object' && !Array.isArray(res) &&
            (res.status === 'failed' || res.result === 'failed')) {
          _self.show_toast("Error", res.err || res.error || "Execution failed", "danger");
          return;
        }
        _self.ExecSnipetModalVisible = false;
        _self.initGridTable();
        _self.show_toast("Success", "Snippet execution started", "success");
      })
      .catch((err) => {
        _self.show_toast("Error", err && (err.err || err.message || err) || "Execution failed", "danger");
      });
  }

  getSelectionKey(snippetId: number): string {
    return `snippet_selection_${this.uid}_${snippetId}`;
  }

  saveSelectionToStorage(snippetId: number): void {
    const key = this.getSelectionKey(snippetId);
    const data = {
      selection_type: this.current_snippet['selection_type'],
      SelectedTaskItems: this.SelectedTaskItems,
      SelectedMembers: this.SelectedMembers
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  loadSelectionFromStorage(snippetId: number): boolean {
    const key = this.getSelectionKey(snippetId);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.current_snippet['selection_type'] = data.selection_type || 'devices';
        this.SelectedTaskItems = data.SelectedTaskItems || [];
        this.SelectedMembers = data.SelectedMembers || [];
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  clearStoredSelection(): void {
    const key = this.getSelectionKey(this.current_snippet.id);
    localStorage.removeItem(key);
    this.form_changed();
  }

  viewResult(item: any): void {
    const result = item.result;
    if (typeof result === 'string') {
      this.CsvViewIsText = true;
      this.CsvViewTextContent = result;
      this.CsvViewData = [];
      this.CsvViewColumns = [];
    } else if (Array.isArray(result) && result.length > 0) {
      this.CsvViewIsText = false;
      this.CsvViewData = result;
      this.CsvViewColumns = this.getColumns(result);
      this.CsvViewTextContent = '';
    } else {
      this.CsvViewIsText = false;
      this.CsvViewData = [];
      this.CsvViewColumns = [];
      this.CsvViewTextContent = '';
    }
    this.textOutputExpanded = false;
    this.CsvViewModalVisible = true;
  }

  Run_Snippet(item: any, action: string = "showadd") {
    this.current_snippet = { ...item, store_in_backup: item.store_in_backup || false };
    this.current_snippet["task_type"] = "snipet_exec";
    this.current_snippet["selection_type"] = "devices";
    this.form_changed();
    this.loadSelectionFromStorage(item.id);
    this.ExecSnipetModalVisible = true;
    this.ModalAction = "exec";
  }
  calcline($ev: any) {
    if ($ev) this.lineNum = $ev.match(/\n/g).length;
    else this.lineNum = 0;
  }

  save_snippet() {
    this.data_provider.save_snippet(this.current_snippet).then((res) => {
      if (res && res.result === 'failed') {
        this.show_toast("Error", res.err || "Snippet save failed", "danger");
        return;
      }
      this.EditModalVisible = false;
      this.initGridTable();
      this.show_toast("Success", "Snippet saved", "success");
    }).catch((err) => {
      this.show_toast("Error", err && (err.err || err.message || err) || "Snippet save failed", "danger");
    });
  }

  onSelectedRows(rows: Array<any>): void {
    this.rows = rows;
    this.Selectedrows = rows.map((m: any) => (m.source ? m.source.id : m.id));
  }

  remove(item: any) {
    console.dir(item);
  }

  logger(item: any) {
    console.dir(item);
  }

  initGridTable(): void {
    var _self = this;
    _self.data_provider.get_snippets("", "", "", 0, 1000, false).then((res) => {
      _self.source = res.map((x: any) => {
        x.created = [
          x.created.split("T")[0],
          x.created.split("T")[1].split(".")[0],
        ].join(" ");
        return x;
      });
      _self.loading = false;
    });
  }

  sanitizeString(desc: string) {
    var itemDesc: string = '';
    if (desc) {
      itemDesc = desc.toString().replace(/"/g, '\"');
      itemDesc = itemDesc.replace(/'/g, '\'');
    } else {
      itemDesc = '';
    }
    return itemDesc;
  }

  exportToCsv(jsonResponse: any) {
    const data = jsonResponse;
    const columns = this.getColumns(data);
    const csvData = this.convertToCsv(data, columns);
    this.downloadFile(csvData, 'data.csv', 'text/csv');
  }

  getColumns(data: any[]): string[] {
    const columns: any = [];
    data.forEach(row => {
      Object.keys(row).forEach((col) => {
        if (!columns.includes(col)) {
          columns.push(col);
        }
      });
    });
    return columns;
  }

  convertToCsv(data: any[], columns: string[]): string {
    var _self = this;
    let csv = '';
    csv += columns.join(',') + '\n';
    data.forEach(row => {
      const values: any = [];
      columns.forEach((col: any) => {
        values.push('"' + _self.sanitizeString(row[col]) + '"');
      });
      csv += values.join(',') + '\n';
    });
    return csv;
  }

  downloadFile(data: string, filename: string, type: string) {
    const blob = new Blob([data], { type: type });
    const nav = (window.navigator as any);

    if (nav.msSaveOrOpenBlob) {
      nav.msSaveBlob(blob, filename);
    } else {
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }















  ngOnDestroy(): void { }
}
