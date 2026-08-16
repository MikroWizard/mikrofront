import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { dataProvider } from "../../providers/mikrowizard/data";
import { ToasterComponent } from '@coreui/angular';
import { AppToastComponent } from '../toast-simple/toast.component';
import { NgxSuperSelectOptions } from "ngx-super-select";
import { Table } from 'primeng/table';

@Component({
    selector: 'app-sequences',
    templateUrl: './sequences.component.html',
    styleUrls: ['./sequences.component.scss']
})
export class SequencesComponent implements OnInit {

    public sequences: any[] = [];
    public source: any[] = [];

    @ViewChildren(ToasterComponent) viewChildren!: QueryList<ToasterComponent>;
    toasterForm = {
        placement: 'top-end',
        delay: 5000,
    };

    show_toast(title: string, body: string, color: string) {
        const { ...props } = { ...this.toasterForm, color, title, body };
        if (this.viewChildren && this.viewChildren.first) {
            this.viewChildren.first.addToast(AppToastComponent, props);
        }
    }

    @ViewChild('dt') table!: Table;
    @ViewChild('dtMembers') tableMembers!: Table;
    @ViewChild('dtNewMembers') tableNewMembers!: Table;

    applyFilterGlobal($event: any, stringVal: string) {
        this.table.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
    }

    applyFilterMembers($event: any, stringVal: string) {
        this.tableMembers.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
    }

    applyFilterNewMembers($event: any, stringVal: string) {
        this.tableNewMembers.filterGlobal(($event.target as HTMLInputElement).value, stringVal);
    }

    public EditSequenceModalVisible: boolean = false;
    public current_sequence: any = {
        id: 0,
        name: '',
        source_snippet_id: null,
        store_all_history: false,
        is_active: true,
        conditions_json: []
    };

    public ManageAlertsModalVisible: boolean = false;
    public editingAlert: any = { id: 0, name: '', level: 'Info' };

    public Snippets: any = [];
    public Alerts: any = [];
    public ModalAction: string = "add";
    public ExecSequenceModalVisible: boolean = false;
    public SelectedSequence: any = {};
    public SelectedMembers: any[] = [];
    public SelectedTaskItems: any[] = [];
    public availbleMembers: any[] = [];
    public NewMemberModalVisible: boolean = false;
    public SelectedNewMemberRows: any[] = [];
    public NewMemberRows: any[] = [];
    public uid: number = 0;
    
    public loading: boolean = true;

