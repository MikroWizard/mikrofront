import { AfterContentInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
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
  @Input() small_screen: boolean = false;
  @Input() tz: any;
  @Input() devid: any;
  @Output() onRefresh = new EventEmitter<void>();
  
  @ViewChild('dtLeases') dtLeases!: Table;
  @ViewChild('dtHistory') dtHistory!: Table;

  dhcp_history: any;
  dhcp_history_modal: boolean = false;
  current_dhcp: any;

  public leasesExportModalVisible: boolean = false;
  public historyExportModalVisible: boolean = false;

  // Add Lease & Remove Modal States
  public add_lease_modal: boolean = false;
  public confirm_delete_modal: boolean = false;
  public targetLease: any = null;
  public submitting: boolean = false;
  public actionError: string = '';

  public newLease: any = {
    address: '',
    mac: '',
    server: 'all',
    comment: ''
  };

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
      this.dhcp_history_modal = !this.dhcp_history_modal;
    });
  }

  makeStatic(lease: any) {
    const leaseId = lease['.id'] || lease.id;
    if (!leaseId) return;
    this.submitting = true;
    this.data_provider.make_dhcp_lease_static(this.devid, leaseId).then((res: any) => {
      this.submitting = false;
      if (res && res.status === 'failed') {
        alert(res.massage || res.error || 'Failed to make lease static');
      } else {
        this.onRefresh.emit();
      }
    }).catch(err => {
      this.submitting = false;
      alert(err?.message || 'Error occurred');
    });
  }

  makeDynamic(lease: any) {
    const leaseId = lease['.id'] || lease.id;
    if (!leaseId) return;
    this.submitting = true;
    this.data_provider.make_dhcp_lease_dynamic(this.devid, leaseId).then((res: any) => {
      this.submitting = false;
      if (res && res.status === 'failed') {
        alert(res.massage || res.error || 'Failed to make lease dynamic');
      } else {
        this.onRefresh.emit();
      }
    }).catch(err => {
      this.submitting = false;
      alert(err?.message || 'Error occurred');
    });
  }

  openAddLeaseModal() {
    this.newLease = {
      address: '',
      mac: '',
      server: 'all',
      comment: ''
    };
    this.actionError = '';
    this.add_lease_modal = true;
  }

  closeAddLeaseModal() {
    this.add_lease_modal = false;
  }

  submitAddLease() {
    if (!this.newLease.mac || !this.newLease.address) {
      this.actionError = 'MAC Address and IP Address are required.';
      return;
    }
    this.submitting = true;
    this.actionError = '';
    this.data_provider.add_dhcp_lease(this.devid, this.newLease).then((res: any) => {
      this.submitting = false;
      if (res && res.status === 'failed') {
        this.actionError = res.massage || res.error || 'Failed to add static lease';
      } else {
        this.add_lease_modal = false;
        this.onRefresh.emit();
      }
    }).catch(err => {
      this.submitting = false;
      this.actionError = err?.message || 'Failed to add static lease';
    });
  }

  confirmRemoveLease(lease: any) {
    this.targetLease = lease;
    this.actionError = '';
    this.confirm_delete_modal = true;
  }

  closeConfirmDeleteModal() {
    this.confirm_delete_modal = false;
    this.targetLease = null;
  }

  submitRemoveLease() {
    if (!this.targetLease) return;
    const leaseId = this.targetLease['.id'] || this.targetLease.id;
    if (!leaseId) return;
    this.submitting = true;
    this.actionError = '';
    this.data_provider.remove_dhcp_lease(this.devid, leaseId).then((res: any) => {
      this.submitting = false;
      if (res && res.status === 'failed') {
        this.actionError = res.massage || res.error || 'Failed to remove lease';
      } else {
        this.confirm_delete_modal = false;
        this.targetLease = null;
        this.onRefresh.emit();
      }
    }).catch(err => {
      this.submitting = false;
      this.actionError = err?.message || 'Failed to remove lease';
    });
  }

  ngAfterContentInit(): void {
    this.changeDetectorRef.detectChanges();
  }
}
