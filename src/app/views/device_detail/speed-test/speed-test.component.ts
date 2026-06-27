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
  public testDuration: string = '10s';
  public testRunning: boolean = false;
  public testProgress: string = '';
  public testResults: any = null;
  public speedHistory: any[] = [];
  public historyLoading: boolean = false;
  public routerChartData: any = null;
  public browserChartData: any = null;
  public rawResultsModalVisible: boolean = false;
  public rawResultsJson: any = null;

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
      this.speedHistory = Array.isArray(data) ? data : [];
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

    const payload = {
      target: 'mikrowizard-server',
      duration: this.testDuration,
      server_index: this.selectedSpeedServer
    };

    this.data_provider.adminRunRouterSpeedtest(this.devid, payload).then((res: any) => {
      this.testRunning = false;
      const data = res.result || res;
      if (data && data.status === 'success') {
        const results = data.results || {};
        const dlParsed = this.parseSpeedResult(results.tcp_download);
        const ulParsed = this.parseSpeedResult(results.tcp_upload);
        this.testResults = {
          download: dlParsed.speed,
          download_cpu: dlParsed.cpu,
          upload: ulParsed.speed,
          upload_cpu: ulParsed.cpu,
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
      this.testRunning = false;
      this.testProgress = 'Connection error running speed test.';
      console.error(e);
    });
  }
}
