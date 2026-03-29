import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { dataProvider } from "../../providers/mikrowizard/data";
import { NgxSuperSelectOptions } from "ngx-super-select";
import { ToastComponent } from '@coreui/angular';

interface RegexSegment {
    type: 'static' | 'dynamic';
    value: string;         // Used for static text
    captureType?: string;  // Used for dynamic: everything, word, ip, mac
    targetField?: string;  // Mapping: src, detail, level, status, comment
}

@Component({
    selector: 'app-syslog-regex',
    templateUrl: './syslog-regex.component.html',
    styleUrls: ['./syslog-regex.component.scss']
})
export class SyslogRegexComponent implements OnInit {
    @ViewChild('dt') dt: Table | undefined;

    public syslogRegexes: any[] = [];

    // Grid config
    source: Array<any> = [];
    searching = {
        enabled: true,
        placeholder: 'Search regexes...'
    };
    paging = {
        enabled: true,
        pageSize: 10,
        pageSizes: [10, 25, 50]
    };
    columnMenu = { enabled: false };
    sorting = { enabled: true };
    infoPanel = { enabled: true };
    rowSelection: any = {
        enabled: true,
        type: 'checkbox',
        mode: 'multiple',
    };

    public EditRegexModalVisible: boolean = false;
    public current_regex: any = {
        id: 0,
        name: '',
        regex_pattern: '',
        alert_enabled: false,
        alert_id: null,
        global_alert: true,
        match_string: '',
        alert_mode: 'global',
        default_eventtype: '',
        default_status: 0
    };

    // Builder vs Raw Mode
    public inputMode: 'raw' | 'builder' = 'raw';
    public rawRegexError: string = '';
    public sampleLog: string = '';

    // Segment-based Builder State
    public segments: RegexSegment[] = [];

    public generatedRegex: string = '';
    public testFeedback: string = '';
    public testResults: { field: string, value: string }[] = [];
    public simulatedDbRow: { eventtype: string, src: string, detail: string, level: string, status: string, comment: string } | null = null;
    public isTestValid: boolean = false;
    public extractedValue: string = '';
    public syslogSamples: string[] = [];
    public selectedSampleIndex: number | null = null;

    public ManageAlertsModalVisible: boolean = false;
    public editingAlert: any = { id: 0, name: '', level: 'Info' };

    public Alerts: any = [];
    public ModalAction: string = "add";

    // super select options
    alertOptions: Partial<NgxSuperSelectOptions> = {
        selectionMode: "single",
        actionsEnabled: false,
        displayExpr: "name",
        valueExpr: "id",
        placeholder: "Select Alert",
        searchEnabled: true,
    };

    constructor(public MikroWizardRPC: dataProvider) { }

    ngOnInit(): void {
        this.loadRegexes();
        this.loadAlerts();
    }

    applyFilterGlobal($event: any, stringVal: string) {
        this.dt!.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
    }

    loadRegexes() {
        this.MikroWizardRPC.get_syslog_regexes().then(
            (res: any) => {
                if (res) {
                    this.source = res;
                }
            },
            (error: any) => {
                // Handle error visually if needed
            }
        );
    }

    loadAlerts(): void {
        this.MikroWizardRPC.get_alerts().then((res: any) => {
            this.Alerts = res.map((x: any) => ({ id: x.id, name: x.name, level: x.level }));
        });
    }

    resetBuilder() {
        this.segments = [];
        this.generatedRegex = '';
        this.testFeedback = '';
        this.testResults = [];
        this.simulatedDbRow = null;
        this.extractedValue = '';
        this.selectedSampleIndex = null;
        this.loadSyslogSamples();
    }

    Edit_Regex(item: any, mode: string) {
        // Reset builder state
        this.inputMode = 'raw';
        this.rawRegexError = '';
        this.resetBuilder();

        if (mode === 'add') {
            this.current_regex = {
                id: 0,
                name: '',
                regex_pattern: '',
                alert_enabled: false,
                alert_id: null,
                global_alert: true,
                match_string: '',
                alert_mode: 'global',
                eventtype: '',
                status: 0
            };
            this.ModalAction = 'add';
        } else {
            // deep copy
            this.current_regex = JSON.parse(JSON.stringify(item));
            this.current_regex.alert_mode = this.current_regex.global_alert ? 'global' : 'conditional';

            // Try to deconstruct the regex into builder segments
            if (this.current_regex.regex_pattern) {
                const wasDeconstructed = this.deconstructRegex(this.current_regex.regex_pattern);
                if (wasDeconstructed) {
                    this.inputMode = 'builder';
                }
            }

            this.ModalAction = 'edit';
        }

        // Initial validation
        this.validateRawRegex();

        this.EditRegexModalVisible = true;
    }

