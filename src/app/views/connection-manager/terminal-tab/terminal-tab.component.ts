import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { NgxSuperSelectOptions } from "ngx-super-select";
import { TerminalService, TerminalSettings, DEFAULT_TERMINAL_SETTINGS } from '../terminal.service';
import { dataProvider } from '../../../providers/mikrowizard/data';

declare var Terminal: any;
declare var FitAddon: any;
declare var WebLinksAddon: any;

@Component({
  selector: 'app-terminal-tab',
  templateUrl: './terminal-tab.component.html',
  styleUrls: ['./terminal-tab.component.scss']
})
export class TerminalTabComponent implements OnInit, OnDestroy {
  @Input() device: any;
  @Input() protocol: string = '';
  @Output() requestClose = new EventEmitter<void>();
  @Output() protocolResolved = new EventEmitter<string>();
  @ViewChild('terminalContainer', { static: true }) terminalContainer!: ElementRef;

  private term: any;
  private fitAddon: any;
  private ws: WebSocket | null = null;
  private resizeObserver: ResizeObserver | null = null;
  public loading = true;
  public error = '';
  public showSettings = false;
  public isDisconnected = false;
  
  public settings: TerminalSettings;

  // Sharing
  public shareUrl: string = '';
  public showShareModal: boolean = false;
  public shareRole: string = 'observer';
  public shareName: string = '';
  public shareType: string = 'guest';
  public shareTargetUser: any = null;
  public sharePassword: string = '';
  public shareOneTime: boolean = false;
  public shareHostApproval: boolean = false;
  public userList: any[] = [];

  constructor(
    private terminalService: TerminalService,
    private data_provider: dataProvider,
    private cd: ChangeDetectorRef
  ) {
    this.settings = this.terminalService.loadLocalSettings();
  }

  ngOnInit() {
    this.loadXtermScripts().then(() => {
      this.initXterm();
      this.connectWebSocket();
    });
    this.loadUsers();
  }
  
  
  
  public shareTargetUserSearch: string = '';
  public shareTargetUserId: any = null;

  onUserSelected(userId: any) {
    this.shareTargetUserId = userId;
    // Set the search text to the user's name for display
    const selectedUser = this.userList.find((u: any) => u.id === userId);
    if (selectedUser) {
      this.shareTargetUserSearch = `${selectedUser.first_name} ${selectedUser.last_name} (${selectedUser.username})`;
    }
  }

  private searchShareUserTimeout: any;

  searchShareUser(query: string) {
    if (this.searchShareUserTimeout) clearTimeout(this.searchShareUserTimeout);
    this.searchShareUserTimeout = setTimeout(() => {
      this.data_provider.get_users(1, 20, query).then((res: any) => {
        console.log('SearchShareUser response:', res);
        if (Array.isArray(res)) {
          this.userList = Array.from(res);
        } else if (res && res.result) {
          this.userList = Array.from(res.result);
        } else if (res && res.data) {
          this.userList = Array.from(res.data);
        }
        this.cd.detectChanges();
      });
    }, 500);
  }

