import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { dataProvider } from '../../providers/mikrowizard/data';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-connection-manager',
  templateUrl: './connection-manager.component.html',
  styleUrls: ['./connection-manager.component.scss']
})
export class ConnectionManagerComponent implements OnInit {
  activeSessions: { id: string, device: any, protocol: string, webfigUrl?: SafeResourceUrl }[] = [];
  activeTabIndex = 0;
  
  // Modals state
  showPingModal = false;
  showLogsModal = false;
  showSpeedTestModal = false;
  showCommandsModal = false;
  showVersionsModal = false;
  showExecutionsModal = false;
  showBackupModal = false;
  showSessionsModal = false;
  sessionRecordings: any[] = [];
  sessionsLoading = false;
  deviceExecutions: any[] = [];
  execsLoading = false;
  deviceCommands: any[] = [];
  cmdLoading = false;
  selectedDeviceForTool: any = null;
  isToolRunning = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data_provider: dataProvider,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadDeviceDetails(params['id']);
      }
    });
  }

  loadDeviceDetails(id: number) {
    this.data_provider.getSessionInfo().then((user: any) => {
      const p = (user && user.role === 'customer') ? this.data_provider.customerGetDevices() : this.data_provider.get_devices();
      p.then((res: any) => {
        const devices = res.result || res || [];
        const dev = devices.find((d: any) => d.id == id);
        if (dev) {
          this.onDeviceSelected({ device: dev });
        }
      });
    });
  }

  onDeviceSelected(eventData: any) {
    if (eventData.tool) {
        this.selectedDeviceForTool = eventData.device;
        if (eventData.tool === 'ping') {
            this.showPingModal = true;
            const isMik = !this.selectedDeviceForTool?.device_type || this.selectedDeviceForTool?.device_type === 'mikrotik';
            if (!isMik) {
              this.target = this.selectedDeviceForTool?.peer_ip || this.selectedDeviceForTool?.ip || '8.8.8.8';
              this.toolType = 'ping';
            }
        } else if (eventData.tool === 'speedtest') {
            this.showSpeedTestModal = true;
        } else if (eventData.tool === 'logs') {
            this.showLogsModal = true;
            this.fetchDeviceLogs();
        } else if (eventData.tool === 'commands') {
            this.showCommandsModal = true;
            this.fetchCommands();
        } else if (eventData.tool === 'versions') {
            this.showVersionsModal = true;
        } else if (eventData.tool === 'executions') {
            this.showExecutionsModal = true;
            this.fetchExecutions();
        } else if (eventData.tool === 'backup') {
            this.runBackupForDevice();
        } else if (eventData.tool === 'sessions') {
            this.showSessionsModal = true;
            this.fetchSessions();
        }
        return;
    }

    // Support both direct device passing (legacy) and connection selection {device, protocol}
    const device = eventData.device ? eventData.device : eventData;
    const protocol = eventData.protocol || '';

    // Check if we have an existing session
    const existingIndex = this.activeSessions.findIndex(s => s.device.id === device.id && s.protocol === protocol);
    
    if (existingIndex > -1) {
      if (confirm(`A ${protocol.toUpperCase() || 'terminal'} session is already open for ${device.name}. Open a new session anyway?`)) {
          this.createNewSession(device, protocol);
      } else {
          this.activeTabIndex = existingIndex;
      }
    } else {
      this.createNewSession(device, protocol);
    }
  }

  createNewSession(device: any, protocol: string) {
      const session: any = { 
        id: 'session_' + new Date().getTime() + '_' + device.id + '_' + protocol,
        device: device,
        protocol: protocol
      };
      
      if (protocol === 'webfig') {
          session.webfigUrl = this.getWebfigUrl(device);
      }
      
      this.activeSessions.push(session);
      this.activeTabIndex = this.activeSessions.length - 1;
  }

  getWebfigUrl(device: any): SafeResourceUrl {
    const url = `/api/proxy/init?devid=${device.id}&dev_ip=${device.ip}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  closeSession(index: number, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const sess = this.activeSessions[index];
    if (sess && sess.protocol === 'webfig') {
      try {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((f: any) => {
          if (f && f.src && f.src.includes('/api/proxy/')) {
            const parts = f.src.split('/api/proxy/');
            if (parts.length > 1) {
              const uid = parts[1].split('/')[0];
              if (uid && uid.length > 10) {
                navigator.sendBeacon(`/api/proxy/${uid}/close`);
              }
            }
          }
        });
      } catch (e) {}
    }
    this.activeSessions.splice(index, 1);
    if (this.activeTabIndex >= this.activeSessions.length) {
      this.activeTabIndex = Math.max(0, this.activeSessions.length - 1);
    }
  }

  drop(event: CdkDragDrop<any[]>) {
    // Keep track of the active session before the move
    const activeSession = this.activeSessions[this.activeTabIndex];
    
    // Move the item in the array
    moveItemInArray(this.activeSessions, event.previousIndex, event.currentIndex);
    
    // Update active tab index so the selected tab doesn't change
    this.activeTabIndex = this.activeSessions.indexOf(activeSession);
  }

  returnToDashboard() {
    this.router.navigate(['/dashboard']);
  }
  

  // Manual Testing Tools State
  toolType: 'ping' | 'traceroute' = 'ping';
  target = '8.8.8.8';
  pingCount = 4;
  runningTool = false;
  toolOutput: string = "";
  pingResults: any[] = [];
  tracerouteHops: any[] = [];
  
  targetSuggestions = [
    { label: 'Google Public DNS', value: '8.8.8.8' },
    { label: 'Cloudflare DNS', value: '1.1.1.1' },
    { label: 'Google Website', value: 'google.com' }
  ];

  selectSuggestion(val: string) {
    this.target = val;
  }

  runTool() {
    if (!this.selectedDeviceForTool || !this.target.trim()) return;
    this.runningTool = true;
    this.toolOutput = "";
    this.pingResults = [];
    this.tracerouteHops = [];

    if (this.toolType === 'ping') {
      const isMik = !this.selectedDeviceForTool?.device_type || this.selectedDeviceForTool?.device_type === 'mikrotik';
      const pingFn = isMik
        ? this.data_provider.customerPingDevice(this.selectedDeviceForTool.id, this.target.trim(), this.pingCount)
        : this.data_provider.pingDevice(this.selectedDeviceForTool.id, this.target.trim(), this.pingCount);
      pingFn.then((res: any) => {
        this.runningTool = false;
        const data = res.result || res;
        if (data && data.status === 'success' && Array.isArray(data.results)) {
          // MikroTik API ping format
          this.pingResults = data.results;
          this.toolOutput = data.results.map((r: any) =>
            `Reply from ${r.host}: loss=${r.packet_loss}% rtt=${r.avg_rtt}ms`)
            .join('\n');
        } else if (data && Array.isArray(data.results)) {
          // Server ping format (from ping.py)
          this.pingResults = data.results;
          this.toolOutput = data.results.map((r: any) =>
            `Reply from ${r.host}: time=${r.time}ms status=${r.status}`)
            .join('\n');
        } else {
          this.toolOutput = data.err || data.error || "Failed to execute ping.";
        }
      }).catch(err => {
        this.runningTool = false;
        this.toolOutput = "Connection error while running ping.";
      });
    } else {
      this.data_provider.customerRunTraceroute(this.selectedDeviceForTool.id, this.target.trim()).then((res: any) => {
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
  
  // Logs State
  activeLogsTab: 'events' | 'auth' | 'acc' = 'events';

  isDarkMode: boolean = false;

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
  }

  fetchDeviceLogs() {
      if (!this.selectedDeviceForTool) return;
      this.activeLogsTab = 'events';
  }

  runBackupForDevice() {
    if (!this.selectedDeviceForTool) return;
    this.data_provider.run_execution({
      device_ids: [this.selectedDeviceForTool.id],
      command_key: 'show_config'
    }).then((res: any) => {
      alert('Backup started for ' + this.selectedDeviceForTool.name + '\nRun ID: ' + (res.execution_run_id || '').substring(0, 12));
    }).catch(() => {
      alert('Backup failed for ' + this.selectedDeviceForTool.name);
    });
  }

  fetchSessions() {
    if (!this.selectedDeviceForTool) return;
    this.sessionsLoading = true;
    this.sessionRecordings = [];
    this.data_provider.sessionsByDevice(this.selectedDeviceForTool.id).then((res: any) => {
      const data = res.data || res.result || res || [];
      this.sessionRecordings = (Array.isArray(data) ? data : []).slice(0, 20);
      this.sessionsLoading = false;
    }).catch(() => {
      this.sessionsLoading = false;
    });
  }

  refreshModal(which: string) {
    if (which === 'versions') { this.showVersionsModal = false; setTimeout(() => { this.showVersionsModal = true; }, 50); }
    if (which === 'executions') { this.fetchExecutions(); }
    if (which === 'commands') { this.fetchCommands(); }
  }

  fetchCommands() {
    if (!this.selectedDeviceForTool) return;
    this.cmdLoading = true;
    this.data_provider.terminalLogSearch({ device_id: this.selectedDeviceForTool.id, per_page: 50 }).then((res: any) => {
      this.deviceCommands = (res.data || res.result || []).slice(0, 50);
      this.cmdLoading = false;
    }).catch(() => {
      this.cmdLoading = false;
    });
  }

  playRecording(session: any) {
    if (session.recording_path) {
      window.open('/api/terminal/recording/stream/' + session.id, '_blank');
    }
  }

  isSelectedDeviceNonMikrotik(): boolean {
    const dt = this.selectedDeviceForTool?.device_type;
    return dt && dt !== 'mikrotik';
  }

  fetchExecutions() {
    if (!this.selectedDeviceForTool) return;
    this.execsLoading = true;
    this.data_provider.get_executions({
      device_id: this.selectedDeviceForTool.id,
      per_page: 20
    }).then((res: any) => {
      this.deviceExecutions = res.data || [];
      this.execsLoading = false;
    }).catch(() => {
      this.execsLoading = false;
    });
  }
}