    // super select options
    snippetOptions: Partial<NgxSuperSelectOptions> = {
        selectionMode: "single",
        actionsEnabled: false,
        displayExpr: "name",
        valueExpr: "id",
        placeholder: "Select Snippet",
        searchEnabled: true,
    };

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
        this.MikroWizardRPC.getSessionInfo().then((res: any) => {
            this.uid = res.uid;
        });
        this.loadSequences();
        this.loadSnippets();
        this.loadAlerts();
    }

    loadSequences() {
        this.MikroWizardRPC.get_sequences().then(
            (res: any) => {
                if (res) {
                    this.source = res.map((seq: any) => {
                        if (typeof seq.conditions_json === 'string') {
                            try {
                                seq.conditions_json = JSON.parse(seq.conditions_json);
                            } catch (e) {
                                seq.conditions_json = [];
                            }
                        }
                        if (!seq.conditions_json) seq.conditions_json = [];
                        return seq;
                    });
                }
            },
            (error: any) => {
                // Handle error visually if needed
            }
        );
    }

    loadSnippets(): void {
        this.MikroWizardRPC.get_snippets("", "", "", 0, 1000, false).then((res: any) => {
            this.Snippets = res.map((x: any) => ({ id: x.id, name: x.name }));
        });
    }

    loadAlerts(): void {
        this.MikroWizardRPC.get_alerts().then((res: any) => {
            this.Alerts = res.map((x: any) => ({ id: x.id, name: x.name, level: x.level }));
        });
    }

    addCondition(targetArray: any[]) {
        targetArray.push({
            type: 'contains',
            is_regex: false,
            pattern: '',
            actions: []
        });
    }

    addAction(condition: any) {
        if (!condition.actions) condition.actions = [];
        condition.actions.push({
            action_type: 'alert_set',
            alert_id: null,
            snippet_id: null,
            conditions: []
        });
    }

    removeNode(array: any[], index: number) {
        if (array && array.length > index) {
            array.splice(index, 1);
        }
    }

    Edit_Sequence(item: any, mode: string) {
        if (mode === 'add') {
            this.current_sequence = {
                id: 0,
                name: '',
                source_snippet_id: null,
                store_all_history: false,
                is_active: true,
                conditions_json: []
            };
            this.ModalAction = 'add';
        } else {
            // deep copy
            this.current_sequence = JSON.parse(JSON.stringify(item));
            if (!this.current_sequence.conditions_json) this.current_sequence.conditions_json = [];
            this.ModalAction = 'edit';
        }
        this.EditSequenceModalVisible = true;
    }

    save_sequence() {
        let payload = { ...this.current_sequence };
        if (payload.conditions_json && typeof payload.conditions_json !== 'string') {
            payload.conditions_json = JSON.stringify(payload.conditions_json);
        }
        this.MikroWizardRPC.save_sequence(payload).then((res: any) => {
            if (res && res.result === 'failed') {
                this.show_toast("Error", res.err || "Sequence save failed", "danger");
                return;
            }
            this.EditSequenceModalVisible = false;
            this.loadSequences();
            this.show_toast("Success", "Sequence saved", "success");
        }).catch((err: any) => {
            this.show_toast("Error", err && (err.err || err.message || err) || "Sequence save failed", "danger");
        });
    }

    onSelectSourceSnippet($event: any) {
        this.current_sequence.source_snippet_id = $event;
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
        });
    }

    deleteAlert(id: number) {
        if (confirm("Are you sure you want to delete this alert?")) {
            this.MikroWizardRPC.delete_alert(id).then(() => {
                this.loadAlerts();
            });
        }
    }

    confirm_delete(item: any, confirm: boolean) {
        if (!confirm) {
            if (window.confirm("Are you sure you want to delete sequence: " + item.name + "?")) {
                this.MikroWizardRPC.delete_sequence(item.id).then(() => {
                    this.loadSequences();
                });
            }
        }
    }
    public HistoryModalVisible: boolean = false;
    public sequence_history: any[] = [];
    public viewing_sequence_name: string = '';

    public TraceModalVisible: boolean = false;
    public current_trace: any = {};
    public viewing_device_id: number = 0;

    showTrace(dev: any) {
        this.current_trace = dev;
        this.viewing_device_id = dev.device_id;
        this.TraceModalVisible = true;
    }

    show_history(item: any) {
        this.viewing_sequence_name = item.name;
        this.sequence_history = [];
        this.HistoryModalVisible = true;
        this.MikroWizardRPC.get_sequence_history(item.id).then((res: any) => {
            // Process the nested history response
            this.sequence_history = res.map((run: any) => {
                const total = run.devices.length;
                const success = run.devices.filter((d: any) => d.status === 'success').length;
                return {
                    ...run,
                    successCount: success,
                    totalCount: total,
                    visible: false,
                    devices: run.devices.map((dev: any) => ({
                        ...dev,
                        parsedLog: this.parseLog(dev.task_log)
                    }))
                };
            });
        });
    }

    parseLog(logJson: any) {
        if (!logJson) return { ssh_output: '', evaluation: '' };

        let processed = logJson;
        // Normalize any escaped newlines if it's a string
        if (typeof logJson === 'string') {
            processed = logJson.split('\\n').join('\n').replace(/\r\n/g, '\n');
        }

        // If it's already an object, use it directly (but normalize ssh_output)
        if (typeof processed === 'object' && processed !== null) {
            if (processed.ssh_output) {
                processed.ssh_output = processed.ssh_output.split('\\n').join('\n').replace(/\r\n/g, '\n');
            }
            return processed;
        }

        // Try to parse as JSON first (new format)
        try {
            if (typeof processed === 'string' && processed.trim().startsWith('{')) {
                const parsed = JSON.parse(processed);
                if (parsed.ssh_output) {
                    parsed.ssh_output = parsed.ssh_output.split('\\n').join('\n').replace(/\r\n/g, '\n');
                }
                return parsed;
            }
        } catch (e) {
            // Not JSON, continue to legacy parsing
        }

        // Legacy Interleaved Log parsing
        if (typeof processed !== 'string') return { ssh_output: processed, evaluation: '' };

        const lines = processed.split('\n');
        let outputSections: string[] = [];
        let evalSections: string[] = [];
        
        let currentSection: string[] = [];
        let isCurrentOutput = true;

        for (let line of lines) {
            const lowerLine = line.toLowerCase();
            const startsNewOutput = lowerLine.includes('output (') || (lowerLine.includes('ssh output') && !lowerLine.includes('failed'));
            const startsNewEval = lowerLine.includes('evaluation');

            if (startsNewOutput || startsNewEval) {
                // Save previous section
                if (currentSection.length > 0) {
                    const block = currentSection.join('\n').trim();
                    if (isCurrentOutput) outputSections.push(block);
                    else evalSections.push(block);
                }
                // Start new section
                currentSection = [line];
                isCurrentOutput = startsNewOutput;
            } else {
                currentSection.push(line);
            }
        }

        // Final section
        if (currentSection.length > 0) {
            const block = currentSection.join('\n').trim();
            if (isCurrentOutput) outputSections.push(block);
            else evalSections.push(block);
        }

        return {
            ssh_output: outputSections.join('\n\n').trim(),
            evaluation: evalSections.join('\n\n').trim()
        };
    }

    // --- Manual Execution ---
    Run_Sequence(item: any) {
        this.SelectedSequence = item;
        this.current_sequence = { ...item };
        this.current_sequence["selection_type"] = "devices";
        this.SelectedMembers = [];
        this.SelectedTaskItems = [];
        this.loadSelectionFromStorage(item.id);
        this.ExecSequenceModalVisible = true;
    }

    getSelectionKey(sequenceId: number): string {
        return `sequence_selection_${this.uid}_${sequenceId}`;
    }

    saveSelectionToStorage(sequenceId: number): void {
        const key = this.getSelectionKey(sequenceId);
        const data = {
            selection_type: this.current_sequence['selection_type'],
            SelectedTaskItems: this.SelectedTaskItems,
            SelectedMembers: this.SelectedMembers
        };
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadSelectionFromStorage(sequenceId: number): boolean {
        const key = this.getSelectionKey(sequenceId);
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.current_sequence['selection_type'] = data.selection_type || 'devices';
                this.SelectedTaskItems = data.SelectedTaskItems || [];
                this.SelectedMembers = data.SelectedMembers || [];
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    clearStoredSelection(): void {
        const key = this.getSelectionKey(this.current_sequence.id);
        localStorage.removeItem(key);
        this.form_changed();
    }

    form_changed() {
        this.SelectedMembers = [];
        this.SelectedTaskItems = [];
    }

    remove_member(item: any) {
        this.SelectedMembers = this.SelectedMembers.filter(
            (x: any) => x.id != item.id
        );
        this.SelectedTaskItems = this.SelectedMembers.map((x: any) => {
            return x.id;
        });
    }

    show_new_member_form() {
        this.NewMemberModalVisible = true;
        this.availbleMembers = [];
        this.SelectedNewMemberRows = [];
        this.NewMemberRows = [];

        var data = {
            group_id: false,
            search: false,
            page: false,
            size: 10000,
        };

        if (this.current_sequence["selection_type"] == "devices")
            this.MikroWizardRPC.get_dev_list(data).then((res: any) => {
                this.availbleMembers = res.filter(
                    (x: any) => !this.SelectedTaskItems.includes(x.id)
                );
            });
        else
            this.MikroWizardRPC.get_devgroup_list().then((res: any) => {
                this.availbleMembers = res.filter(
                    (x: any) => !this.SelectedTaskItems.includes(x.id)
                );
            });
    }

    onSelectedRowsNewMembers(rows: any): void {
        this.NewMemberRows = rows;
        this.SelectedNewMemberRows = rows.map((m: any) => m.source || m);
    }

    isObject(val: any): boolean {
        return typeof val === 'object' && val !== null && !Array.isArray(val);
    }

    isArray(val: any): boolean {
        return Array.isArray(val);
    }

    add_new_members() {
        this.SelectedMembers = [
            ...new Set(this.SelectedMembers.concat(this.SelectedNewMemberRows)),
        ];

        this.SelectedTaskItems = this.SelectedMembers.map((x: any) => {
            return x.id;
        });

        this.NewMemberModalVisible = false;
    }

    submit_exec() {
        this.saveSelectionToStorage(this.SelectedSequence.id);
        const payload = {
            sequence_id: this.SelectedSequence.id,
            selection_type: this.current_sequence.selection_type,
            members: this.SelectedTaskItems
        };
        this.MikroWizardRPC.exec_sequence(payload).then((res: any) => {
            if (res && typeof res === 'object' && !Array.isArray(res) &&
                (res.status === 'failed' || res.result === 'failed')) {
                this.show_toast("Error", res.err || res.error || "Sequence execution failed", "danger");
                return;
            }
            this.ExecSequenceModalVisible = false;
            this.show_toast("Success", "Sequence execution started", "success");
        }).catch((err: any) => {
            this.show_toast("Error", err && (err.err || err.message || err) || "Sequence execution failed", "danger");
        });
    }
}