    save_regex() {
        if (this.inputMode === 'builder') {
            this.current_regex.regex_pattern = this.generatedRegex;
        }

        // Final validation check
        this.validateRawRegex();
        if (this.rawRegexError && this.inputMode === 'raw') {
            return; // Prevent save if invalid
        }
        if (!this.isTestValid && this.inputMode === 'builder') {
            if (!this.generatedRegex) return;
        }

        let payload = { ...this.current_regex };
        // Ensure alert_id is null if not alert_enabled
        if (!payload.alert_enabled) {
            payload.alert_id = null;
            payload.global_alert = false;
            payload.match_string = '';
        } else {
            if (payload.alert_mode === 'global') {
                payload.global_alert = true;
                payload.match_string = '';
            } else {
                payload.global_alert = false;
                if (!payload.match_string) {
                    alert("Please provide a Match String for conditional alert storage.");
                    return;
                }
            }
        }

        // Remove internal properties and level (now inherited from alert)
        delete payload.alert_mode;
        delete payload.level;

        // Ensure alert_id is mandatory for save (as per v3.2)
        if (payload.alert_enabled && !payload.alert_id) {
            alert("Please select an Alert Definition.");
            return;
        }

        this.MikroWizardRPC.save_syslog_regex(payload).then(() => {
            this.EditRegexModalVisible = false;
            this.loadRegexes();
        });
    }

    confirm_delete(item: any, confirm: boolean) {
        if (!confirm) {
            if (window.confirm("Are you sure you want to delete custom regex: " + item.name + "?")) {
                this.MikroWizardRPC.delete_syslog_regex(item.id).then(() => {
                    this.loadRegexes();
                });
            }
        }
    }

    // --- Alert Management ---
    openManageAlerts() {
        this.ManageAlertsModalVisible = true;
        this.editingAlert = { id: 0, name: '', level: 'Info', description: '' };
    }

    editAlert(item: any) {
        this.editingAlert = { ...item };
    }

    saveAlert() {
        this.MikroWizardRPC.save_alert(this.editingAlert).then(() => {
            this.loadAlerts();
            this.editingAlert = { id: 0, name: '', level: 'Info', description: '' };
            this.loadRegexes();
        });
    }

    deleteAlert(id: number) {
        if (confirm("Are you sure you want to delete this alert?")) {
            this.MikroWizardRPC.delete_alert(id).then(() => {
                this.loadAlerts();
            });
        }
    }

    // --- Syslog Samples Management ---
    loadSyslogSamples() {
        this.MikroWizardRPC.get_syslogregex_samples().then(
            (res: any) => {
                if (res && Array.isArray(res)) {
                    this.syslogSamples = res;
                }
            },
            (error: any) => {
                console.error("Failed to load syslog samples", error);
            }
        );
    }

    onSampleSelected() {
        if (this.selectedSampleIndex !== null && this.syslogSamples[this.selectedSampleIndex]) {
            this.sampleLog = this.syslogSamples[this.selectedSampleIndex];
            this.updateBuilder();
        }
    }

    getAlertName(id: any): string {
        const alert = this.Alerts.find((a: any) => Number(a.id) === Number(id));
        return alert ? alert.name : 'No Alert';
    }

    getAlertLevel(id: any): string {
        const alert = this.Alerts.find((a: any) => Number(a.id) === Number(id));
        return alert ? alert.level : 'N/A';
    }

    openAIHelp() {
        if (!this.sampleLog) return;

        const currentRegexText = this.current_regex.regex_pattern ? `\nOptional context - my current attempt is:\n"${this.current_regex.regex_pattern}"` : "";

        const prompt = `I need help creating a Python regex pattern (re module syntax) for a specific syslog message.

### My Syslog Sample:
"${this.sampleLog}"

### Requirement:
Create a regex that extracts the most important information from this log into a named capture group called "comment" using the syntax: (?P<comment>...)
${currentRegexText}

### Example Format:
If the log was "System error: Disk full", the regex should be "System error: (?P<comment>.*)".

Please provide the completed Python regex for my sample log.`;

        const encodedPrompt = encodeURIComponent(prompt);
        window.open(`https://chatgpt.com/?q=${encodedPrompt}`, '_blank');
    }

