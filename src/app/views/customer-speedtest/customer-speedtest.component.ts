import { Component, OnInit, OnDestroy } from '@angular/core';
import { dataProvider } from '../../providers/mikrowizard/data';

@Component({
  selector: 'app-customer-speedtest',
  templateUrl: './customer-speedtest.component.html',
  styleUrls: ['./customer-speedtest.component.scss']
})
export class CustomerSpeedTestComponent implements OnInit, OnDestroy {
  public selectedDeviceId: number | null = null;
  private deviceChangeSub: any;

  // Running test status
  public testing = false;
  public testState: 'idle' | 'ping' | 'download' | 'upload' | 'completed' = 'idle';
  
  // Real-time speed/value display
  public currentValue = 0;
  public currentUnit = 'Mbps';
  
  // Test Results
  public pingResult = 0;
  public jitterResult = 0;
  public downloadResult = 0;
  public uploadResult = 0;

  // Gauge parameters
  public gaugeCircumference = 377; // Arc length for 270 degrees
  public maxSpeedValue = 100;

  // Chart
  public chartData: any = {};
  public chartOptions: any = {};
  public loadingHistory = false;
  public historyList: any[] = [];

  // Cancellation flag
  private isCancelled = false;

  // Router-initiated speed test properties
  public speedTestMode: 'browser' | 'router' = 'browser';
  public routerTestTarget = 'mikrowizard-server';
  public routerTestDuration = '5s';
  public runningRouterTest = false;
  public routerTestProgress = 0;
  public routerTestStage = '';
  private routerTestInterval: any;
  public routerResults: any = null;
  public routerTestError = "";
  public speedtestServers: any[] = [];

  public routerTargetSuggestions = [
    { label: 'MikroWizard Server (Recommended)', value: 'mikrowizard-server' },
    { label: 'MikroTik Official Server', value: 'btest.mikrotik.com' }
  ];

