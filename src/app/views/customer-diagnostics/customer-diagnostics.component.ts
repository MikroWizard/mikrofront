import { Component, OnInit, OnDestroy } from '@angular/core';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-customer-diagnostics',
  templateUrl: './customer-diagnostics.component.html',
  styleUrls: ['./customer-diagnostics.component.scss']
})
export class CustomerDiagnosticsComponent implements OnInit, OnDestroy {
  public selectedDeviceId: number | null = null;
  private deviceChangeSub: any;

  // Diagnostics results
  public runningFullDiag = false;
  public fullDiagDone = false;
  public pingOk: boolean | null = null;
  public dnsOk: boolean | null = null;
  public dnsResolvedIp = "";
  public interfaces: any[] = [];

  // Standalone tools
  public toolType: 'ping' | 'traceroute' = 'ping';
  public target = '8.8.8.8';
  public pingCount = 4;
  public runningTool = false;
  
  // Results logs
  public toolOutput: string = "";
  public pingResults: any[] = [];
  public tracerouteHops: any[] = [];

  public targetSuggestions = [
    { label: 'Google Public DNS', value: '8.8.8.8' },
    { label: 'Cloudflare DNS', value: '1.1.1.1' },
    { label: 'Google Website', value: 'google.com' }
  ];

  constructor(private data_provider: dataProvider) {}

  ngOnInit(): void {
    const cached = localStorage.getItem('customer_selected_device_id');
    if (cached) {
      this.selectedDeviceId = +cached;
    }

    this.deviceChangeSub = (event: Event) => {
      const customEvent = event as CustomEvent;
      this.selectedDeviceId = customEvent.detail;
      this.resetResults();
    };
    window.addEventListener('customerDeviceChanged', this.deviceChangeSub);
  }

  ngOnDestroy(): void {
    if (this.deviceChangeSub) {
      window.removeEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
  }

  resetResults() {
    this.fullDiagDone = false;
    this.pingOk = null;
    this.dnsOk = null;
    this.dnsResolvedIp = "";
    this.interfaces = [];
    this.toolOutput = "";
    this.pingResults = [];
    this.tracerouteHops = [];
  }

  selectSuggestion(val: string) {
    this.target = val;
  }

  runFullDiagnostics() {
    if (!this.selectedDeviceId) return;
    this.runningFullDiag = true;
    this.fullDiagDone = false;
    this.data_provider.customerGetDiagnostics(this.selectedDeviceId).then((res: any) => {
      this.runningFullDiag = false;
      this.fullDiagDone = true;
      const data = res.result || res;
      if (data && data.status === 'success') {
        this.pingOk = data.ping_ok;
        this.dnsOk = data.dns_ok;
        this.dnsResolvedIp = data.dns_resolved_ip;
        this.interfaces = data.interfaces || [];
      } else {
        this.pingOk = false;
        this.dnsOk = false;
        this.dnsResolvedIp = "Failed to run diagnostics";
      }
    }).catch(err => {
      this.runningFullDiag = false;
      this.fullDiagDone = true;
      this.pingOk = false;
      this.dnsOk = false;
      this.dnsResolvedIp = "Connection error";
    });
  }

  runTool() {
    if (!this.selectedDeviceId || !this.target.trim()) return;
    this.runningTool = true;
    this.toolOutput = "";
    this.pingResults = [];
    this.tracerouteHops = [];

    if (this.toolType === 'ping') {
      this.data_provider.customerPingDevice(this.selectedDeviceId, this.target.trim(), this.pingCount).then((res: any) => {
        this.runningTool = false;
        const data = res.result || res;
        if (data && data.status === 'success' && Array.isArray(data.results)) {
          this.pingResults = data.results;
          this.toolOutput = data.results.map((r: any) => 
            `Reply from ${r.host}: packets_sent=${r.sent} packets_received=${r.received} loss=${r.packet_loss}% rtt_min/avg/max=${r.min_rtt}/${r.avg_rtt}/${r.max_rtt} ms status=${r.status || 'OK'}`
          ).join('\n');
        } else {
          this.toolOutput = data.err || "Failed to execute ping.";
        }
      }).catch(err => {
        this.runningTool = false;
        this.toolOutput = "Connection error while running ping.";
      });
    } else {
      this.data_provider.customerRunTraceroute(this.selectedDeviceId, this.target.trim()).then((res: any) => {
        this.runningTool = false;
        const data = res.result || res;
        if (data && data.status === 'success' && Array.isArray(data.hops)) {
          this.tracerouteHops = data.hops;
          this.toolOutput = data.hops.map((h: any, idx: number) => 
            `${idx + 1}:  ${h.address}  (RTT: ${h.rtt}, Loss: ${h.loss})`
          ).join('\n');
        } else {
          this.toolOutput = data.err || "Failed to execute traceroute.";
        }
      }).catch(err => {
        this.runningTool = false;
        this.toolOutput = "Connection error while running traceroute.";
      });
    }
  }
}
