import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { dataProvider } from "../../../providers/mikrowizard/data";

@Component({
  selector: 'app-ai-chat-logs-tab',
  templateUrl: './ai-chat-logs.component.html',
  styleUrls: ['./ai-chat-logs.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class AIChatLogsComponent implements OnInit, OnChanges {
  @Input() devid: number = 0;
  @Input() ispro: boolean = false;

  // AI Chatbot Audit Logs State
  public auditSessions: any[] = [];
  public auditLoading: boolean = false;
  public activeAuditSession: any = null;
  public auditChatHistory: any[] = [];
  public auditDetailsModalVisible: boolean = false;
  public auditLoadingDetail: boolean = false;

  constructor(private data_provider: dataProvider) {}

  ngOnInit(): void {
    if (this.ispro && this.devid) {
      this.loadAuditSessions();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['ispro'] || changes['devid']) && this.ispro && this.devid) {
      this.loadAuditSessions();
    }
  }

  loadAuditSessions() {
    this.auditLoading = true;
    this.data_provider.adminGetChatSessions(this.devid).then((res: any) => {
      this.auditLoading = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.auditSessions = data;
      }
    }).catch((e: any) => {
      this.auditLoading = false;
      console.error(e);
    });
  }

  viewAuditSessionDetails(session: any) {
    this.activeAuditSession = session;
    this.auditChatHistory = [];
    this.auditDetailsModalVisible = true;
    this.auditLoadingDetail = true;

    this.data_provider.adminGetChatSession(session.id).then((res: any) => {
      this.auditLoadingDetail = false;
      const data = res.result || res;
      if (data && Array.isArray(data.history)) {
        this.auditChatHistory = data.history;
      }
    }).catch((e: any) => {
      this.auditLoadingDetail = false;
      console.error(e);
    });
  }
}