  constructor(private data_provider: dataProvider) {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#495057'
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            color: '#495057'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Speed (Mbps)',
            color: '#495057'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            color: '#495057'
          },
          min: 0
        }
      }
    };
  }

  ngOnInit(): void {
    const cached = localStorage.getItem('customer_selected_device_id');
    if (cached) {
      this.selectedDeviceId = +cached;
      this.loadHistory();
    }

    this.loadSpeedtestServers();

    this.deviceChangeSub = (event: Event) => {
      const customEvent = event as CustomEvent;
      this.selectedDeviceId = customEvent.detail;
      this.cancelTest();
      this.loadHistory();
    };
    window.addEventListener('customerDeviceChanged', this.deviceChangeSub);
  }

  ngOnDestroy(): void {
    this.cancelTest();
    if (this.deviceChangeSub) {
      window.removeEventListener('customerDeviceChanged', this.deviceChangeSub);
    }
  }

  loadHistory() {
    if (!this.selectedDeviceId) return;
    this.loadingHistory = true;
    this.data_provider.customerGetSpeedtestHistory(this.selectedDeviceId).then((res: any) => {
      this.loadingHistory = false;
      const data = res.result || res;
      if (Array.isArray(data)) {
        let history = data.map((h: any) => {
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
        this.historyList = history;
        this.buildChart(history);
      }
    }).catch(err => {
      this.loadingHistory = false;
    });
  }

  buildChart(data: any[]) {
    // Show oldest to newest
    const sorted = [...data].reverse();
    const labels = sorted.map((h: any) => {
      const d = new Date(h.created);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + 
             d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    });

    const downloads = sorted.map((h: any) => h.download);
    const uploads = sorted.map((h: any) => h.upload);

    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Download (Mbps)',
          data: downloads,
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          pointBackgroundColor: '#0d6efd',
          pointBorderColor: '#fff',
          fill: true,
          tension: 0.2
        },
        {
          label: 'Upload (Mbps)',
          data: uploads,
          borderColor: '#6f42c1',
          backgroundColor: 'rgba(111, 66, 193, 0.1)',
          pointBackgroundColor: '#6f42c1',
          pointBorderColor: '#fff',
          fill: true,
          tension: 0.2
        }
      ]
    };
  }

  getGaugeOffset(): number {
    const val = Math.min(this.currentValue, this.maxSpeedValue);
    return this.gaugeCircumference - (this.gaugeCircumference * val) / this.maxSpeedValue;
  }

  cancelTest() {
    if (this.testing) {
      this.isCancelled = true;
      this.testing = false;
      this.testState = 'idle';
      this.currentValue = 0;
    }
  }

  async runSpeedTest() {
    if (this.testing || !this.selectedDeviceId) return;
    this.testing = true;
    this.isCancelled = false;
    this.maxSpeedValue = 100;
    this.currentValue = 0;
    
    this.pingResult = 0;
    this.jitterResult = 0;
    this.downloadResult = 0;
    this.uploadResult = 0;

    try {
      // 1. Latency & Jitter Stage
      if (this.isCancelled) return;
      await this.runPingStage();

      // 2. Download Speed Stage
      if (this.isCancelled) return;
      await this.runDownloadStage();

      // 3. Upload Speed Stage
      if (this.isCancelled) return;
      await this.runUploadStage();

      // 4. Save results
      if (this.isCancelled) return;
      this.testState = 'completed';
      this.currentValue = 0;
      this.currentUnit = 'Done';
      this.testing = false;

      await this.saveResults();
      this.loadHistory();

    } catch (err) {
      console.error(err);
      this.testing = false;
      this.testState = 'idle';
      alert('Speed test encountered an error. Please try again.');
    }
  }

  private async runPingStage() {
    this.testState = 'ping';
    this.currentUnit = 'ms';
    this.maxSpeedValue = 100; // gauge max is 100ms for ping

    const pings: number[] = [];
    for (let i = 0; i < 5; i++) {
      if (this.isCancelled) return;
      const start = performance.now();
      await fetch('/api/customer/speedtest/download?size=1', { method: 'HEAD' }).catch(() => {});
      const duration = performance.now() - start;
      pings.push(duration);
      this.currentValue = duration;
      await new Promise(r => setTimeout(r, 150));
    }

    const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
    this.pingResult = Math.round(avgPing);

    // Calculate RFC 1889 Jitter
    let jitterSum = 0;
    for (let i = 1; i < pings.length; i++) {
      jitterSum += Math.abs(pings[i] - pings[i - 1]);
    }
    this.jitterResult = Math.round(jitterSum / (pings.length - 1));
  }

  private async runDownloadStage() {
    this.testState = 'download';
    this.currentUnit = 'Mbps';
    this.currentValue = 0;
    this.maxSpeedValue = 100;

    const testDurationMs = 8000;
    const slowStartBypassMs = 1500;
    const startOverall = performance.now();

    let bytesReceived = 0;
    let bytesReceivedBeforeBypass = 0;
    let bypassPassed = false;
    let chunkSize = 2; // Start with 2MB chunk

    while (performance.now() - startOverall < testDurationMs) {
      if (this.isCancelled) return;

      const chunkStart = performance.now();
      const response = await fetch(`/api/customer/speedtest/download?size=${chunkSize}`).catch(() => null);
      if (!response || !response.body) {
        await new Promise(r => setTimeout(r, 200));
        continue;
      }

      const reader = response.body.getReader();
      let done = false;

      while (!done) {
        if (this.isCancelled) return;
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          bytesReceived += value.length;
          const elapsedOverall = performance.now() - startOverall;

          if (elapsedOverall > slowStartBypassMs) {
            if (!bypassPassed) {
              bytesReceivedBeforeBypass = bytesReceived;
              bypassPassed = true;
            }
            const activeElapsedSec = (elapsedOverall - slowStartBypassMs) / 1000;
            const activeBytes = bytesReceived - bytesReceivedBeforeBypass;
            const speedMbps = (activeBytes * 8) / (activeElapsedSec * 1000 * 1000);
            
            this.currentValue = speedMbps;
            if (this.currentValue > this.maxSpeedValue) {
              this.maxSpeedValue = Math.ceil(this.currentValue / 100) * 100;
            }
          }
        }
      }

      // Adjust chunk size dynamically based on chunk duration
      const chunkDuration = performance.now() - chunkStart;
      if (chunkDuration < 400 && chunkSize < 20) {
        chunkSize = Math.min(chunkSize + 3, 25);
      } else if (chunkDuration > 1500 && chunkSize > 2) {
        chunkSize = Math.max(chunkSize - 3, 2);
      }
    }

    this.downloadResult = Math.round(this.currentValue * 10) / 10;
  }

  private async runUploadStage() {
    this.testState = 'upload';
    this.currentUnit = 'Mbps';
    this.currentValue = 0;
    this.maxSpeedValue = 100;

    const testDurationMs = 8000;
    const slowStartBypassMs = 1500;
    const startOverall = performance.now();

    let bytesUploaded = 0;
    let bytesUploadedBeforeBypass = 0;
    let bypassPassed = false;
    let uploadChunkMb = 1; // Start with 1MB

    while (performance.now() - startOverall < testDurationMs) {
      if (this.isCancelled) return;

      const dummyBuffer = new Uint8Array(1024 * 1024 * uploadChunkMb);
      const chunkStart = performance.now();

      const response = await fetch('/api/customer/speedtest/upload', {
        method: 'POST',
        body: dummyBuffer
      }).catch(() => null);

      if (!response) {
        await new Promise(r => setTimeout(r, 200));
        continue;
      }

      bytesUploaded += dummyBuffer.length;
      const elapsedOverall = performance.now() - startOverall;

      if (elapsedOverall > slowStartBypassMs) {
        if (!bypassPassed) {
          bytesUploadedBeforeBypass = bytesUploaded;
          bypassPassed = true;
        }
        const activeElapsedSec = (elapsedOverall - slowStartBypassMs) / 1000;
        const activeBytes = bytesUploaded - bytesUploadedBeforeBypass;
        const speedMbps = (activeBytes * 8) / (activeElapsedSec * 1000 * 1000);
        
        this.currentValue = speedMbps;
        if (this.currentValue > this.maxSpeedValue) {
          this.maxSpeedValue = Math.ceil(this.currentValue / 100) * 100;
        }
      }

      // Adjust upload chunk size dynamically
      const chunkDuration = performance.now() - chunkStart;
      if (chunkDuration < 300 && uploadChunkMb < 10) {
        uploadChunkMb = Math.min(uploadChunkMb + 1, 15);
      } else if (chunkDuration > 1200 && uploadChunkMb > 1) {
        uploadChunkMb = Math.max(uploadChunkMb - 1, 1);
      }
    }

    this.uploadResult = Math.round(this.currentValue * 10) / 10;
  }

  private async saveResults() {
    if (!this.selectedDeviceId) return;
    const payload = {
      devid: this.selectedDeviceId,
      download: this.downloadResult,
      upload: this.uploadResult,
      ping: this.pingResult,
      jitter: this.jitterResult
    };
    return this.data_provider.customerSaveSpeedtest(payload);
  }

  loadSpeedtestServers() {
    this.data_provider.getSpeedtestServers().then((res: any) => {
      const data = res.result || res;
      this.speedtestServers = Array.isArray(data) ? data : (data?.servers || []);
      if (this.speedtestServers.length === 0) {
        this.speedTestMode = 'browser';
      }
    }).catch(err => {
      console.error("Error loading speedtest servers:", err);
    });
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

  runRouterSpeedTest() {
    if (!this.selectedDeviceId || this.runningRouterTest) return;
    this.runningRouterTest = true;
    this.routerTestError = "";
    this.routerResults = null;
    this.routerTestProgress = 0;
    this.routerTestStage = 'Connecting to server...';

    const durMatch = this.routerTestDuration.match(/(\d+)/);
    const stageDurationSec = durMatch ? parseInt(durMatch[1], 10) : 5;
    const totalExpectedSec = (stageDurationSec * 5) + 5;

    let elapsed = 0;
    this.routerTestInterval = setInterval(() => {
      elapsed += 0.5;
      let p = (elapsed / totalExpectedSec) * 100;
      if (p > 95) p = 95;
      this.routerTestProgress = p;

      const stageLen = stageDurationSec + 1;
      if (elapsed < stageLen) {
        this.routerTestStage = 'Measuring Latency & Jitter...';
      } else if (elapsed < stageLen * 2) {
        this.routerTestStage = 'Testing TCP Download Speed...';
      } else if (elapsed < stageLen * 3) {
        this.routerTestStage = 'Testing TCP Upload Speed...';
      } else if (elapsed < stageLen * 4) {
        this.routerTestStage = 'Testing UDP Download Speed...';
      } else {
        this.routerTestStage = 'Testing UDP Upload Speed...';
      }
    }, 500);

    this.data_provider.customerRunRouterSpeedtest(this.selectedDeviceId, {
      target: this.routerTestTarget.trim(),
      duration: this.routerTestDuration
    }).then((res: any) => {
      clearInterval(this.routerTestInterval);
      this.runningRouterTest = false;
      this.routerTestProgress = 100;
      this.routerTestStage = 'Test Complete';
      
      const data = res.result || res;
      if (data && data.status === 'success' && data.results) {
        const results = data.results;
        const dlTcp = this.parseSpeedResult(results.tcp_download);
        const ulTcp = this.parseSpeedResult(results.tcp_upload);
        const dlUdp = this.parseSpeedResult(results.udp_download);
        const ulUdp = this.parseSpeedResult(results.udp_upload);
        this.routerResults = {
          status: results.status || 'completed',
          ping: results.ping || 'N/A',
          jitter: results.jitter || 'N/A',
          tcp_download: dlTcp.speed,
          tcp_download_cpu: dlTcp.cpu,
          tcp_upload: ulTcp.speed,
          tcp_upload_cpu: ulTcp.cpu,
          udp_download: dlUdp.speed,
          udp_download_cpu: dlUdp.cpu,
          udp_upload: ulUdp.speed,
          udp_upload_cpu: ulUdp.cpu
        };
      } else {
        this.routerTestError = data.err || "Router failed to execute the speed test. Ensure the remote Bandwidth Server is active and accessible.";
      }
    }).catch(err => {
      clearInterval(this.routerTestInterval);
      this.runningRouterTest = false;
      this.routerTestProgress = 0;
      this.routerTestStage = '';
      this.routerTestError = "Connection error with backend server.";
    });
  }
}
