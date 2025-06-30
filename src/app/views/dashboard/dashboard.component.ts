import { Component, OnInit } from "@angular/core";
import { UntypedFormControl, UntypedFormGroup, FormBuilder, Validators } from "@angular/forms";
import { dataProvider } from "../../providers/mikrowizard/data";
import { loginChecker } from "../../providers/login_checker";
import { Router } from "@angular/router";
import { formatInTimeZone } from "date-fns-tz";

interface DashboardWidget {
  enabled: boolean;
  position: {
    col: string;
    row: string;
  };
}

interface CustomWidget {
  id: string;
  type: string;
  title: string;
  position: {
    col: string;
    row: string;
  };
  data?: any;
}

interface CustomView {
  id: string;
  name: string;
  description?: string;
  position: {
    col: string;
    row: string;
  };
}

@Component({
  templateUrl: "dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"]
})
export class DashboardComponent implements OnInit {
  public uid: number;
  public uname: string;
  public tz: string;
  public copy_msg: any = false;
  public ConfirmModalVisible: boolean = false;
  public action: string = "";
  public front_version = require('../../../../package.json').version;

  // Dashboard customization properties
  public isRemoveMode: boolean = false;
  public wizardModalVisible: boolean = false;
  public viewModalVisible: boolean = false;
  public wizardForm: UntypedFormGroup;
  public viewForm: UntypedFormGroup;

  // Widget management
  public widgets: { [key: string]: DashboardWidget } = {
    stats: { enabled: true, position: { col: '1 / -1', row: '1' } },
    traffic: { enabled: true, position: { col: '1 / -1', row: '2' } }
  };

