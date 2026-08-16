import { Component, OnInit } from "@angular/core";
import { UntypedFormControl, UntypedFormGroup } from "@angular/forms";
import { dataProvider } from "../../providers/mikrowizard/data";
import { loginChecker } from "../../providers/login_checker";
import { LicenseService } from "../../providers/license.service";
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
  public ConfirmModalVisible: boolean = false;
  public action: string = "";
  public licenseRefreshing: boolean = false;
  public licenseRefreshMsg: any = false;
  front_version=require('../../../../package.json').version;
  constructor(
    private data_provider: dataProvider,
    private router: Router,
    private login_checker: loginChecker,
    private licenseService: LicenseService
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

  public get licenseDims(): Array<{ label: string; icon: string; used: number; total: number }> {
    const u = this.stats && this.stats['license_usage'];
    if (!u) return [];
    return [
      { label: 'MikroTik devices', icon: 'fa-server', used: u.mikrotik?.used || 0, total: u.mikrotik?.total || 0 },
      { label: 'Non-MikroTik devices', icon: 'fa-network-wired', used: u.other?.used || 0, total: u.other?.total || 0 },
      { label: 'PAM seats', icon: 'fa-user-shield', used: u.pam_seats?.used || 0, total: u.pam_seats?.total || 0 },
    ];
  }

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
    this.data_provider.dashboard_stats(true,this.front_version).then((res) => {
      _self.stats = res;
    });
  }

  refreshLicense() {
    var _self = this;
    this.licenseRefreshing = true;
    this.licenseRefreshMsg = false;
    this.data_provider.refreshLicense().then((res) => {
      if (res && res.status === 'success') {
        _self.licenseRefreshMsg = { color: 'success', text: 'License updated' };
        if (res.license) {
          _self.licenseService.setLicenseState(res.license);
        }
        _self.initStats();
      } else {
        _self.licenseRefreshMsg = { color: 'danger', text: 'Reload failed' };
      }
      _self.licenseRefreshing = false;
    }).catch((err) => {
      _self.licenseRefreshMsg = { color: 'danger', text: 'Reload failed' };
      _self.licenseRefreshing = false;
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
  showConfirmModal(action: string) {
    this.action = action;
    this.ConfirmModalVisible = true
  }
  ConfirmAction() {
    var _self = this;
      this.data_provider.apply_update(this.action).then((res) => {
        if (res["status"]=='success') {
          if (_self.action=='update_mikroman') {
            _self.stats['update_inprogress']=true;
          }
          if (_self.action=='update_mikrofront') {
            _self.stats['front_update_inprogress']=true;
          }
          _self.action="";
          _self.ConfirmModalVisible = false;
        }
      });
  }
}
