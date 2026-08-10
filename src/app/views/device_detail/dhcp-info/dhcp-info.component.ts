import { AfterContentInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewChild } from '@angular/core';
import { dataProvider } from "../../../providers/mikrowizard/data";
import { formatInTimeZone } from "date-fns-tz";
import { Table } from 'primeng/table';

@Component({
  selector: 'app-dhcp-info',
  templateUrl: './dhcp-info.component.html',
  styleUrls: ['./dhcp-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class DhcpInfoComponent implements AfterContentInit {
  @Input() dhcp_server_data: any;
  @Input() small_screen: boolean=false;
  @Input() tz: any;
  
  @ViewChild('dtLeases') dtLeases!: Table;
  @ViewChild('dtHistory') dtHistory!: Table;

  dhcp_history:any;
  dhcp_history_modal: boolean = false;
  current_dhcp:any;

  public leasesExportModalVisible: boolean = false;
  public historyExportModalVisible: boolean = false;

  public leaseExportColumns = [
    { field: 'address', label: 'IP Address', selected: true },
    { field: 'dynamic', label: 'Type (Dynamic/Static)', selected: true },
    { field: 'expires-after', label: 'Expires After', selected: true },
    { field: 'host-name', label: 'Host Name', selected: true },
    { field: 'status', label: 'Status', selected: true },
    { field: 'mac-address', label: 'MAC Address', selected: true },
    { field: 'server', label: 'Server', selected: false },
    { field: 'comment', label: 'Comment', selected: false }
  ];

  public historyExportColumns = [
    { field: 'eventtime', label: 'Timestamp', selected: true },
    { field: 'detail', label: 'Type / Detail', selected: true },
    { field: 'comment', label: 'Comment', selected: true },
    { field: 'name', label: 'Router Name', selected: true },
    { field: 'ip', label: 'Router IP', selected: true }
  ];

  openLeasesExportModal() {
    this.leasesExportModalVisible = true;
  }

  openHistoryExportModal() {
    this.historyExportModalVisible = true;
  }
  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private data_provider: dataProvider,
  ) {}

  applyFilterGlobalLeases($event: any, stringVal: string) {
    this.dtLeases.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  applyFilterGlobalHistory($event: any, stringVal: string) {
    this.dtHistory.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }
  show_history(item: any) {
    var _self = this;
    this.data_provider.getDhcpHistory(item).then((res) => {
      _self.current_dhcp = item;
      this.dhcp_history = res.map((d: any) => {
        d.eventtime = formatInTimeZone(
          d.eventtime.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss XXX"
        );
        return d;
      });
      this.dhcp_history_modal=!this.dhcp_history_modal;
    });
  }
  ngAfterContentInit(): void {
    this.changeDetectorRef.detectChanges();
  }
}
