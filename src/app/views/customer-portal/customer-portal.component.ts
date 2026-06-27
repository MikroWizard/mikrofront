import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { dataProvider } from '../../providers/mikrowizard/data';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customer-portal',
  templateUrl: './customer-portal.component.html',
  styleUrls: ['./customer-portal.component.scss']
})
export class CustomerPortalComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  // Devices & Selection
  public devices: any[] = [];
  public selectedDeviceId: number | null = null;
  public loadingDevices = true;

  // Selected Router Details
  public isOnline = false;
  public uptime = "";
  public firmware = "";
  public architecture = "";
  public model = "";
  public ipAddress = "";

  // Connected Clients
  public clients: any[] = [];
  public loadingClients = false;

  // Wi-Fi Interfaces & Form
  public wifiInterfaces: any[] = [];
  public selectedWifiInterface: any = null;
  public loadingWifiInterfaces = false;
  public wifiForm: FormGroup;
  public updatingWifi = false;
  public wifiSuccessMsg = "";
  public wifiErrorMsg = "";
  public activeToolTab = 'wifi';

  // Diagnostics (Ping)
  public pingTarget = "";
  public pingCount = 4;
  public pinging = false;
  public pingResults: any[] = [];
  public pingSuccessMsg = "";
  public pingErrorMsg = "";

  // Power (Reboot)
  public rebooting = false;
  public rebootConfirmVisible = false;
  public rebootSuccessMsg = "";
  public rebootErrorMsg = "";

  // Charts & Metrics
  public devsensors: any = null;
  public delta = "live";
  public total_type = "bps";
  public loadingSensors = false;
  private sensorsTimer: any = null;

  // AI Support Chat
  public chatHistory: any[] = [
    { role: 'assistant', content: 'Hello! I am your ISP AI virtual support assistant. How can I help you manage your router today?' }
  ];
  public chatInput = "";
  public sendingChat = false;
  public chatVisible = false;
  public selectedDeviceName = "";
  
  // AI Support Chat Sessions
  public showSessionsList = false;
  public chatSessions: any[] = [];
  public activeSessionId: number | null = null;
  public loadingSessions = false;
  public renameSessionId: number | null = null;
  public renameTitle = "";
  public isDarkTheme = false;
  public isMaximized = false;

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('chat_theme', this.isDarkTheme ? 'dark' : 'light');
  }

  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }

  toggleChat() {
    this.chatVisible = !this.chatVisible;
  }



  constructor(
    private data_provider: dataProvider,
    private router: Router
  ) {
    this.wifiForm = new FormGroup({
      interface_name: new FormControl(''),
      interface_type: new FormControl('legacy'),
      ssid: new FormControl(''),
      password: new FormControl('', [Validators.minLength(8)])
    });


  }

  private deviceChangeSub: any;

  get selectedDeviceHasWebfig(): boolean {
    if (!this.selectedDeviceId) return false;
    const dev = this.devices.find(d => +d.id === +this.selectedDeviceId!);
    return dev ? dev.allow_webfig === true : false;
  }

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('chat_theme');
    this.isDarkTheme = savedTheme === 'dark';

    // Listen to global router selection changes
    this.deviceChangeSub = (event: Event) => {
      const customEvent = event as CustomEvent;
      this.selectedDeviceId = customEvent.detail;
      this.onDeviceChange();
    };
    window.addEventListener('customerDeviceChanged', this.deviceChangeSub);

    // Initial load
    this.loadDevices();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.sensorsTimer) {
      clearInterval(this.sensorsTimer);
    }
    if (this.deviceChangeSub) {
      window.removeEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
  }

  scrollToBottom(): void {
    try {
      this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  loadDevices() {
    this.loadingDevices = true;
    this.data_provider.customerGetDevices().then((res: any) => {
      this.loadingDevices = false;
      if (res && res.result && Array.isArray(res.result)) {
        this.devices = res.result;
      } else if (Array.isArray(res)) {
        this.devices = res;
      } else {
        this.devices = [];
      }

      if (this.devices.length > 0) {
        const cached = localStorage.getItem('customer_selected_device_id');
        if (cached && this.devices.some(d => +d.id === +cached)) {
          this.selectedDeviceId = +cached;
        } else {
          this.selectedDeviceId = +this.devices[0].id;
          localStorage.setItem('customer_selected_device_id', this.selectedDeviceId.toString());
          window.dispatchEvent(new CustomEvent('customerDeviceChanged', { detail: this.selectedDeviceId }));
        }
        this.onDeviceChange();
      }
    }).catch(err => {
      this.loadingDevices = false;
      this.devices = [];
    });
  }

  onDeviceChange() {
    if (!this.selectedDeviceId) return;

    const dev = this.devices.find(d => +d.id === +this.selectedDeviceId!);
    if (dev) {
      this.ipAddress = dev.ip || 'N/A';
      this.model = dev.router_type || dev.name || 'N/A';
      this.firmware = dev.current_firmware || 'N/A';
      this.architecture = dev.arch || 'N/A';
      this.uptime = dev.uptime || 'N/A';
      this.isOnline = dev.online === true;
      this.selectedDeviceName = dev.name || dev.router_type || 'N/A';
    }

    this.wifiSuccessMsg = "";
    this.wifiErrorMsg = "";
    this.pingResults = [];
    this.pingSuccessMsg = "";
    this.pingErrorMsg = "";
    this.rebootSuccessMsg = "";
    this.rebootErrorMsg = "";

    this.loadChatHistory();
    this.loadDeviceDetails();
  }

  loadDeviceDetails() {
    if (!this.selectedDeviceId) return;
    
    // Clear existing intervals
    if (this.sensorsTimer) {
      clearInterval(this.sensorsTimer);
      this.sensorsTimer = null;
    }
    this.devsensors = null;

    // Load wifi interfaces
    this.loadingWifiInterfaces = true;
    this.wifiInterfaces = [];
    this.selectedWifiInterface = null;
    this.wifiForm.reset();

    this.data_provider.customerGetWifiInterfaces(this.selectedDeviceId).then((res: any) => {
      this.loadingWifiInterfaces = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.wifiInterfaces = data;
        if (this.wifiInterfaces.length > 0) {
          this.selectWifiInterface(this.wifiInterfaces[0]);
        }
      }
    }).catch(err => {
      this.loadingWifiInterfaces = false;
    });

    // Load metrics if online
    if (this.isOnline) {
      this.loadSensors();
      this.sensorsTimer = setInterval(() => {
        this.loadSensors();
      }, 30000);
    }

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

  loadSensors() {
    if (!this.selectedDeviceId) return;
    this.loadingSensors = true;
    this.data_provider.get_dev_sensors(this.selectedDeviceId, this.delta, this.total_type).then((res: any) => {
      this.loadingSensors = false;
      this.devsensors = res;
    }).catch(err => {
      this.loadingSensors = false;
    });
  }

  changeDelta(d: string) {
    this.delta = d;
    this.loadSensors();
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
      }
    }).catch(err => {
      this.loadingClients = false;
      this.clients = [];
    });
  }

  // Signal Strength Visualization Helpers
  getSignalPercentage(signal: string): number {
    if (!signal) return 0;
    const match = signal.match(/-(\d+)/);
    if (match) {
      const dbm = parseInt(match[1]);
      // Mapping -100dBm (0%) to -50dBm (100%)
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

  // Direct Wi-Fi Credentials Update
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
    }).catch(err => {
      this.updatingWifi = false;
      this.wifiErrorMsg = "Connection error with server.";
    });
  }

  // Diagnostics (Ping Tool)
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
    }).catch(err => {
      this.pinging = false;
      this.pingErrorMsg = "Server connection lost during ping.";
    });
  }

  // Power (Reboot Tool)
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
        this.isOnline = false;
        // Verify connectivity again after 15 seconds
        setTimeout(() => {
          this.loadDeviceDetails();
        }, 15000);
      } else {
        this.rebootErrorMsg = res.err || (data ? data.err : "Failed to reboot router.");
      }
    }).catch(err => {
      this.rebooting = false;
      this.rebootErrorMsg = "Server connection lost during reboot request.";
    });
  }

  // AI Chat Sessions Management
  toggleSessionsList() {
    this.showSessionsList = !this.showSessionsList;
    if (this.showSessionsList) {
      this.loadChatSessions();
    }
  }

  loadChatSessions() {
    this.loadingSessions = true;
    this.data_provider.customerGetChatSessions(this.selectedDeviceId || undefined).then((res: any) => {
      this.loadingSessions = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.chatSessions = data;
        if (this.chatSessions.length > 0) {
          const stillExists = this.activeSessionId && this.chatSessions.some(s => s.id === this.activeSessionId);
          if (!stillExists) {
            this.selectSession(this.chatSessions[0].id);
          } else {
            this.loadSessionDetail(this.activeSessionId!);
          }
        } else {
          this.createNewSession();
        }
      } else {
        this.chatSessions = [];
        this.createNewSession();
      }
    }).catch(err => {
      this.loadingSessions = false;
      this.chatSessions = [];
      this.createNewSession();
    });
  }

  createNewSession() {
    this.loadingSessions = true;
    const title = "Chat Session " + new Date().toLocaleString();
    this.data_provider.customerCreateChatSession(this.selectedDeviceId || undefined, title).then((res: any) => {
      this.loadingSessions = false;
      const session = res.result || res;
      if (session && session.id) {
        this.activeSessionId = session.id;
        this.loadChatSessions();
      }
    }).catch(err => {
      this.loadingSessions = false;
    });
  }

  createNewSessionFromUI() {
    this.createNewSession();
    this.showSessionsList = false;
  }

  selectSession(sid: number) {
    this.activeSessionId = sid;
    this.loadSessionDetail(sid);
  }

  selectSessionFromUI(sid: number) {
    this.selectSession(sid);
    this.showSessionsList = false;
  }

  loadSessionDetail(sid: number) {
    this.data_provider.customerGetChatSession(sid).then((res: any) => {
      const data = res.result || res;
      if (data && data.history) {
        this.chatHistory = data.history;
      }
    }).catch(err => {});
  }

  startRenameSession(session: any, event: MouseEvent) {
    event.stopPropagation();
    this.renameSessionId = session.id;
    this.renameTitle = session.title;
  }

  cancelRenameSession(event: MouseEvent) {
    event.stopPropagation();
    this.renameSessionId = null;
    this.renameTitle = "";
  }

  saveRenameSession(sid: number) {
    if (!this.renameTitle.trim()) return;
    this.data_provider.customerRenameChatSession(sid, this.renameTitle.trim()).then((res: any) => {
      this.renameSessionId = null;
      this.renameTitle = "";
      this.loadChatSessionsListOnly();
    }).catch(err => {});
  }

  deleteSession(sid: number) {
    if (!confirm("Are you sure you want to delete this chat session?")) return;
    this.data_provider.customerDeleteChatSession(sid).then((res: any) => {
      if (this.activeSessionId === sid) {
        this.activeSessionId = null;
      }
      this.loadChatSessions();
    }).catch(err => {});
  }

  loadChatSessionsListOnly() {
    this.data_provider.customerGetChatSessions(this.selectedDeviceId || undefined).then((res: any) => {
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.chatSessions = data;
      }
    }).catch(err => {});
  }

  loadChatHistory() {
    this.loadChatSessions();
  }

  sendChatMessage() {
    if (!this.chatInput.trim() || this.sendingChat || !this.activeSessionId) return;

    const userText = this.chatInput.trim();
    this.chatInput = "";
    this.sendingChat = true;

    this.chatHistory.push({ role: 'user', content: userText });
    this.scrollToBottom();

    this.data_provider.customerSendChatMessage(this.activeSessionId, userText).then((res: any) => {
      this.sendingChat = false;
      const data = res.result || res;
      if (data) {
        if (data.history) {
          this.chatHistory = data.history;
          const lastMsg = this.chatHistory[this.chatHistory.length - 1];
          if (lastMsg && lastMsg.role !== 'assistant' && data.reply) {
            this.chatHistory.push({ role: 'assistant', content: data.reply });
          }
        } else if (data.reply) {
          this.chatHistory.push({ role: 'assistant', content: data.reply });
        }
      } else {
        this.chatHistory.push({ role: 'assistant', content: "I encountered an error. Please try again." });
      }
      this.scrollToBottom();
      this.loadChatSessionsListOnly();
    }).catch(err => {
      this.sendingChat = false;
      this.chatHistory.push({ role: 'assistant', content: "Server communication lost. Please check connection." });
      this.scrollToBottom();
    });
  }

  clearChat() {
    if (confirm("Are you sure you want to start a new chat session?")) {
      this.createNewSession();
    }
  }

  // WebFig Proxy Integration
  openWebfig() {
    if (!this.selectedDeviceId) return;
    const dev = this.devices.find(d => +d.id === +this.selectedDeviceId!);
    if (!dev) return;

    // Open proxy window
    const url = `/api/proxy/init?devid=${dev.id}&dev_ip=${dev.ip}`;
    window.open(url, '_blank');
  }

}