    // --- Segment Management ---
    addSegment(type: 'static' | 'dynamic') {
        if (type === 'static') {
            this.segments.push({ type: 'static', value: '' });
        } else {
            this.segments.push({ type: 'dynamic', value: '', captureType: 'everything' });
        }
        this.updateBuilder();
    }

    removeSegment(index: number) {
        this.segments.splice(index, 1);
        this.updateBuilder();
    }

    moveSegmentUp(index: number) {
        if (index > 0) {
            const temp = this.segments[index - 1];
            this.segments[index - 1] = this.segments[index];
            this.segments[index] = temp;
            this.updateBuilder();
        }
    }

    moveSegmentDown(index: number) {
        if (index < this.segments.length - 1) {
            const temp = this.segments[index + 1];
            this.segments[index + 1] = this.segments[index];
            this.segments[index] = temp;
            this.updateBuilder();
        }
    }

    // --- Regex Builder Deconstruction ---
    deconstructRegex(pattern: string): boolean {
        // This is a specialized parser to turn regex strings back into segments
        if (!pattern) return false;

        // Common patterns we use
        const capturePatterns: { [key: string]: string } = {
            'word': '\\S+',
            'ip': '\\d{1,3}(?:\\.\\d{1,3}){3}',
            'mac': '[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}',
            'number': '\\d+',
            'everything': '.*'
        };

        try {
            // Split by the delimiter we use in updateBuilder: "\\s*"
            const parts = pattern.split('\\s*');
            const newSegments: any[] = [];

            for (const part of parts) {
                if (!part) continue;

                // Match a named capture group: (?P<name>pattern)
                const namedMatch = part.match(/^\(\?P<([^>]+)>(.+)\)$/);
                if (namedMatch) {
                    const field = namedMatch[1];
                    const innerPattern = namedMatch[2];

                    // Try to identify the capture type
                    let cType = 'custom';
                    let cValue = innerPattern;

                    for (const [type, p] of Object.entries(capturePatterns)) {
                        if (innerPattern === p) {
                            cType = type;
                            cValue = '';
                            break;
                        }
                    }

                    newSegments.push({
                        type: 'dynamic',
                        captureType: cType,
                        targetField: field,
                        value: cType === 'custom' ? cValue : ''
                    });
                    continue;
                }

                // Match a positional capture group: (pattern)
                const groupMatch = part.match(/^\((.+)\)$/);
                if (groupMatch) {
                    const innerPattern = groupMatch[1];

                    let cType = 'custom';
                    let cValue = innerPattern;

                    for (const [type, p] of Object.entries(capturePatterns)) {
                        if (innerPattern === p) {
                            cType = type;
                            cValue = '';
                            break;
                        }
                    }

                    newSegments.push({
                        type: 'dynamic',
                        captureType: cType,
                        targetField: undefined,
                        value: cType === 'custom' ? cValue : ''
                    });
                    continue;
                }

                // Otherwise, it's static (or a complex regex part we treat as static)
                // We unescape things that we know we escape
                let val = part.replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
                newSegments.push({ type: 'static', value: val });
            }

            if (newSegments.length > 0) {
                this.segments = newSegments;
                this.updateBuilder(); // Refresh generatedRegex and simulations
                return true;
            }
        } catch (e) {
            console.error("Failed to deconstruct regex:", e);
        }
        return false;
    }

    // --- Regex Builder & Validation Methods ---

    validateRawRegex() {
        this.rawRegexError = '';
        if (!this.current_regex.regex_pattern) {
            this.rawRegexError = 'Regex pattern is required.';
            return;
        }

        try {
            new RegExp(this.current_regex.regex_pattern);
            if (!/\(.*\)/.test(this.current_regex.regex_pattern)) {
                this.rawRegexError = 'Must contain at least one capturing group ().';
            }
        } catch (e) {
            this.rawRegexError = 'Invalid regular expression syntax.';
        }
    }

    onRawRegexChange() {
        this.validateRawRegex();
        if (this.inputMode === 'raw') {
            this.evaluateRegexAgainstSample();
        }
    }

