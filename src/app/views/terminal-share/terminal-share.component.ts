import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

declare var Terminal: any;
declare var FitAddon: any;

@Component({
  selector: 'app-terminal-share',
  templateUrl: './terminal-share.component.html',
  styleUrls: ['./terminal-share.component.scss']
})
export class TerminalShareComponent implements OnInit, OnDestroy {
  @ViewChild('terminalContainer', { static: true }) terminalContainer!: ElementRef;

  private term: any;
  private fitAddon: any;
  private ws: WebSocket | null = null;
  private resizeObserver: ResizeObserver | null = null;
  public loading = true;
  public error = '';
  public token: string = '';
  public password: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.password = this.route.snapshot.queryParamMap.get('password') || '';
    if (!this.token) {
      this.loading = false;
      this.error = 'No session token provided';
      return;
    }
    this.loadXtermScripts().then(() => {
      this.initXterm();
      this.connectWebSocket();
    });
  }

  ngOnDestroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.ws) this.ws.close();
    if (this.term) this.term.dispose();
  }

  private loadXtermScripts(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof Terminal !== 'undefined') return resolve();
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
      cursorBlink: true,
      theme: { background: '#0a0a0f' }
    });
    this.fitAddon = new FitAddon.FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(this.terminalContainer.nativeElement);
    
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
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    let wsUrl = `${wsProto}//${wsHost}/terminal-ws/?token=${this.token}`;
    if (this.password) {
        wsUrl += `&password=${encodeURIComponent(this.password)}`;
    }
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      this.loading = false;
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          if (this.fitAddon) {
            try { this.fitAddon.fit(); } catch(e) {}
          }
          this.term.focus();
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'resize', cols: this.term.cols, rows: this.term.rows }));
          }
        }, 50);
      });
    };
    
    this.ws.onmessage = (evt) => {
      this.term.write(evt.data);
    };
    
    this.ws.onclose = (evt) => {
      if (evt.code === 1008 && evt.reason === "Incorrect Password") {
          const pass = prompt("Enter guest password:");
          if (pass) {
              this.password = pass;
              this.connectWebSocket();
              return;
          }
      }
      this.term.write(`\r\n\r\nConnection Closed. ${evt.reason ? 'Reason: ' + evt.reason : ''}\r\n`);
    };
    
    this.term.onData((data: string) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(data);
      }
    });
    
    this.term.onResize((size: {cols: number, rows: number}) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'resize', cols: size.cols, rows: size.rows }));
      }
    });
  }

  public focusTerminal() {
    if (this.term) this.term.focus();
  }
}
