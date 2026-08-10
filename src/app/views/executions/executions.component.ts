import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { dataProvider } from "../../providers/mikrowizard/data";
import { Router } from "@angular/router";
import { loginChecker } from "../../providers/login_checker";
import { Table } from 'primeng/table';
import { ToasterComponent } from "@coreui/angular";
import { AppToastComponent } from "../toast-simple/toast.component";
import { formatInTimeZone } from "date-fns-tz";

@Component({
  templateUrl: "executions.component.html",
  styleUrls: ["executions.component.scss"],
})
export class ExecutionsComponent implements OnInit, OnDestroy {
  public uid: number = 0;
  public tz: string = "UTC";
  public ispro: boolean = false;
  public loading: boolean = true;

  public executions: any[] = [];
  public total: number = 0;
  public currentPage: number = 1;
  public perPage: number = 25;

  public filters: any = {
    device_id: null,
    execution_run_id: "",
    user_task_id: null,
    status: "",
    start_date: "",
    end_date: "",
    search: "",
  };

  public statusOptions = [
    { label: "All", value: "" },
    { label: "OK", value: "ok" },
    { label: "Error", value: "error" },
    { label: "Timeout", value: "timeout" },
    { label: "Auth Error", value: "auth_error" },
  ];

  public activeRunId: string = "";
  private pollInterval: any = null;

  public expandedRows: any = {};

  toasterForm = { autohide: true, delay: 3000, position: "fixed" as any, fade: true, closeButton: true };

  public exportModalVisible: boolean = false;
  public exportColumns = [
    { field: 'execution_run_id', label: 'Run ID', selected: true },
    { field: 'device_name', label: 'Device Name', selected: true },
    { field: 'device_ip', label: 'Device IP', selected: true },
    { field: 'created_at', label: 'Executed At', selected: true },
    { field: 'status', label: 'Status', selected: true },
    { field: 'user_name', label: 'Executed By', selected: true },
    { field: 'error_message', label: 'Error Message', selected: false }
  ];

  openExportModal() {
    this.exportModalVisible = true;
  }

  @ViewChild("dt") table!: Table;
  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker,
    private http: HttpClient,
  ) {
    if (!this.login_checker.isLoggedIn()) {
      setTimeout(() => { this.router.navigate(["login"]); }, 100);
    }
    this.data_provider.getSessionInfo().then((res: any) => {
      this.uid = res.uid;
      this.tz = res.tz || "UTC";
      this.ispro = res.ISPRO;
      if (res.role !== "admin") {
        setTimeout(() => { this.router.navigate(["/user/dashboard"]); }, 100);
      }
    });
  }

  ngOnInit(): void {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    this.filters.end_date = now.toISOString().slice(0, 16);
    this.filters.start_date = yesterday.toISOString().slice(0, 16);
    this.initGrid();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) { clearInterval(this.pollInterval); }
  }

  show_toast(title: string, body: string, color: string) {
    const { ...props } = { ...this.toasterForm, color, title, body };
    const componentRef = this.viewChildren.first.addToast(AppToastComponent, props, {});
    componentRef.instance["closeButton"] = props.closeButton;
  }

  private fmtDate(v: any): string {
    if (!v) return "";
    if (v instanceof Date) return v.toISOString().slice(0, 16);
    return typeof v === "string" ? v : "";
  }

  initGrid() {
    this.loading = true;
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.filters.device_id) params.device_id = this.filters.device_id;
    if (this.filters.execution_run_id) params.execution_run_id = this.filters.execution_run_id;
    if (this.filters.user_task_id) params.user_task_id = this.filters.user_task_id;
    if (this.filters.status) params.status = this.filters.status;
    const sd = this.fmtDate(this.filters.start_date);
    if (sd) params.start_date = sd;
    const ed = this.fmtDate(this.filters.end_date);
    if (ed) params.end_date = ed;

    this.data_provider.get_executions(params).then((res: any) => {
      this.executions = (res.data || []).map((e: any) => {
        e.executedC = e.executed_at ? formatInTimeZone(e.executed_at, this.tz, "yyyy-MM-dd HH:mm:ss XXX") : "";
        return e;
      });
      this.total = res.total || 0;
      this.loading = false;
    }).catch(() => { this.loading = false; });
  }

  applyFilters() {
    this.currentPage = 1;
    this.initGrid();
  }

  resetFilters() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    this.filters = {
      device_id: null, execution_run_id: "", user_task_id: null, status: "",
      search: "",
      start_date: yesterday.toISOString().slice(0, 16),
      end_date: now.toISOString().slice(0, 16),
    };
    this.currentPage = 1;
    this.initGrid();
  }

  applyFilterGlobal($event: any) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, 'contains');
  }

  viewVersion(exec: any) {
    if (exec.version_id) {
      const did = exec.device_id?.id || exec.device_id;
      this.router.navigate(["/device-stats", { id: Number(did), tab: 9 }]);
    } else {
      this.show_toast("Info", "No config version linked to this execution", "info");
    }
  }

  public resultsModalVisible: boolean = false;
  public selectedRunExecutions: any[] = [];
  public selectedRunId: string = "";

  openResults(exec: any) {
    this.selectedRunId = exec.execution_run_id;
    this.resultsModalVisible = true;
    this.data_provider.get_executions({ execution_run_id: exec.execution_run_id, per_page: 500 }).then((res: any) => {
      this.selectedRunExecutions = (res.data || []).map((e: any) => {
        e.executedC = e.executed_at ? formatInTimeZone(e.executed_at, this.tz, "yyyy-MM-dd HH:mm:ss XXX") : "";
        return e;
      });
    });
  }

  downloadRunCsv() {
    this.http.post("/api/executions/export", { execution_run_id: this.selectedRunId },
      { responseType: 'text' }).subscribe({
        next: (csv: string) => {
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'executions_' + this.selectedRunId.substring(0, 8) + '.csv'; a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => {
          this.show_toast("Error", "Failed to download CSV", "danger");
        }
      });
  }

  startPolling(runId: string) {
    this.activeRunId = runId;
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      this.data_provider.get_execution_status(runId).then((res: any) => {
        if (res.data && res.data.finished) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          this.activeRunId = "";
          this.initGrid();
          this.show_toast("Success", "Execution completed", "success");
        }
      });
    }, 5000);
  }

  reRun(exec: any) {
    this.data_provider.run_execution({
      device_ids: [Number(exec.device_id)],
      command_key: exec.command_key,
      command_string: exec.command_string,
    }).then((res: any) => {
      if (res.execution_run_id) {
        this.show_toast("Running", "Execution started: " + res.execution_run_id.substring(0, 8), "info");
        this.startPolling(res.execution_run_id);
      }
    });
  }

  localStatusClass(status: string): string {
    return status === "ok" ? "success" : status === "timeout" ? "warning" : status === "auth_error" ? "danger" : "danger";
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.initGrid();
  }

  get pagesArray(): (number | string)[] {
    const total = Math.ceil(this.total / this.perPage) || 1;
    const current = this.currentPage;
    const maxVisible = 5;
    if (total <= maxVisible + 2) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    let start = Math.max(2, current - Math.floor(maxVisible / 2));
    let end = Math.min(total - 1, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(2, end - maxVisible + 1);
    }
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push("...");
    pages.push(total);
    return pages;
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.perPage) || 1;
  }
}