    setMode(mode: 'raw' | 'builder') {
        this.inputMode = mode;
        if (mode === 'builder') {
            this.updateBuilder();
        } else {
            if (this.generatedRegex && this.isTestValid) {
                this.current_regex.regex_pattern = this.generatedRegex;
            }
            this.validateRawRegex();
            this.evaluateRegexAgainstSample();
        }
    }

    escapeRegex(string: string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    updateBuilder() {
        let pattern = '';
        this.segments.forEach((seg, index) => {
            if (seg.type === 'static') {
                if (seg.value) {
                    let escaped = this.escapeRegex(seg.value);
                    pattern += escaped.trim();
                }
            } else {
                let capturePattern = '(.*)';
                if (seg.captureType === 'word') capturePattern = '(\\S+)';
                if (seg.captureType === 'ip') capturePattern = '(\\d{1,3}(?:\\.\\d{1,3}){3})';
                if (seg.captureType === 'mac') capturePattern = '([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})';
                if (seg.captureType === 'number') capturePattern = '(\\d+)';
                if (seg.captureType === 'custom' && seg.value) capturePattern = `(${seg.value})`;

                if (seg.targetField) {
                    pattern += `(?P<${seg.targetField}>${capturePattern.slice(1, -1)})`;
                } else {
                    pattern += capturePattern;
                }
            }

            if (index < this.segments.length - 1) {
                pattern += '\\s*';
            }
        });

        this.generatedRegex = pattern;
        this.evaluateRegexAgainstSample();
    }

    evaluateRegexAgainstSample() {
        this.testFeedback = '';
        this.isTestValid = false;
        this.testResults = [];
        this.simulatedDbRow = null;

        let regexToTest = this.inputMode === 'raw' ? this.current_regex.regex_pattern : this.generatedRegex;

        if (!this.sampleLog || !regexToTest) {
            return;
        }

        try {
            let jsPattern = regexToTest.replace(/\(\?P</g, '(?<');
            let re = new RegExp(jsPattern);
            let match = re.exec(this.sampleLog);

            if (match) {
                this.isTestValid = true;
                this.testFeedback = 'Matches Found!';
                this.testResults.push({ field: 'Full Match', value: match[0] });

                // Find the alert based on the select element matching
                const alertIdToMatch = this.current_regex.alert_id ? Number(this.current_regex.alert_id) : null;
                const selectedAlert = this.Alerts.find((a: any) => Number(a.id) === alertIdToMatch);

                let detailValue = '(Inherited from Alert)';
                let levelValue = '(Inherited from Alert)';

                if (this.current_regex.alert_enabled && selectedAlert) {
                    detailValue = selectedAlert.name;
                    levelValue = selectedAlert.level;
                } else if (!this.current_regex.alert_enabled) {
                    detailValue = '(No Alert Linked)';
                    levelValue = '(No Alert Linked)';
                }

                let dbRow = {
                    eventtype: this.current_regex.eventtype || '',
                    src: 'custom regex',
                    detail: detailValue,
                    level: levelValue,
                    status: this.current_regex.status !== undefined ? this.current_regex.status.toString() : '0',
                    comment: this.sampleLog
                };

                if (match.groups) {
                    Object.keys(match.groups).forEach(key => {
                        this.testResults.push({ field: `[Mapped: ${key}]`, value: match.groups![key] });
                        if (key === 'comment') {
                            (dbRow as any)[key] = match.groups![key];
                        }
                    });
                } else if (match.length > 1) {
                    for (let i = 1; i < match.length; i++) {
                        this.testResults.push({ field: `Capture ${i}`, value: match[i] });
                    }
                }

                this.simulatedDbRow = dbRow;
            } else {
                this.testFeedback = "Pattern doesn't match the sample log.";
            }
        } catch (e: any) {
            this.testFeedback = 'Regex Error: ' + e.message;
        }
    }

    getHighlightedSampleBoxHtml(): string {
        if (!this.sampleLog || !this.generatedRegex || !this.isTestValid) return this.sampleLog || '';
        try {
            let jsPattern = this.generatedRegex.replace(/\(\?P</g, '(?<');
            let re = new RegExp(`(${jsPattern})`, 'i');
            return this.sampleLog.replace(re, '<mark class="bg-warning text-dark">$1</mark>');
        } catch (e) {
            return this.sampleLog;
        }
    }
}
