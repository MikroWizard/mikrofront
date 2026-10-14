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
  activeSessions: { id: string, device: any, protocol: string, webfigUrl?: SafeResourceUrl, winboxUrl?: SafeResourceUrl, rawWinboxUrl?: string, desktopUrl?: SafeResourceUrl, rawDesktopUrl?: string, token?: string, sessionId?: string }[] = [];
  activeTabIndex = 0;

  public sidebarAutoHide = false;
  public sidebarHint = false;
  private sidebarHintTimer: any;

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

  // Gateway Notice Modal
  showGatewayNoticeModal = false;
  gatewayNoticeType: 'not_installed' | 'update_required' = 'not_installed';
  gatewayNoticeTitle = '';
  gatewayNoticeMessage = '';
  gatewayNoticeDocUrl = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data_provider: dataProvider,
    private sanitizer: DomSanitizer
  ) {
    try {
      this.sidebarAutoHide = localStorage.getItem('mikrowizard_cm_sidebar_autohide') === '1';
    } catch (e) {}
  }

  toggleSidebarAutoHide() {
    this.sidebarAutoHide = !this.sidebarAutoHide;
    try {
      localStorage.setItem('mikrowizard_cm_sidebar_autohide', this.sidebarAutoHide ? '1' : '0');
    } catch (e) {}
    if (this.sidebarAutoHide) {
      this.sidebarHint = true;
      if (this.sidebarHintTimer) clearTimeout(this.sidebarHintTimer);
      this.sidebarHintTimer = setTimeout(() => { this.sidebarHint = false; }, 3000);
    } else {
      this.sidebarHint = false;
    }
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        const protocol = this.route.snapshot.queryParams['protocol'] || '';
        this.loadDeviceDetails(params['id'], protocol);
      }
    });

    this.route.queryParams.subscribe(qParams => {
      const devId = this.route.snapshot.params['id'];
      if (devId && qParams['protocol']) {
        const protocol = qParams['protocol'];
        const existingIndex = this.activeSessions.findIndex(s => s.device && s.device.id == devId && (s.protocol === protocol || (protocol === 'webbox' && s.protocol === 'winbox')));
        if (existingIndex > -1) {
          this.selectTab(existingIndex);
        } else if (this.activeSessions.length > 0) {
          this.loadDeviceDetails(devId, protocol);
        }
      }
    });
  }

  loadDeviceDetails(id: number, protocol: string = '') {
    this.data_provider.getSessionInfo().then((user: any) => {
      const p = (user && user.role === 'customer') ? this.data_provider.customerGetDevices() : this.data_provider.get_devices();
      p.then((res: any) => {
        const devices = res.result || res || [];
        const dev = devices.find((d: any) => d.id == id);
        if (dev) {
          const isWindows = dev.device_type === 'windows' || dev.brand === 'windows';
          const defaultProto = dev.protocol || (isWindows ? 'rdp' : (dev.device_type === 'vnc' ? 'vnc' : 'ssh'));
          let protoToUse = protocol || defaultProto;
          if (isWindows && protoToUse === 'ssh' && (!dev.connection_types || !dev.connection_types.includes('ssh'))) {
            protoToUse = defaultProto;
          }
          this.onDeviceSelected({ device: dev, protocol: protoToUse });
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
              this.target = this.selectedDeviceForTool?.peer_ip || this.selectedDeviceForTool?.ip || this.selectedDeviceForTool?.effective_ip || '8.8.8.8';
              this.toolType = 'ping';
            }
        } else if (eventData.tool === 'speedtest') {
            this.showSpeedTestModal = true;
        } else if (eventData.tool === 'logs') {
            this.showLogsModal = true;
            this.activeLogsTab = 'events';
            this.fetchDeviceLogs();
        } else if (eventData.tool === 'auth') {
            this.showLogsModal = true;
            this.activeLogsTab = 'auth';
        } else if (eventData.tool === 'acc') {
            this.showLogsModal = true;
            this.activeLogsTab = 'acc';
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
    const isWindows = device.device_type === 'windows' || device.brand === 'windows';
    const defaultProto = device.protocol || (isWindows ? 'rdp' : (device.device_type === 'vnc' ? 'vnc' : 'ssh'));
    let protocol = eventData.protocol || defaultProto;
    if (isWindows && protocol === 'ssh' && (!device.connection_types || !device.connection_types.includes('ssh'))) {
      protocol = defaultProto;
    }

    // Check if we have an existing session
    const existingIndex = this.activeSessions.findIndex(s => 
      s.device.id === device.id && (s.protocol === protocol || (protocol === 'webbox' && s.protocol === 'winbox'))
    );
    
    if (existingIndex > -1) {
      if (protocol === 'webfig' || protocol === 'webbox' || protocol === 'winbox') {
        this.selectTab(existingIndex);
      } else if (confirm(`A ${protocol.toUpperCase() || 'terminal'} session is already open for ${device.name}. Open a new session anyway?`)) {
        this.createNewSession(device, protocol);
      } else {
        this.selectTab(existingIndex);
      }
    } else {
      this.createNewSession(device, protocol);
    }
  }

  createNewSession(device: any, protocol: string) {
    if (protocol === 'winbox' || protocol === 'webbox') {
      this.data_provider.MikroWizardRPC.sendJsonRequest('/api/terminal/init', {
        device_id: device.id,
        protocol: 'winbox',
        connection_type: 'winbox'
      }).then((res: any) => {
        if (res && res.token) {
          const rawUrl = res.web_url || ('/terminal-ws/winbox.html?token=' + res.token);
          const session: any = {
            id: 'session_' + new Date().getTime() + '_' + device.id + '_winbox',
            device: device,
            protocol: 'winbox',
            rawWinboxUrl: rawUrl,
            winboxUrl: this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl),
            sessionId: res.session_id,
            token: res.token
          };
          this.activeSessions.push(session);
          this.selectTab(this.activeSessions.length - 1);
        } else if (res && res.status === 'gateway_update_required') {
          this.gatewayNoticeType = 'update_required';
          this.gatewayNoticeTitle = 'Terminal Gateway Update Required';
          this.gatewayNoticeMessage = res.error || 'Your Terminal Gateway container is outdated and does not support WebBox. Please update the Terminal Gateway Docker container to the latest version to use this feature.';
          this.gatewayNoticeDocUrl = res.doc_url || 'https://mikrowizard.com/docs/updating-terminal-gateway-addon/';
          this.showGatewayNoticeModal = true;
        } else if (res && res.status === 'gateway_not_installed') {
          this.gatewayNoticeType = 'not_installed';
          this.gatewayNoticeTitle = 'Terminal Gateway Not Installed';
          this.gatewayNoticeMessage = res.error || 'The MikroWizard Terminal Gateway addon is required to start WebBox sessions. Please ask your administrator to install it.';
          this.gatewayNoticeDocUrl = res.doc_url || 'https://mikrowizard.com/docs/installing-terminal-gatway-addon/';
          this.showGatewayNoticeModal = true;
        } else {
          alert(res?.error || 'Failed to initialize WebBox session.');
        }
      }).catch(() => {
        alert('Failed to initialize WebBox session.');
      });
      return;
    }

    if (protocol === 'rdp' || protocol === 'vnc') {
      this.data_provider.MikroWizardRPC.sendJsonRequest('/api/terminal/init', {
        device_id: device.id,
        protocol: protocol,
        connection_type: protocol
      }).then((res: any) => {
        if (res && res.token) {
          const rawUrl = res.web_url || ('/terminal-ws/desktop.html?token=' + res.token);
          const session: any = {
            id: 'session_' + new Date().getTime() + '_' + device.id + '_' + protocol,
            device: device,
            protocol: protocol,
            rawDesktopUrl: rawUrl,
            desktopUrl: this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl),
            sessionId: res.session_id,
            token: res.token
          };
          this.activeSessions.push(session);
          this.selectTab(this.activeSessions.length - 1);
        } else if (res && (res.status === 'gateway_not_installed' || res.status === 'gateway_update_required')) {
          this.gatewayNoticeType = res.status === 'gateway_not_installed' ? 'not_installed' : 'update_required';
          this.gatewayNoticeTitle = 'Terminal Gateway Required';
          this.gatewayNoticeMessage = res.error || 'The MikroWizard Terminal Gateway addon is required to start remote desktop sessions.';
          this.gatewayNoticeDocUrl = res.doc_url || 'https://mikrowizard.com/docs/installing-terminal-gatway-addon/';
          this.showGatewayNoticeModal = true;
        } else {
          alert(res?.error || `Failed to initialize ${protocol.toUpperCase()} session.`);
        }
      }).catch(() => {
        alert(`Failed to initialize ${protocol.toUpperCase()} session.`);
      });
      return;
    }

    const session: any = { 
      id: 'session_' + new Date().getTime() + '_' + device.id + '_' + protocol,
      device: device,
      protocol: protocol
    };
    
    if (protocol === 'webfig') {
        try {
          localStorage.removeItem('token');
        } catch (e) {}
        session.webfigUrl = this.getWebfigUrl(device);
    }
    
    this.activeSessions.push(session);
    this.selectTab(this.activeSessions.length - 1);
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
        localStorage.removeItem('token');
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((f: any) => {
          if (f && f.src && f.src.includes('/api/proxy/')) {
            const parts = f.src.split('/api/proxy/');
            if (parts.length > 1) {
              const uid = parts[1].split('/')[0];
              if (uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
                navigator.sendBeacon(`/api/proxy/${uid}/close`);
              }
            }
          }
        });
      } catch (e) {}
    }
    if (sess && (sess.protocol === 'winbox' || sess.protocol === 'webbox')) {
      try {
        if (sess.token) {
          navigator.sendBeacon(`/terminal-ws/api/winbox/kill?token=${encodeURIComponent(sess.token)}`);
        }
      } catch (e) {}
    }
    if (sess && (sess.protocol === 'rdp' || sess.protocol === 'vnc')) {
      try {
        if (sess.token) {
          navigator.sendBeacon(`/terminal-ws/api/desktop/kill?token=${encodeURIComponent(sess.token)}`);
        }
      } catch (e) {}
    }
    this.activeSessions.splice(index, 1);
    if (this.activeTabIndex >= this.activeSessions.length) {
      this.selectTab(Math.max(0, this.activeSessions.length - 1));
    } else {
      this.selectTab(this.activeTabIndex);
    }
  }

  drop(event: CdkDragDrop<any[]>) {
    // Keep track of the active session before the move
    const activeSession = this.activeSessions[this.activeTabIndex];
    
    // Move the item in the array
    moveItemInArray(this.activeSessions, event.previousIndex, event.currentIndex);
    
    // Update active tab index so the selected tab doesn't change
    this.activeTabIndex = this.activeSessions.indexOf(activeSession);
    setTimeout(() => this.focusActiveTabIframe(), 50);
  }

  selectTab(index: number): void {
    this.activeTabIndex = index;
    setTimeout(() => {
      this.focusActiveTabIframe();
    }, 50);
  }

  focusIframe(event?: any): void {
    try {
      const iframe = event?.target as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.focus();
        iframe.contentWindow.focus();
        iframe.contentWindow.postMessage('focus', '*');
      }
    } catch (e) {}
  }

  focusActiveTabIframe(): void {
    try {
      const activePane = document.querySelector('.cm-tab-pane:not(.cm-tab-hidden)');
      if (activePane) {
        const iframe = activePane.querySelector('iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.focus();
          iframe.contentWindow.focus();
          iframe.contentWindow.postMessage('focus', '*');
        }
      }
    } catch (e) {}
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
