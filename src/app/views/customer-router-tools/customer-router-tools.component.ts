import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-customer-router-tools',
  templateUrl: './customer-router-tools.component.html',
  styleUrls: ['./customer-router-tools.component.scss']
})
export class CustomerRouterToolsComponent implements OnInit, OnDestroy, OnChanges {

  @Input() deviceId: number | null = null;
  @Input() isAdminView: boolean = false;
  public selectedDeviceId: number | null = null;
  private deviceChangeSub: any;

  // Active Tab
  public activeToolTab: string = 'wifi'; // 'wifi', 'ping', 'power'

  // Connected Clients
  public loadingClients: boolean = false;
  public clients: any[] = [];
  public clientsBySource: { [source: string]: any[] } = {
    dhcp: [],
    wifi_legacy: [],
    wifi_v7: [],
    arp: [],
    ppp: [],
    hotspot: []
  };

  public clientTabs = [
    { id: 'dhcp', label: 'DHCP Leases' },
    { id: 'wifi_legacy', label: 'Wireless (Legacy)' },
    { id: 'wifi_v7', label: 'Wireless (v7)' },
    { id: 'arp', label: 'ARP Table' },
    { id: 'ppp', label: 'PPP Sessions' },
    { id: 'hotspot', label: 'Hotspot Sessions' }
  ];
  public activeClientTab: string = 'dhcp';
  public searchQuery: string = '';
  public currentPage: number = 1;
  public pageSize: number = 10;

  // Wi-Fi Config
  public loadingWifiInterfaces: boolean = false;
  public wifiInterfaces: any[] = [];
  public selectedWifiInterface: any = null;
  public wifiForm: FormGroup;
  public updatingWifi: boolean = false;
  public wifiSuccessMsg: string = '';
  public wifiErrorMsg: string = '';

  // Ping Tool
  public pingTarget: string = '';
  public pingCount: number = 4;
  public pinging: boolean = false;
  public pingResults: any[] = [];
  public pingSuccessMsg: string = '';
  public pingErrorMsg: string = '';

  // Power (Reboot) Tool
  public rebootConfirmVisible: boolean = false;
  public rebooting: boolean = false;
  public rebootSuccessMsg: string = '';
  public rebootErrorMsg: string = '';

  constructor(
    private data_provider: dataProvider,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.wifiForm = this.fb.group({
      interface_name: ['', Validators.required],
      interface_type: ['', Validators.required],
      ssid: ['', Validators.required],
      password: ['']
    });
  }

  ngOnInit(): void {
    if (this.isAdminView && this.activeClientTab === 'dhcp') {
      this.activeClientTab = 'wifi_legacy';
    }
    if (this.deviceId) {
      this.selectedDeviceId = this.deviceId;
      this.loadDeviceDetails();
    } else {
      const cached = localStorage.getItem('customer_selected_device_id');
      if (cached) {
        this.selectedDeviceId = +cached;
        this.loadDeviceDetails();
      }

      // Listen to global device change event from top-nav
      this.deviceChangeSub = (event: Event) => {
        const customEvent = event as CustomEvent;
        this.selectedDeviceId = customEvent.detail;
        this.loadDeviceDetails();
      };
      window.addEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['deviceId'] && !changes['deviceId'].isFirstChange()) {
      this.selectedDeviceId = changes['deviceId'].currentValue;
      this.loadDeviceDetails();
    }
  }

  ngOnDestroy(): void {
    if (this.deviceChangeSub) {
      window.removeEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
  }

  loadDeviceDetails() {
    if (!this.selectedDeviceId) return;

    this.wifiSuccessMsg = "";
    this.wifiErrorMsg = "";
    this.pingResults = [];
    this.pingSuccessMsg = "";
    this.pingErrorMsg = "";
    this.rebootSuccessMsg = "";
    this.rebootErrorMsg = "";

    // Load wifi interfaces
    this.loadingWifiInterfaces = true;
    this.wifiInterfaces = [];
    this.selectedWifiInterface = null;
    this.wifiForm.reset();

    // Reusing the same data_provider method that calls /api/customer/devices/<devid>/wifi-interfaces
    this.data_provider.customerGetWifiInterfaces(this.selectedDeviceId).then((res: any) => {
      this.loadingWifiInterfaces = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.wifiInterfaces = data;
        if (this.wifiInterfaces.length > 0) {
          this.selectWifiInterface(this.wifiInterfaces[0]);
        }
      }
    }).catch((err: any) => {
      this.loadingWifiInterfaces = false;
    });

    this.loadClients();
  }

  selectWifiInterface(iface: any) {
    this.selectedWifiInterface = iface;
    if (iface) {
      this.wifiForm.patchValue({
        interface_name: iface.name,
        interface_type: iface.type,
        ssid: iface.ssid,
        password: iface.password || ''
      });
    }
  }

