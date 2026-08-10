import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChildren, QueryList } from '@angular/core';
import { dataProvider } from "../../../providers/mikrowizard/data";
import { formatInTimeZone } from "date-fns-tz";
import { ToasterComponent } from "@coreui/angular";
import { AppToastComponent } from "../../toast-simple/toast.component";

@Component({
  selector: 'app-config-versions',
  templateUrl: './config-versions.component.html',
  styleUrls: ['./config-versions.component.scss'],
})
export class ConfigVersionsComponent implements OnInit, OnChanges {
  @Input() devid: number = 0;
  @Input() ispro: boolean = false;

  public versions: any[] = [];
  public loading: boolean = true;
  public tz: string = "UTC";

  public commandFilter: string = "show_config";
  public commandOptions: { value: string, label: string }[] = [
    { value: "show_config", label: "Backup" },
    { value: "show_interfaces", label: "Interfaces" },
    { value: "show_routing", label: "Routing" },
    { value: "show_arp", label: "ARP Table" },
    { value: "show_version", label: "System Version" },
    { value: "show_log", label: "System Log" },
  ];

  public viewModalVisible: boolean = false;
  public viewRawModalVisible: boolean = false;
  public viewContent: string = "";
  public viewContentRaw: string = "";
  public viewVersion: any = null;

  public diffModalVisible: boolean = false;
  public diffType: string = "unified";
  public diffBefore: string = "";
  public diffAfter: string = "";
  public diffBeforeInfo: any = null;
  public diffAfterInfo: any = null;

  public compareitems: any[] = [];
  public CompareModalVisible: boolean = false;

  public latestAttempt: any = null;
  public latestAttemptLoading: boolean = false;

  toasterForm = { autohide: true, delay: 3000, position: "fixed", fade: true, closeButton: true };

  @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;

  constructor(private data_provider: dataProvider) {}

  ngOnInit(): void {
    this.data_provider.getSessionInfo().then((res: any) => {
      this.tz = res.tz || "UTC";
    });
    if (this.devid) {
      this.loadVersions();
      this.loadLatestAttempt();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['devid'] && this.devid) {
      this.loadVersions();
      this.loadLatestAttempt();
    }
  }

  loadVersions() {
    this.loading = true;
    this.data_provider.get_config_versions({ device_id: this.devid, command_key: this.commandFilter, page: 1, per_page: 50 }).then((res: any) => {
      this.versions = (res.data || []).map((v: any) => {
        v.firstSeenC = v.first_seen_at ? formatInTimeZone(v.first_seen_at, this.tz, "yyyy-MM-dd HH:mm:ss XXX") : "";
        v.lastSeenC = v.last_seen_at ? formatInTimeZone(v.last_seen_at, this.tz, "yyyy-MM-dd HH:mm:ss XXX") : "";
        v._selected = this.compareitems.some(c => c.id === v.id);
        return v;
      });
      this.loading = false;
    }).catch(() => { this.loading = false; });
  }

  loadLatestAttempt() {
    this.latestAttemptLoading = true;
    this.data_provider.get_latest_config_version(this.devid, this.commandFilter).then((res: any) => {
      if (res.data) {
        this.latestAttempt = res.data;
        this.latestAttempt.lastSeenC = res.data.last_seen_at
          ? formatInTimeZone(res.data.last_seen_at, this.tz, "yyyy-MM-dd HH:mm:ss XXX") : "";
      }
      this.latestAttemptLoading = false;
    }).catch(() => { this.latestAttemptLoading = false; });
  }

  show_toast(title: string, body: string, color: string) {
    const { ...props } = { ...this.toasterForm, color, title, body };
    const componentRef = this.viewChildren.first.addToast(AppToastComponent, props, {});
    componentRef.instance["closeButton"] = props.closeButton;
  }

  sizeFmt(bytes: number): string {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return size.toFixed(1) + " " + units[i];
  }

  copyContent(text: string) {
    navigator.clipboard.writeText(text || '').then(() => {
      this.show_toast("Copied", "Content copied to clipboard", "success");
    }).catch(() => {
      this.show_toast("Error", "Failed to copy", "danger");
    });
  }

  viewVersionContent(v: any) {
    this.data_provider.get_config_version(v.id).then((res: any) => {
      if (res.data && res.data.content) {
        this.viewVersion = res.data;
        this.viewContent = res.data.content;
        this.viewModalVisible = true;
      } else {
        this.show_toast("Error", "Could not load version content", "danger");
      }
    });
  }

  viewRawContent(v: any) {
    this.viewVersion = v;
    this.viewContentRaw = "";
    this.data_provider.get_raw_config(v.id).then((res: any) => {
      if (res.data && res.data.content) {
        this.viewContentRaw = res.data.content;
      }
      this.viewRawModalVisible = true;
    });
  }

  addForCompare(v: any) {
    const idx = this.compareitems.findIndex((c: any) => c.id === v.id);
    if (idx >= 0) {
      this.compareitems.splice(idx, 1);
    } else if (this.compareitems.length < 2) {
      this.compareitems.push(v);
    } else {
      this.compareitems.shift();
      this.compareitems.push(v);
    }
    this.versions.forEach(r => { r._selected = this.compareitems.some(c => c.id === r.id); });
  }

  removeCompare(v: any) {
    this.compareitems = this.compareitems.filter((c: any) => c.id !== v.id);
    this.versions.forEach(r => { r._selected = this.compareitems.some(c => c.id === r.id); });
  }

  clearCompare() {
    this.compareitems = [];
    this.versions.forEach(r => { r._selected = false; });
  }

  runCompare() {
    if (this.compareitems.length < 2) {
      this.show_toast("Info", "Select two versions to compare", "info");
      return;
    }
    const a = this.compareitems[0]; const b = this.compareitems[1];
    this.data_provider.get_config_version(a.id).then((r1: any) => {
      this.data_provider.get_config_version(b.id).then((r2: any) => {
        this.diffBefore = (r1.data && r1.data.content) || "";
        this.diffAfter = (r2.data && r2.data.content) || "";
        this.diffBeforeInfo = { version_num: a.version_num, first_seen_at: a.firstSeenC };
        this.diffAfterInfo = { version_num: b.version_num, first_seen_at: b.firstSeenC };
        this.diffModalVisible = true;
      });
    });
  }

  toggleDiffType() {
    this.diffType = this.diffType === "unified" ? "sided" : "unified";
  }

  onCommandFilterChange() {
    this.clearCompare();
    this.loadVersions();
    this.loadLatestAttempt();
  }
}