  loadUsers() {
    this.data_provider.get_users(1, 1000, '').then((res: any) => {
      if (res.status === 'success') {
        this.userList = res.data;
      }
    });
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.ws) {
      this.ws.close();
    }
    if (this.term) {
      this.term.dispose();
    }
  }

  private loadXtermScripts(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof Terminal !== 'undefined') {
        return resolve();
      }
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.jsdelivr.net/npm/xterm@5.1.0/css/xterm.css';
      document.head.appendChild(css);

      const script1 = document.createElement('script');
      script1.src = 'https://cdn.jsdelivr.net/npm/xterm@5.1.0/lib/xterm.js';
      script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.7.0/lib/xterm-addon-fit.js';
        script2.onload = () => resolve();
        document.head.appendChild(script2);
      };
      document.head.appendChild(script1);
    });
  }

  private initXterm() {
    this.term = new Terminal({
      cursorBlink: this.settings.cursorBlink,
      cursorStyle: this.settings.cursorStyle,
      fontSize: this.settings.fontSize,
      fontFamily: this.settings.fontFamily,
      theme: {
        background: this.settings.background,
        foreground: this.settings.foreground,
        cursor: this.settings.cursorColor,
        selectionBackground: this.settings.selectionBackground
      }
    });

    this.fitAddon = new FitAddon.FitAddon();
    this.term.loadAddon(this.fitAddon);
    
    this.term.open(this.terminalContainer.nativeElement);
    
    // We start the ResizeObserver here. It fires when the element becomes visible (un-hidden)
    this.resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (this.fitAddon && this.terminalContainer && this.terminalContainer.nativeElement.clientWidth > 0) {
          try { this.fitAddon.fit(); } catch(e) {}
        }
      });
    });
    this.resizeObserver.observe(this.terminalContainer.nativeElement);
  }

  private connectWebSocket() {
    if (!this.device) {
      this.error = "No device provided";
      this.loading = false;
      return;
    }

    this.terminalService.initSession(this.device.id, this.device.brand).then((res: any) => {
      if (res && res.status === 'failed') {
        this.loading = false;
        this.error = res.error || 'Failed to initialize terminal session';
        return;
      }
      this.isDisconnected = false;
      this.sessionId = res.session_id; // Save session ID for sharing
      if (res.protocol) {
        this.protocol = res.protocol;
        this.protocolResolved.emit(res.protocol);
      }
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = `${wsProto}//${wsHost}/terminal-ws/?token=${res.token}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.loading = false;
        
        // Wait for Angular to remove [hidden="loading"] and for the layout to settle
        window.requestAnimationFrame(() => {
          setTimeout(() => {
            if (this.fitAddon) {
              try { this.fitAddon.fit(); } catch(e) {}
            }
            this.term.focus();
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              // Ensure backend gets initial size
              this.ws.send(JSON.stringify({ type: 'resize', cols: this.term.cols, rows: this.term.rows }));
            }
          }, 50); // Small delay allows flexbox to fully expand after un-hiding
        });
      };
      
      this.ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          if (parsed.type === 'join_request') {
            const approved = window.confirm(`Guest '${parsed.participant_name}' wants to join the session. Allow connection?`);
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: 'join_response', req_id: parsed.req_id, approved: approved }));
            }
            return;
          }
        } catch (e) {
          // not JSON, just write to term
        }
        this.term.write(evt.data);
      };
      
      this.ws.onclose = () => {
        if (!this.isDisconnected) {
          this.isDisconnected = true;
          this.term.write('\r\n\x1b[31;1m[Disconnected]\x1b[0m Press Enter to reconnect or ESC to close.\r\n');
        }
      };
      
      this.term.onData((data: string) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(data);
        }
      });
      
      this.term.onKey((e: { key: string, domEvent: KeyboardEvent }) => {
        if (this.isDisconnected) {
          if (e.domEvent.key === 'Enter') {
            this.term.write('\r\n\x1b[33mReconnecting...\x1b[0m\r\n');
            this.loading = true;
            this.isDisconnected = false;
            this.connectWebSocket();
          } else if (e.domEvent.key === 'Escape') {
            this.requestClose.emit();
          }
        }
      });
      
      this.term.onResize((size: {cols: number, rows: number}) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'resize', cols: size.cols, rows: size.rows }));
        }
      });
    }).catch((err: any) => {
      this.loading = false;
      this.error = typeof err === 'string' ? err : (err.message || 'Failed to initialize terminal session');
    });
  }

  public openSettings() {
    this.showSettings = true;
  }

  public cancelSettings() {
    this.showSettings = false;
    // Revert to saved settings
    this.settings = this.terminalService.loadLocalSettings();
    this.updateTerminalSettings(this.settings);
  }

  public previewSettings(newSettings: TerminalSettings) {
    this.updateTerminalSettings(newSettings);
  }

  public applySettings(newSettings: TerminalSettings) {
    this.settings = newSettings;
    this.terminalService.saveLocalSettings(newSettings);
    this.updateTerminalSettings(newSettings);
    this.showSettings = false;
  }
  
  private updateTerminalSettings(settings: TerminalSettings) {
    if (this.term) {
      this.term.options.fontFamily = settings.fontFamily;
      this.term.options.fontSize = settings.fontSize;
      this.term.options.cursorBlink = settings.cursorBlink;
      this.term.options.cursorStyle = settings.cursorStyle;
      this.term.options.theme = {
        background: settings.background,
        foreground: settings.foreground,
        cursor: settings.cursorColor,
        selectionBackground: settings.selectionBackground
      };
      setTimeout(() => {
        if (this.fitAddon) {
          try { this.fitAddon.fit(); } catch(e) {}
        }
      }, 50);
    }
  }

  public focusTerminal() {
    if (this.term) {
      this.term.focus();
    }
  }

  public onContextMenu(event: MouseEvent) {
    if (this.term && this.term.hasSelection()) {
      const selection = this.term.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection).then(() => {
          // Optional: visually indicate copied, e.g. clear selection
          this.term.clearSelection();
        }).catch(err => {
          console.error('Failed to copy text: ', err);
        });
        event.preventDefault();
      }
    }
  }

  public sessionId: string = '';

  public shareSession() {
    if (!this.sessionId) {
      console.error('No active session ID to share');
      return;
    }
    this.shareRole = 'observer';
    this.shareName = '';
    this.shareUrl = '';
    this.shareType = 'guest';
    this.shareTargetUser = null;
    this.shareTargetUserId = null;
    this.shareTargetUserSearch = '';
    this.sharePassword = '';
    this.shareOneTime = false;
    this.shareHostApproval = false;
    this.showShareModal = true;
  }

  public generateShareLink() {
    const targetUserId = this.shareTargetUserId || '';
    this.data_provider.shareSession(this.sessionId, this.shareRole, this.shareName, this.shareType, targetUserId, this.sharePassword, this.shareOneTime, this.shareHostApproval).then((res: any) => {
      if (res.status === 'success') {
        const url = window.location.origin + '/#/terminal-share?token=' + res.token;
        this.shareUrl = url;
      } else {
        alert(res.error || 'Failed to share session');
      }
    });
  }

  public copyShareUrl() {
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.showShareModal = false;
    });
  }

  public exportHistory() {
    if (!this.term) return;
    const buffer = this.term.buffer.active;
    const lines = [];
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true));
      }
    }
    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-${this.device?.name || 'session'}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.term) {
      this.term.write('\r\n\r\nDisconnected by user.\r\n');
    }
  }
}
