import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, interval, Subject, catchError, throwError, map, switchMap } from 'rxjs';

export interface VpnStats {
  last_handshake: number;
  rx_bytes: number;
  tx_bytes: number;
  rx_speed?: number;
  tx_speed?: number;
  nat_mode: string;
  enabled: boolean;
  allowed_ips: string;
}

export interface VpnPeer {
  id: number;
  public_key: string;
  assigned_ip: string;
  nat_mode: string;
  split_targets: string[];
  dns_server: string | null;
  persistent_keepalive: number;
  custom_interface: string | null;
  linked_device_id: number | null;
  is_enabled: boolean;
  created_at: string;
  stats?: VpnStats; // Joined from the /status API
  is_managed?: boolean;
  status?: 'online' | 'offline' | 'unreachable';
  name?: string;
  description?: string;
  scan_status?: 'starting' | 'running' | 'completed' | 'failed' | null;
  mt_user: string | null;
  mt_pass: string | null;
  mt_port: number | null;
}

export interface VpnServerConfig {
  id?: number;
  api_endpoint: string;
  api_token: string | null;
  vpn_subnet: string;
  public_server_ip: string | null;
}

export interface VpnStatusResponse {
  status: 'running' | 'setup_required' | 'error';
  peers?: VpnPeer[];
  server_config?: VpnServerConfig;
  message?: string;
}

export interface VpnLiveStatusResponse {
  server: {
    rx_bytes: number;
    tx_bytes: number;
    rx_speed: number;
    tx_speed: number;
  };
  peers: any[]; // The live endpoint returns an array of peer objects with full stats, same as /status
}

@Injectable({
  providedIn: 'root'
})
export class VpnService {
  private apiUrl = '/api/vpn';

  constructor(private http: HttpClient) { }

  // System Endpoints
  getStatus(): Observable<VpnStatusResponse> {
    return this.http.get<{ result: VpnStatusResponse }>(`${this.apiUrl}/status`).pipe(map(r => r.result));
  }

  getLiveStatus(): Observable<VpnLiveStatusResponse> {
    return this.http.get<{ result: VpnLiveStatusResponse }>(`${this.apiUrl}/status/live`).pipe(
      map(res => res.result),
      catchError(err => throwError(() => err))
    );
  }

  resetServerCounters(): Observable<any> {
    return this.http.post(`${this.apiUrl}/server/reset-counters`, {}).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getSystemConfig(): Observable<{ status: string, config: VpnServerConfig }> {
    return this.http.get<{ result: { status: string, config: VpnServerConfig } }>(`${this.apiUrl}/system/config`).pipe(map(r => r.result));
  }

  updateSystemConfig(config: Partial<VpnServerConfig>): Observable<any> {
    return this.http.post<{ result: any }>(`${this.apiUrl}/system/config`, config).pipe(map(r => r.result));
  }

  flushSystem(wipe_database: boolean): Observable<any> {
    return this.http.post<{ result: any }>(`${this.apiUrl}/system/flush`, { wipe_database }).pipe(map(r => r.result));
  }

  // Peer Endpoints
  addPeer(peerData: {
    pubkey?: string,
    custom_ip?: string,
    nat_mode: 'full' | 'split' | 'off',
    split_targets: string[],
    persistent_keepalive: number,
    custom_interface?: string,
    name?: string,
    description?: string,
    mt_user?: string | null,
    mt_pass?: string | null,
    mt_port?: number | null
  }): Observable<{ status: string, peer: VpnPeer }> {
    return this.http.post<{ result: { status: string, peer: VpnPeer } }>(`${this.apiUrl}/peers/add`, peerData).pipe(map(r => r.result));
  }

  editPeer(peerData: {
    pubkey: string,
    custom_ip?: string,
    nat_mode?: string,
    split_targets?: string[],
    persistent_keepalive?: number,
    custom_interface?: string,
    name?: string,
    description?: string,
    mt_user?: string | null,
    mt_pass?: string | null,
    mt_port?: number | null
  }): Observable<any> {
    return this.http.post<{ result: any }>(`${this.apiUrl}/peers/edit`, peerData).pipe(map(r => r.result));
  }

  togglePeer(pubkey: string, enabled: boolean): Observable<any> {
    return this.http.post<{ result: any }>(`${this.apiUrl}/peers/toggle`, { pubkey, enabled }).pipe(map(r => r.result));
  }

  deletePeer(pubkey: string): Observable<any> {
    return this.http.post<{ result: any }>(`${this.apiUrl}/peers/delete`, { pubkey }).pipe(map(r => r.result));
  }

  getPeerConfig(pubkey: string): Observable<{ status: string, config: string }> {
    return this.http.post<{ result: { status: string, config: string } }>(`${this.apiUrl}/peers/config`, { pubkey }).pipe(map(r => r.result));
  }

  getPeerMikrotikScript(pubkey: string): Observable<{ status: string, script: string }> {
    return this.http.post<{ result: { status: string, script: string } }>(`${this.apiUrl}/peers/mikrotik-script`, { pubkey }).pipe(map(r => r.result));
  }

  scanLinkedDevice(pubkey: string): Observable<any> {
    return this.http.post<{ result: any }>(`${this.apiUrl}/peers/scan`, { pubkey }).pipe(map(r => r.result));
  }

  getPeerQrCode(pubkey: string): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/peers/qrcode`, { pubkey }, { responseType: 'blob' });
  }

  resetPeerCounters(pubkey: string): Observable<any> {
    // pubkey must be url-encoded to safely pass base64 across URL path
    return this.http.post(`${this.apiUrl}/peer/${encodeURIComponent(pubkey)}/reset-counters`, {}).pipe(
      catchError(err => throwError(() => err))
    );
  }

}
