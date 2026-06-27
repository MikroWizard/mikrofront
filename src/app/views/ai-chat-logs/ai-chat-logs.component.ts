import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-ai-chat-logs',
  templateUrl: './ai-chat-logs.component.html',
  styleUrls: ['./ai-chat-logs.component.scss']
})
export class AIChatLogsComponent implements OnInit {
  @ViewChild('dt') table!: Table;

  public sessions: any[] = [];
  public filteredSessions: any[] = [];
  public activeFilter: 'all' | 'customer' | 'admin' = 'all';
  public loading = false;

  // Active session details
  public activeSession: any = null;
  public chatHistory: any[] = [];
  public chatDetailsModalVisible = false;
  public loadingDetail = false;

  constructor(private data_provider: dataProvider) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions() {
    this.loading = true;
    this.data_provider.adminGetChatSessions().then((res: any) => {
      this.loading = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.sessions = data;
        this.applyFilter();
      }
    }).catch(err => {
      this.loading = false;
    });
  }

  setFilter(filter: 'all' | 'customer' | 'admin') {
    this.activeFilter = filter;
    this.applyFilter();
  }

  applyFilter() {
    if (this.activeFilter === 'customer') {
      this.filteredSessions = this.sessions.filter(s => s.customer_role !== 'admin');
    } else if (this.activeFilter === 'admin') {
      this.filteredSessions = this.sessions.filter(s => s.customer_role === 'admin');
    } else {
      this.filteredSessions = [...this.sessions];
    }
  }

  viewSessionDetails(session: any) {
    this.activeSession = session;
    this.chatHistory = [];
    this.chatDetailsModalVisible = true;
    this.loadingDetail = true;

    this.data_provider.adminGetChatSession(session.id).then((res: any) => {
      this.loadingDetail = false;
      const data = res.result || res;
      if (data && data.history) {
        this.chatHistory = data.history;
      }
    }).catch(err => {
      this.loadingDetail = false;
    });
  }

  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }

  // Helper to parse tool calls/json contents if any
  parseJson(text: string) {
    try {
      return JSON.parse(text);
    } catch(e) {
      return null;
    }
  }
}