  updateWifi() {
    if (this.wifiForm.invalid || !this.selectedDeviceId || !this.selectedWifiInterface) return;

    this.updatingWifi = true;
    this.wifiSuccessMsg = "";
    this.wifiErrorMsg = "";

    const payload = {
      interface_name: this.wifiForm.get('interface_name')!.value,
      interface_type: this.wifiForm.get('interface_type')!.value,
      ssid: this.wifiForm.get('ssid')!.value,
      password: this.wifiForm.get('password')!.value
    };

    this.data_provider.customerUpdateWifi(this.selectedDeviceId, payload).then((res: any) => {
      this.updatingWifi = false;
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.wifiSuccessMsg = data.message || "Wi-Fi credentials updated successfully!";
        this.loadDeviceDetails();
      } else {
        this.wifiErrorMsg = res.err || (data ? data.err : "Failed to update Wi-Fi settings.");
      }
    }).catch((err: any) => {
      this.updatingWifi = false;
      this.wifiErrorMsg = "Connection error with server.";
    });
  }

  runPing() {
    if (!this.pingTarget.trim() || !this.selectedDeviceId || this.pinging) return;
    this.pinging = true;
    this.pingResults = [];
    this.pingSuccessMsg = "";
    this.pingErrorMsg = "";

    this.data_provider.customerPingDevice(this.selectedDeviceId, this.pingTarget.trim(), this.pingCount).then((res: any) => {
      this.pinging = false;
      const data = res.result || res;
      if (data && data.status === 'success' && Array.isArray(data.results)) {
        this.pingResults = data.results;
        this.pingSuccessMsg = "Ping completed successfully.";
      } else {
        this.pingErrorMsg = res.err || (data ? data.err : "Failed to execute ping.");
      }
    }).catch((err: any) => {
      this.pinging = false;
      this.pingErrorMsg = "Server connection lost during ping.";
    });
  }

  openRebootModal() {
    this.rebootSuccessMsg = "";
    this.rebootErrorMsg = "";
    this.rebootConfirmVisible = true;
  }

  executeReboot() {
    if (!this.selectedDeviceId || this.rebooting) return;
    this.rebooting = true;
    this.rebootConfirmVisible = false;

    this.data_provider.customerRebootDevice(this.selectedDeviceId).then((res: any) => {
      this.rebooting = false;
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.rebootSuccessMsg = data.message || "Reboot command sent successfully.";
      } else {
        this.rebootErrorMsg = res.err || (data ? data.err : "Failed to reboot router.");
      }
    }).catch((err: any) => {
      this.rebooting = false;
      this.rebootErrorMsg = "Server connection lost during reboot request.";
    });
  }

  loadClients() {
    if (!this.selectedDeviceId) return;
    this.loadingClients = true;
    this.clients = [];
    this.data_provider.customerGetConnectedClients(this.selectedDeviceId).then((res: any) => {
      this.loadingClients = false;
      const data = res.result || res;
      if (data && data.connected_clients) {
        this.clients = data.connected_clients;
        this.groupClients();
      }
    }).catch((err: any) => {
      this.loadingClients = false;
      this.clients = [];
      this.groupClients();
    });
  }

  groupClients() {
    this.clientsBySource = {
      dhcp: [],
      wifi_legacy: [],
      wifi_v7: [],
      arp: [],
      ppp: [],
      hotspot: []
    };
    
    for (const client of this.clients) {
      const src = client.source || 'unknown';
      if (!this.clientsBySource[src]) {
        this.clientsBySource[src] = [];
      }
      this.clientsBySource[src].push(client);
    }
    
    // Set first available tab as active
    for (const tab of this.clientTabs) {
      if (this.clientsBySource[tab.id]?.length > 0) {
        this.activeClientTab = tab.id;
        break;
      }
    }
  }

  setActiveClientTab(tabId: string) {
    this.activeClientTab = tabId;
    this.currentPage = 1;
    this.searchQuery = '';
  }

  get filteredClients() {
    let list = this.clientsBySource[this.activeClientTab] || [];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(c => {
         return Object.values(c).some(val => val && String(val).toLowerCase().includes(q));
      });
    }
    return list;
  }

  get paginatedClients() {
    const list = this.filteredClients;
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredClients.length / this.pageSize) || 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  changePageSize(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.pageSize = parseInt(target.value, 10);
    this.currentPage = 1;
  }

  // Helpers
  getSignalPercentage(signal: string): number {
    if (!signal) return 0;
    const match = signal.match(/-(\d+)/);
    if (match) {
      const dbm = parseInt(match[1]);
      const pct = Math.round(((100 - dbm) / 50) * 100);
      return Math.max(0, Math.min(100, pct));
    }
    return 50;
  }

  getSignalColor(signal: string): string {
    const pct = this.getSignalPercentage(signal);
    if (pct > 75) return '#10b981'; // Green
    if (pct > 45) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  }
}
