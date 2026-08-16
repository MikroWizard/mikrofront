import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TerminalService, TerminalSettings, DEFAULT_TERMINAL_SETTINGS } from './terminal.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss'],
})
export class TerminalComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('terminalContainer', { static: true }) terminalContainer!: ElementRef<HTMLDivElement>;

  private term: any;
  private ws: WebSocket | null = null;

  deviceId: number = 0;
  deviceBrand: string = 'mikrotik';
  protocol: string = '';
  sessionToken: string = '';
  sessionId: string = '';
  isConnected: boolean = false;
  isConnecting: boolean = true;
  isDisconnected: boolean = false;
  errorMessage: string = '';
  gatewayNotInstalled: boolean = false;
  gatewayDocUrl: string = 'https://mikrowizard.com/docs/installing-terminal-gatway-addon/';

  showSettings: boolean = false;
  settings: TerminalSettings = { ...DEFAULT_TERMINAL_SETTINGS };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private terminalService: TerminalService
  ) {}

  ngOnInit(): void {
    this.deviceId = Number(this.route.snapshot.paramMap.get('deviceId'));
    this.deviceBrand = this.route.snapshot.paramMap.get('brand') || 'mikrotik';
    this.protocol = this.route.snapshot.paramMap.get('protocol') || '';

    if (!this.deviceId) {
      this.errorMessage = 'Invalid device ID';
      this.isConnecting = false;
      return;
    }

    this.settings = this.terminalService.loadLocalSettings();
    this.initSession();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnectWebSocket();
    if (this.term) {
      this.term.dispose();
      this.term = null;
    }
  }

  private initSession(): void {
    this.isConnecting = true;
    this.terminalService.initSession(this.deviceId, this.deviceBrand, this.protocol)
      .then((res: any) => {
        if (res && res.token) {
          this.sessionToken = res.token;
          this.sessionId = res.session_id;
          this.isConnecting = false;
          setTimeout(() => this.initTerminal(), 100);
        } else if (res && res.status === 'pam_required') {
          this.errorMessage = res.error || 'PAM access is not enabled for this user. Please ask your admin to enable a PAM seat.';
          this.isConnecting = false;
        } else if (res && res.status === 'gateway_not_installed') {
          this.gatewayNotInstalled = true;
          this.gatewayDocUrl = res.doc_url || this.gatewayDocUrl;
          this.errorMessage = res.error || 'Terminal Gateway is not installed.';
          this.isConnecting = false;
        } else {
          this.errorMessage = 'Failed to initialize session: invalid response';
          this.isConnecting = false;
        }
      })
      .catch((err: any) => {
        this.isConnecting = false;
        this.errorMessage = 'Failed to initialize session.';
      });
  }

  private initTerminal(): void {
    if (!this.terminalContainer) return;

    this.loadXtermScript().then(() => {
      this.createTerminal();
    }).catch(() => {
      this.errorMessage = 'Failed to load terminal emulator';
    });
  }

  private loadXtermScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Terminal) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xterm@5.1.0/lib/xterm.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.1.0/css/xterm.css';
        document.head.appendChild(link);
        resolve();
      };
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private createTerminal(): void {
    const Terminal = (window as any).Terminal;
    this.term = new Terminal({
      cursorBlink: this.settings.cursorBlink,
      cursorStyle: this.settings.cursorStyle,
      fontSize: this.settings.fontSize,
      fontFamily: this.settings.fontFamily,
      theme: {
        background: this.settings.background,
        foreground: this.settings.foreground,
        cursor: this.settings.cursorColor,
        selectionBackground: this.settings.selectionBackground,
      },
    });
    this.term.open(this.terminalContainer.nativeElement);
    this.term.write(`\r\n\x1b[36m[MikroWizard+ Terminal] Connecting to gateway...\x1b[0m\r\n`);
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    // Connect through Nginx proxy /terminal-ws/
    const wsUrl = `${wsProto}//${wsHost}/terminal-ws/?token=${this.sessionToken}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.isDisconnected = false;
      if (this.term) {
        this.term.write(`\r\n\x1b[32m[Connected] Terminal session established.\x1b[0m\r\n\r`);
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (this.term) {
        this.term.write(event.data);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      if (!this.isDisconnected) {
        this.isDisconnected = true;
        if (this.term) {
          this.term.write(`\r\n\x1b[31;1m[Disconnected]\x1b[0m Press Enter to reconnect or ESC to close.\r\n`);
        }
      }
    };

    this.ws.onerror = () => {
      if (this.term) {
        this.term.write(`\r\n\x1b[31;1m[Error] WebSocket connection failed.\x1b[0m\r\n`);
      }
    };

    if (this.term) {
      this.term.onData((data: string) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(data);
        }
      });
      this.term.onKey((e: { key: string, domEvent: KeyboardEvent }) => {
        if (this.isDisconnected) {
          if (e.domEvent.key === 'Enter') {
            this.term.write('\r\n\x1b[33mReconnecting...\x1b[0m\r\n');
            this.isDisconnected = false;
            this.initSession();
          } else if (e.domEvent.key === 'Escape') {
            window.close();
          }
        }
      });
    }
  }

  private disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  applySettings(newSettings: TerminalSettings): void {
    this.settings = newSettings;
    this.terminalService.saveLocalSettings(this.settings);
    if (!this.term) return;
    this.term.options.fontFamily = this.settings.fontFamily;
    this.term.options.fontSize = this.settings.fontSize;
    this.term.options.cursorStyle = this.settings.cursorStyle;
    this.term.options.cursorBlink = this.settings.cursorBlink;
    this.term.options.theme = {
      background: this.settings.background,
      foreground: this.settings.foreground,
      cursor: this.settings.cursorColor,
      selectionBackground: this.settings.selectionBackground,
    };
  }
}
