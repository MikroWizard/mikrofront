import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { dataProvider } from "../../../providers/mikrowizard/data";

@Component({
  selector: 'app-speed-test',
  templateUrl: './speed-test.component.html',
  styleUrls: ['./speed-test.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class SpeedTestComponent implements OnInit, OnChanges {
  @Input() devid: number = 0;
  @Input() ispro: boolean = false;

  // Speed Test State
  public speedtestServers: any[] = [];
  public selectedSpeedServer: string = 'auto';
  public testDuration: string = '5s';
  public testRunning: boolean = false;
  public testRemainingSec: number = 0;
  private testInterval: any;
  public testProgress: string = '';
  public testResults: any = null;
  public speedHistory: any[] = [];
  public historyLoading: boolean = false;
  public routerChartData: any = null;
  public browserChartData: any = null;
  public rawResultsModalVisible: boolean = false;
  public rawResultsJson: any = null;

  // Pagination
  public currentPage: number = 1;
  public pageSize: number = 10;

  public speedChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      }
    },
    maintainAspectRatio: false
  };

  constructor(private data_provider: dataProvider) {}

  ngOnInit(): void {
    if (this.ispro && this.devid) {
      this.loadSpeedtestData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['ispro'] || changes['devid']) && this.ispro && this.devid) {
      this.loadSpeedtestData();
    }
  }

  loadSpeedtestData() {
    this.data_provider.getSpeedtestServers().then((res: any) => {
      const data = res.result || res;
      this.speedtestServers = Array.isArray(data) ? data : (data?.servers || []);
    }).catch(e => console.error(e));

    this.historyLoading = true;
    this.data_provider.adminGetSpeedtestHistory(this.devid).then((res: any) => {
      const data = res.result || res;
      let history = Array.isArray(data) ? data : [];
      history = history.map(h => {
        if (h.raw_data && h.test_type === 'router') {
          try {
            const raw = typeof h.raw_data === 'string' ? JSON.parse(h.raw_data) : h.raw_data;
            if (Array.isArray(raw)) {
              for (const r of raw) {
                const status = (r.status || '').toLowerCase().replace('-', ' ').trim();
                if (status === 'udp download') {
                  const val = r['udp-download'] || r['udp-rx'] || r['rx-speed'] || r['download'];
                  if (val) h.udp_download = this.parseSpeedResult(val).speed;
                } else if (status === 'udp upload') {
                  const val = r['udp-upload'] || r['udp-tx'] || r['tx-speed'] || r['upload'];
                  if (val) h.udp_upload = this.parseSpeedResult(val).speed;
                }
              }
            } else if (typeof raw === 'object' && raw !== null) {
              if (raw.udp_download) h.udp_download = this.parseSpeedResult(raw.udp_download).speed;
              if (raw.udp_upload) h.udp_upload = this.parseSpeedResult(raw.udp_upload).speed;
            }
          } catch (e) {
            console.error('Error parsing raw_data', e);
          }
        }
        return h;
      });
      this.speedHistory = history;
      this.currentPage = 1; // reset page on load
      this.prepareCharts();
      this.historyLoading = false;
    }).catch(e => {
      this.historyLoading = false;
      console.error(e);
    });
  }

  prepareCharts() {
    const routerTests = this.speedHistory.filter(h => h.test_type === 'router').reverse();
    const browserTests = this.speedHistory.filter(h => h.test_type === 'browser' || !h.test_type).reverse();

    if (routerTests.length > 0) {
      this.routerChartData = {
        labels: routerTests.map(h => {
          const date = new Date(h.created);
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }),
        datasets: [
          {
            label: 'Download (Mbps)',
            data: routerTests.map(h => h.download),
            borderColor: '#41B883',
            backgroundColor: 'rgba(65, 184, 131, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Upload (Mbps)',
            data: routerTests.map(h => h.upload),
            borderColor: '#00D8FF',
            backgroundColor: 'rgba(0, 216, 255, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      };
    } else {
      this.routerChartData = null;
    }

    if (browserTests.length > 0) {
      this.browserChartData = {
        labels: browserTests.map(h => {
          const date = new Date(h.created);
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }),
        datasets: [
          {
            label: 'Download (Mbps)',
            data: browserTests.map(h => h.download),
            borderColor: '#41B883',
            backgroundColor: 'rgba(65, 184, 131, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Upload (Mbps)',
            data: browserTests.map(h => h.upload),
            borderColor: '#00D8FF',
            backgroundColor: 'rgba(0, 216, 255, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      };
    } else {
      this.browserChartData = null;
    }
  }

  parseSpeedResult(val: string) {
    if (!val) return { speed: 'N/A', cpu: '' };
    const parts = val.split('local-cpu-load');
    const speed = parts[0].trim();
    let cpu = '';
    if (parts.length > 1) {
      cpu = 'local-cpu-load' + parts[1];
      cpu = cpu.replace(/-/g, ' ').replace(/:/g, ': ').trim();
    }
    return { speed, cpu };
  }

  get paginatedHistory() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.speedHistory.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.speedHistory.length / this.pageSize) || 1;
  }

  getPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  showRawData(rawData: any) {
    if (!rawData) {
      this.rawResultsJson = { error: 'No raw data available' };
    } else if (typeof rawData === 'string') {
      try {
        this.rawResultsJson = JSON.parse(rawData);
      } catch (e) {
        this.rawResultsJson = { data: rawData };
      }
    } else {
      this.rawResultsJson = rawData;
    }
    this.rawResultsModalVisible = true;
  }

  runRouterSpeedtest() {
    if (this.testRunning) return;
    this.testRunning = true;
    this.testProgress = 'Initializing speed test...';
    this.testResults = null;

    const durMatch = this.testDuration.match(/(\d+)/);
    const stageDurationSec = durMatch ? parseInt(durMatch[1], 10) : 5;
    this.testRemainingSec = (stageDurationSec * 5) + 5;

    this.testInterval = setInterval(() => {
      if (this.testRemainingSec > 0) {
        this.testRemainingSec--;
      }
    }, 1000);

    const payload = {
      target: 'mikrowizard-server',
      duration: this.testDuration,
      server_index: this.selectedSpeedServer
    };

    this.data_provider.adminRunRouterSpeedtest(this.devid, payload).then((res: any) => {
      clearInterval(this.testInterval);
      this.testRemainingSec = 0;
      this.testRunning = false;
      const data = res.result || res;
      if (data && data.status === 'success') {
        const results = data.results || {};
        const dlParsed = this.parseSpeedResult(results.tcp_download);
        const ulParsed = this.parseSpeedResult(results.tcp_upload);
        const dlUdp = this.parseSpeedResult(results.udp_download);
        const ulUdp = this.parseSpeedResult(results.udp_upload);
        this.testResults = {
          tcp_download: dlParsed.speed,
          tcp_download_cpu: dlParsed.cpu,
          tcp_upload: ulParsed.speed,
          tcp_upload_cpu: ulParsed.cpu,
          udp_download: dlUdp.speed,
          udp_download_cpu: dlUdp.cpu,
          udp_upload: ulUdp.speed,
          udp_upload_cpu: ulUdp.cpu,
          ping: results.ping || 'N/A',
          jitter: results.jitter || 'N/A',
          status: results.status || 'completed',
          raw_data: data.raw_data
        };
        this.testProgress = 'Test completed successfully!';
      } else {
        this.testProgress = 'Test failed: ' + (data?.err || 'Unknown error');
      }
      this.loadSpeedtestData();
    }).catch(e => {
      clearInterval(this.testInterval);
      this.testRemainingSec = 0;
      this.testRunning = false;
      this.testProgress = 'Connection error running speed test.';
      console.error(e);
    });
  }
}