  public customWidgets: CustomWidget[] = [];
  public customViews: CustomView[] = [];

  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker,
    private fb: FormBuilder
  ) {
    var _self = this;
    if (!this.login_checker.isLoggedIn()) {
      setTimeout(function () {
        _self.router.navigate(["login"]);
      }, 100);
    }
    
    this.data_provider.getSessionInfo().then((res) => {
      _self.uid = res.uid;
      _self.uname = res.name;
      _self.tz = res.tz;
    });

    // Initialize forms
    this.wizardForm = this.fb.group({
      wizardType: ['', Validators.required],
      wizardTitle: ['', Validators.required]
    });

    this.viewForm = this.fb.group({
      viewName: ['', Validators.required],
      viewDescription: ['']
    });

    // Load saved dashboard configuration
    this.loadDashboardConfig();
  }

  public trafficRadioGroup = new UntypedFormGroup({
    trafficRadio: new UntypedFormControl("5m"),
  });
  
  public chart_data: any = {};
  public Chartoptions = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const units = ["bit", "Kib", "Mib", "Gib", "Tib"];
            let label = context.dataset.label || "";
            var res = context.parsed.y;
            let unitIndex = 0;
            while (res >= 1024 && unitIndex < units.length - 1) {
              res /= 1024;
              unitIndex++;
            }
            switch (context.dataset.unit) {
              case "rx":
                return "rx/s :" + res.toFixed(3) + " " + units[unitIndex];
              case "tx":
                return "tx/s :" + res.toFixed(3) + " " + units[unitIndex];
              case "rxp":
                return "rxp/s :" + context.parsed.y;
              case "txp":
                return "txp/s :" + context.parsed.y;
              default:
                return context.parsed.y;
            }
          },
        },
      },
      legend: {
        display: true,
      },
    },
    maintainAspectRatio: true,
    scales: {
      x: { display: false },
      yA: {
        display: true,
        stacked: true,
        position: "left",
        type: "linear",
        color: "#4caf50",
        grid: {
          color: "rgba(76, 175, 79, 0.3)",
          backgroundColor: "transparent",
          borderColor: "#4caf50",
          pointHoverBackgroundColor: "#4caf50",
          borderWidth: 1,
          borderDash: [8, 5],
        },
        ticks: {
          color: "#000000",
          callback: function (value: any, index: any, ticks: any) {
            const units = ["bit", "Kib", "Mib", "Gib", "Tib"];
            var res = value;
            let unitIndex = 0;
            while (res >= 1024 && unitIndex < units.length - 1) {
              res /= 1024;
              unitIndex++;
            }
            return res.toFixed(3) + " " + units[unitIndex];
          },
        },
        scaleLabel: {
          display: true,
        },
      },
      yB: {
        display: true,
        stacked: true,
        position: "right",
        type: "linear",
        grid: {
          color: "rgba(255, 152, 0, 0.4)",
          backgroundColor: "transparent",
          borderColor: "#ff9800",
          pointHoverBackgroundColor: "#ff9800",
          borderWidth: 1,
          borderDash: [8, 5],
        },
        border: {
          width: 2,
        },
        ticks: {
          color: "#000000",
          callback: function (value: any, index: any, ticks: any) {
            const units = ["bit", "Kib", "Mib", "Gib", "Tib"];
            var res = value;
            let unitIndex = 0;
            while (res >= 1024 && unitIndex < units.length - 1) {
              res /= 1024;
              unitIndex++;
            }
            return res.toFixed(3) + " " + units[unitIndex];
          },
        },
      },
    },
    elements: {
      line: {
        borderWidth: 1,
        tension: 0.1,
      },
      point: {
        radius: 2,
        hitRadius: 10,
        hoverRadius: 6,
      },
    },
  };
  
  public options: any;
  public delta: string = "5m";
  public stats: any = false;

  ngOnInit(): void {
    this.options = this.Chartoptions;
    this.initStats();
    this.initTrafficChart();
    this.startDataRefresh();
  }

  // Dashboard customization methods
  showWizardModal(): void {
    this.wizardModalVisible = true;
    this.wizardForm.reset();
  }

  showViewModal(): void {
    this.viewModalVisible = true;
    this.viewForm.reset();
  }

  toggleRemoveMode(): void {
    this.isRemoveMode = !this.isRemoveMode;
  }

  commitWizard(): void {
    if (this.wizardForm.valid) {
      const formValue = this.wizardForm.value;
      const newWidget: CustomWidget = {
        id: this.generateId(),
        type: formValue.wizardType,
        title: formValue.wizardTitle,
        position: this.getNextAvailablePosition(),
        data: this.getInitialWidgetData(formValue.wizardType)
      };
      
      this.customWidgets.push(newWidget);
      this.saveDashboardConfig();
      this.wizardModalVisible = false;
      this.startWidgetDataRefresh(newWidget);
    }
  }

  commitView(): void {
    if (this.viewForm.valid) {
      const formValue = this.viewForm.value;
      const newView: CustomView = {
        id: this.generateId(),
        name: formValue.viewName,
        description: formValue.viewDescription,
        position: this.getNextAvailablePosition()
      };
      
      this.customViews.push(newView);
      this.saveDashboardConfig();
      this.viewModalVisible = false;
    }
  }

  removeWidget(widgetType: string): void {
    this.widgets[widgetType].enabled = false;
    this.saveDashboardConfig();
  }

  removeCustomWidget(index: number): void {
    this.customWidgets.splice(index, 1);
    this.saveDashboardConfig();
  }

  removeCustomView(index: number): void {
    this.customViews.splice(index, 1);
    this.saveDashboardConfig();
  }

  // Helper methods
  private generateId(): string {
    return 'widget_' + Math.random().toString(36).substr(2, 9);
  }

  private getNextAvailablePosition(): { col: string; row: string } {
    const totalWidgets = Object.keys(this.widgets).filter(key => this.widgets[key].enabled).length + 
                        this.customWidgets.length + this.customViews.length;
    const row = Math.floor(totalWidgets / 2) + 3; // Start after default widgets
    const col = (totalWidgets % 2) === 0 ? '1 / 2' : '2 / 3';
    return { col, row: row.toString() };
  }

  private getInitialWidgetData(type: string): any {
    switch (type) {
      case 'cpu':
        return { usage: 0 };
      case 'memory':
        return { usage: 0, used: 0, total: 0 };
      case 'disk':
        return { usage: 0, used: 0, total: 0 };
      case 'network':
        return { download: '0 MB/s', upload: '0 MB/s' };
      default:
        return {};
    }
  }

  private loadDashboardConfig(): void {
    const saved = localStorage.getItem('dashboard_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        this.widgets = { ...this.widgets, ...config.widgets };
        this.customWidgets = config.customWidgets || [];
        this.customViews = config.customViews || [];
      } catch (e) {
        console.error('Error loading dashboard config:', e);
      }
    }
  }

  private saveDashboardConfig(): void {
    const config = {
      widgets: this.widgets,
      customWidgets: this.customWidgets,
      customViews: this.customViews
    };
    localStorage.setItem('dashboard_config', JSON.stringify(config));
  }

  private startDataRefresh(): void {
    // Refresh widget data every 5 seconds
    setInterval(() => {
      this.customWidgets.forEach(widget => this.updateWidgetData(widget));
    }, 5000);
  }

  private startWidgetDataRefresh(widget: CustomWidget): void {
    this.updateWidgetData(widget);
  }

  private updateWidgetData(widget: CustomWidget): void {
    // Simulate data updates - in real implementation, fetch from API
    switch (widget.type) {
      case 'cpu':
        widget.data.usage = Math.floor(Math.random() * 100);
        break;
      case 'memory':
        widget.data.usage = Math.floor(Math.random() * 100);
        widget.data.used = (Math.random() * 16).toFixed(1);
        widget.data.total = 16;
        break;
      case 'disk':
        widget.data.usage = Math.floor(Math.random() * 100);
        widget.data.used = (Math.random() * 500).toFixed(1);
        widget.data.total = 500;
        break;
      case 'network':
        widget.data.download = (Math.random() * 100).toFixed(1) + ' MB/s';
        widget.data.upload = (Math.random() * 50).toFixed(1) + ' MB/s';
        break;
    }
  }

  // Original methods
  initTrafficChart(): void {
    var _self = this;
    this.data_provider.dashboard_traffic(this.delta).then((res) => {
      let labels = res["data"]["labels"].map((d: any) => {
        return (d = formatInTimeZone(
          d.split(".")[0] + ".000Z",
          _self.tz,
          "yyyy-MM-dd HH:mm:ss"
        ));
      });
      _self.chart_data = { datasets: res["data"]["datasets"], labels: labels };
    });
  }

  initStats(): void {
    var _self = this;
    this.data_provider.dashboard_stats(true, this.front_version).then((res) => {
      _self.stats = res;
    });
  }

  copy_this(): void {
    this.copy_msg = true;
    setTimeout(() => {
      this.copy_msg = false;
    }, 3000);
  }

  setTrafficPeriod(value: string): void {
    this.trafficRadioGroup.setValue({ trafficRadio: value });
    this.delta = value;
    this.initTrafficChart();
  }

  showConfirmModal(action: string): void {
    this.action = action;
    this.ConfirmModalVisible = true;
  }

  ConfirmAction(): void {
    var _self = this;
    this.data_provider.apply_update(this.action).then((res) => {
      if (res["status"] == 'success') {
        if (_self.action == 'update_mikroman') {
          _self.stats['update_inprogress'] = true;
        }
        if (_self.action == 'update_mikrofront') {
          _self.stats['front_update_inprogress'] = true;
        }
        _self.action = "";
        _self.ConfirmModalVisible = false;
      }
    });
  }
}
