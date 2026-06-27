import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-admin-tickets',
  templateUrl: './admin-tickets.component.html',
  styleUrls: ['./admin-tickets.component.scss']
})
export class AdminTicketsComponent implements OnInit {
  @ViewChild('dt') table!: Table;

  public tickets: any[] = [];
  public staffList: any[] = [];
  public loading = false;

  // Active replies details
  public activeTicket: any = null;
  public ticketReplies: any[] = [];
  public ticketRepliesModalVisible = false;
  public replyInput = "";
  public replying = false;

  constructor(private data_provider: dataProvider) {}

  ngOnInit(): void {
    this.loadTickets();
    this.loadStaff();
  }

  loadTickets() {
    this.loading = true;
    this.data_provider.adminGetTickets().then((res: any) => {
      this.loading = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.tickets = data;
      }
    }).catch(err => {
      this.loading = false;
    });
  }

  loadStaff() {
    // Load all users and filter for administrative staff (non-customers)
    this.data_provider.get_users(1, 1000, "").then((res: any) => {
      if (Array.isArray(res)) {
        this.staffList = res.filter(u => u.role !== 'customer' && u.role !== 'customer_inactive');
      }
    }).catch(err => { });
  }

  assignTicket(ticket: any) {
    this.data_provider.adminAssignTicket(ticket.id, ticket.assigned_admin_id).then((res: any) => {
      this.loadTickets();
    }).catch(err => { });
  }

  updateTicketStatus(ticket: any) {
    this.data_provider.adminUpdateTicketStatus(ticket.id, ticket.status).then((res: any) => {
      this.loadTickets();
    }).catch(err => { });
  }

  viewTicketReplies(ticket: any) {
    this.activeTicket = ticket;
    this.ticketReplies = [];
    this.replyInput = "";
    this.ticketRepliesModalVisible = true;
    this.loadTicketReplies();
  }

  loadTicketReplies() {
    if (!this.activeTicket) return;
    this.data_provider.adminGetTicketReplies(this.activeTicket.id).then((res: any) => {
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.ticketReplies = data;
      }
    }).catch(err => { });
  }

  submitTicketReply() {
    if (!this.replyInput.trim() || !this.activeTicket || this.replying) return;

    this.replying = true;
    const msg = this.replyInput.trim();

    this.data_provider.adminReplyTicket(this.activeTicket.id, msg).then((res: any) => {
      this.replying = false;
      const data = res.result || res;
      if (data && data.id) {
        this.replyInput = "";
        this.loadTicketReplies();
        this.loadTickets(); // Refresh tickets list to reflect modified time/status
      }
    }).catch(err => {
      this.replying = false;
    });
  }

  applyFilterGlobal($event: any, stringVal: string) {
    this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
  }
}
