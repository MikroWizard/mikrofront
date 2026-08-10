import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-customer-chat-widget',
  templateUrl: './customer-chat-widget.component.html',
  styleUrls: ['./customer-chat-widget.component.scss']
})
export class CustomerChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  // Devices & Selection
  public devices: any[] = [];
  public selectedDeviceId: number | null = null;
  public selectedDeviceName = "";

  // AI Support Chat
  public chatHistory: any[] = [
    { role: 'assistant', content: 'Hello! I am your ISP AI virtual support assistant. How can I help you manage your router today?' }
  ];
  public chatInput = "";
  public sendingChat = false;
  public chatVisible = false;
  
  // AI Support Chat Sessions
  public showSessionsList = false;
  public chatSessions: any[] = [];
  public activeSessionId: number | null = null;
  public loadingSessions = false;
  public renameSessionId: number | null = null;
  public renameTitle = "";
  public isDarkTheme = false;
  public isMaximized = false;

  private deviceChangeSub: any;

  constructor(private data_provider: dataProvider) {}

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('chat_theme');
    this.isDarkTheme = savedTheme === 'dark';

    // Listen to global router selection changes
    this.deviceChangeSub = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        this.selectedDeviceId = +customEvent.detail;
        this.onDeviceChange();
      }
    };
    window.addEventListener('customerDeviceChanged', this.deviceChangeSub);

    this.loadDevices();
  }

  ngOnDestroy() {
    if (this.deviceChangeSub) {
      window.removeEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
  }

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

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.chatScrollContainer) {
          this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
        }
      } catch(err) { }
    }, 50);
  }

  loadDevices() {
    this.data_provider.customerGetDevices().then((res: any) => {
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
        }
        this.onDeviceChange();
      }
    }).catch(err => {
      this.devices = [];
    });
  }

  onDeviceChange() {
    if (!this.selectedDeviceId) return;

    // Clear current chat view when switching devices
    this.activeSessionId = null;
    this.chatHistory = [
      { role: 'assistant', content: 'Hello! I am your ISP AI virtual support assistant. How can I help you manage your router today?' }
    ];

    const dev = this.devices.find(d => +d.id === +this.selectedDeviceId!);
    if (dev) {
      this.selectedDeviceName = dev.name || dev.router_type || 'N/A';
    } else {
      this.selectedDeviceName = "";
    }

    this.loadChatHistory();
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
        this.scrollToBottom();
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
}
