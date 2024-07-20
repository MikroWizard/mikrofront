import { Component, OnInit } from "@angular/core";
import { UntypedFormControl, UntypedFormGroup } from "@angular/forms";
import { dataProvider } from "../../providers/mikrowizard/data";
import { loginChecker } from "../../providers/login_checker";
import { Router } from "@angular/router";
import { formatInTimeZone } from "date-fns-tz";

@Component({
  templateUrl: "dashboard.component.html",
})

export class DashboardComponent implements OnInit {
  public uid: number;
  public uname: string;
  public tz: string;
  public copy_msg: any = false;
  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker
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
      const userId = _self.uid;
    });
    //get datagrid data
    function isNotEmpty(value: any): boolean {
      return value !== undefined && value !== null && value !== "";
    }
  }

  public trafficRadioGroup = new UntypedFormGroup({
    trafficRadio: new UntypedFormControl("5m"),
  });
  public chart_data: any = {};
  Chartoptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const units = ["bit", "Kib", "Mib", "Gib", "Tib"];
            let label = context.dataset.label || "";
            var res = context.parsed.y;
            let unitIndex = 0;
            // if (res>8) res /=8;
            while (res >= 1024 && unitIndex < units.length - 1) {
              res /= 1024;
              unitIndex++;
            }
            switch (context.dataset.unit) {
              case "rx":
                return "rx/s :" + res.toFixed(3) + " " + units[unitIndex];
                break;
              case "tx":
                return "tx/s :" + res.toFixed(3) + " " + units[unitIndex];
                break;
              case "rxp":
                return "rxp/s :" + context.parsed.y;
                break;
              case "txp":
                return "txp/s :" + context.parsed.y;
                break;
              default:
                return context.parsed.y;
                break;
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
        color: "#17522f",
        grid: {
          color: "rgba(23, 82, 47, 0.3)",
          backgroundColor: "transparent",
          borderColor: "#f86c6b",
          pointHoverBackgroundColor: "#f86c6b",
          borderWidth: 1,
          borderDash: [8, 5],
        },
        ticks: {
          color: "#17522f",
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
          color: "rgba(23, 82, 47, 0.3)",
          backgroundColor: "transparent",
          borderColor: "#f86c6b",
          pointHoverBackgroundColor: "#f86c6b",
          borderWidth: 1,
          borderDash: [8, 5],
        },
        border: {
          width: 2,
        },
        ticks: {
          color: "#171951",
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
        tension: 0.4,
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
  }

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
  initStats() {
    var _self = this;
    this.data_provider.dashboard_stats(true).then((res) => {
      _self.stats = res;
    });
  }

  copy_this() {
    //show text copy to clipboard for 3 seconds
    this.copy_msg = true;
    setTimeout(() => {
      this.copy_msg = false;
    }, 3000);
  }

  // Traffic Chart
  setTrafficPeriod(value: string): void {
    this.trafficRadioGroup.setValue({ trafficRadio: value });
    this.delta = value;
    this.initTrafficChart();
  }
}
