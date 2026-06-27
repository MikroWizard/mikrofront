import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { dataProvider } from '../../providers/mikrowizard/data';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customer-tickets',
  templateUrl: './customer-tickets.component.html',
  styleUrls: ['./customer-tickets.component.scss']
})
export class CustomerTicketsComponent implements OnInit {
  // Support Tickets
  public tickets: any[] = [];
  public loadingTickets = false;
  public activeTicket: any = null;
  public ticketReplies: any[] = [];
  public replyInput = "";
  public replyingTicket = false;
  public createTicketModalVisible = false;
  public ticketRepliesModalVisible = false;
  public ticketForm: FormGroup;
  public ticketErrorMsg = "";
  public creatingTicket = false;

  constructor(
    private data_provider: dataProvider,
    private router: Router
  ) {
    this.ticketForm = new FormGroup({
      title: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
    this.loadTickets();
  }

  // Support Tickets Operations
  loadTickets() {
    this.loadingTickets = true;
    this.data_provider.customerGetTickets().then((res: any) => {
      this.loadingTickets = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.tickets = data;
      }
    }).catch(err => {
      this.loadingTickets = false;
    });
  }

  openCreateTicketModal() {
    this.ticketForm.reset();
    this.ticketErrorMsg = "";
    this.createTicketModalVisible = true;
  }

  submitCreateTicket() {
    if (this.ticketForm.invalid) return;

    this.creatingTicket = true;
    this.ticketErrorMsg = "";

    const title = this.ticketForm.get('title')!.value;
    const desc = this.ticketForm.get('description')!.value;

    this.data_provider.customerCreateTicket(title, desc).then((res: any) => {
      this.creatingTicket = false;
      const data = res.result || res;
      if (data && data.id) {
        this.createTicketModalVisible = false;
        this.loadTickets();
      } else {
        this.ticketErrorMsg = res.err || "Failed to create support ticket.";
      }
    }).catch(err => {
      this.creatingTicket = false;
      this.ticketErrorMsg = "Connection error with server.";
    });
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
    this.data_provider.customerGetTicketReplies(this.activeTicket.id).then((res: any) => {
      const data = res.result || res;
      if (Array.isArray(data)) {
        this.ticketReplies = data;
      }
    }).catch(err => { });
  }

  submitTicketReply() {
    if (!this.replyInput.trim() || !this.activeTicket || this.replyingTicket) return;

    this.replyingTicket = true;
    const msg = this.replyInput.trim();

    this.data_provider.customerReplyTicket(this.activeTicket.id, msg).then((res: any) => {
      this.replyingTicket = false;
      const data = res.result || res;
      if (data && data.id) {
        this.replyInput = "";
        this.loadTicketReplies();
        this.loadTickets();
      }
    }).catch(err => {
      this.replyingTicket = false;
    });
  }
}
