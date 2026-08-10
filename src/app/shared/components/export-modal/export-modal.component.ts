import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

export interface ExportColumn {
  field: string;
  label: string;
  selected: boolean;
  default?: boolean;
}

@Component({
  selector: 'app-export-modal',
  templateUrl: './export-modal.component.html',
  styleUrls: ['./export-modal.component.scss']
})
export class ExportModalComponent implements OnChanges {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() title: string = 'Export Data Report';
  @Input() allData: any[] = [];
  @Input() filteredData?: any[] | null;
  @Input() selectedData?: any[];
  @Input() customColumns?: Array<{ field: string; label: string; selected?: boolean }>;
  @Input() dateField?: string;
  @Input() defaultFileName?: string;

  @Input() fetchFn?: (params: { startDate?: string; endDate?: string; scope?: string }) => Promise<any[]>;

  exportFormat: 'csv' | 'xls' = 'csv';
  exportScope: 'all' | 'filtered' | 'selected' = 'all';
  startDate: string = '';
  endDate: string = '';
  quickSearch: string = '';
  columnSearch: string = '';
  loadingData: boolean = false;
  fetchedData?: any[];

  columns: ExportColumn[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initModalState();
    } else if ((changes['allData'] || changes['customColumns']) && this.visible) {
      this.initColumns();
    }
  }

  async initModalState(): Promise<void> {
    this.fetchedData = undefined;
    this.startDate = '';
    this.endDate = '';
    this.quickSearch = '';
    this.columnSearch = '';

    if (this.selectedData && this.selectedData.length > 0) {
      this.exportScope = 'selected';
    } else {
      this.exportScope = 'all';
    }

    if (this.fetchFn) {
      await this.triggerFetch();
    } else {
      this.initColumns();
    }
  }

  async onScopeChange(): Promise<void> {
    if (this.exportScope === 'all' && this.fetchFn && !this.fetchedData) {
      await this.triggerFetch();
    } else {
      this.initColumns();
    }
  }

  async triggerFetch(): Promise<void> {
    if (!this.fetchFn) return;
    this.loadingData = true;
    try {
      const res = await this.fetchFn({
        startDate: this.startDate,
        endDate: this.endDate,
        scope: this.exportScope
      });
      this.fetchedData = res || [];
    } catch (err) {
      console.error('Error fetching export data:', err);
    } finally {
      this.loadingData = false;
      this.initColumns();
    }
  }

  initColumns(): void {
    const columnMap = new Map<string, ExportColumn>();

    // 1. Custom/Pre-defined columns
    if (this.customColumns && this.customColumns.length > 0) {
      this.customColumns.forEach(col => {
        columnMap.set(col.field, {
          field: col.field,
          label: col.label || this.formatLabel(col.field),
          selected: col.selected !== undefined ? col.selected : true
        });
      });
    }

    // 2. Discover all extra fields in data objects
    const dataset = this.getScopeRawData();
    dataset.forEach(item => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(key => {
          if (!columnMap.has(key) && !key.startsWith('_')) {
            const val = item[key];
            if (val === null || val === undefined || typeof val !== 'object' || Array.isArray(val)) {
              columnMap.set(key, {
                field: key,
                label: this.formatLabel(key),
                selected: this.customColumns && this.customColumns.length > 0 ? false : true
              });
            }
          }
        });
      }
    });

    this.columns = Array.from(columnMap.values());
  }

  formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  get filteredColumns(): ExportColumn[] {
    if (!this.columnSearch || !this.columnSearch.trim()) {
      return this.columns;
    }
    const q = this.columnSearch.toLowerCase().trim();
    return this.columns.filter(c => c.label.toLowerCase().includes(q) || c.field.toLowerCase().includes(q));
  }

  selectAllColumns(selected: boolean): void {
    this.columns.forEach(c => c.selected = selected);
  }

  get selectedColumns(): ExportColumn[] {
    return this.columns.filter(c => c.selected);
  }

  getScopeRawData(): any[] {
    if (this.exportScope === 'selected' && this.selectedData) {
      return this.selectedData;
    }
    if (this.exportScope === 'filtered' && this.filteredData) {
      return this.filteredData;
    }
    if (this.fetchedData) {
      return this.fetchedData;
    }
    return this.allData || [];
  }

  extractDateStr(val: any): string | null {
    if (val === null || val === undefined || val === '') return null;

    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return val.toISOString().slice(0, 10);
    }

    if (typeof val === 'number') {
      const ms = val < 10000000000 ? val * 1000 : val;
      const d = new Date(ms);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    }

    if (typeof val === 'string') {
      const s = val.trim();
      const m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
      if (m) {
        return `${m[1]}-${m[2]}-${m[3]}`;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }

    return null;
  }

  getProcessedData(): any[] {
    let list = this.getScopeRawData();

    // Date range filter
    if (!this.fetchFn && this.dateField && (this.startDate || this.endDate)) {
      list = list.filter(item => {
        const val = item[this.dateField!];
        if (val === undefined || val === null) return true;
        const dStr = this.extractDateStr(val);
        if (!dStr) return true;
        if (this.startDate && dStr < this.startDate) return false;
        if (this.endDate && dStr > this.endDate) return false;
        return true;
      });
    }

    // Quick search filter
    if (this.quickSearch && this.quickSearch.trim()) {
      const q = this.quickSearch.toLowerCase().trim();
      const selCols = this.selectedColumns;
      list = list.filter(item => {
        return selCols.some(col => {
          const val = item[col.field];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        });
      });
    }

    return list;
  }

  async onDateChange(): Promise<void> {
    if (this.fetchFn) {
      await this.triggerFetch();
    }
  }

  async setQuickDate(days: number): Promise<void> {
    const end = new Date();
    const start = new Date();
    if (days === 0) {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);
    }

    this.startDate = this.formatDateForInput(start);
    this.endDate = this.formatDateForInput(end);
    await this.onDateChange();
  }

  async clearDateFilter(): Promise<void> {
    this.startDate = '';
    this.endDate = '';
    if (this.fetchFn) {
      await this.triggerFetch();
    }
  }

  formatDateForInput(d: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  getPreviewData(): any[] {
    const data = this.getProcessedData();
    return data.slice(0, 5);
  }

  getCellValue(row: any, field: string): string {
    const val = row[field];
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  exportData(): void {
    const data = this.getProcessedData();
    const selCols = this.selectedColumns;

    if (data.length === 0 || selCols.length === 0) {
      return;
    }

    const baseName = this.defaultFileName || this.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${baseName}_${dateStr}.${this.exportFormat}`;

    if (this.exportFormat === 'csv') {
      this.downloadCsv(data, selCols, filename);
    } else {
      this.downloadXls(data, selCols, filename);
    }

    this.closeModal();
  }

  downloadCsv(data: any[], cols: ExportColumn[], filename: string): void {
    const headerRow = cols.map(c => this.escapeCsv(c.label)).join(',');
    const bodyRows = data.map(row => {
      return cols.map(c => this.escapeCsv(this.getCellValue(row, c.field))).join(',');
    });

    const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, filename);
  }

  downloadXls(data: any[], cols: ExportColumn[], filename: string): void {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
 <Style ss:ID="Header">
  <Font ss:Bold="1" ss:Color="#FFFFFF"/>
  <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
 </Style>
 <Style ss:ID="Cell">
  <Alignment ss:Vertical="Center"/>
 </Style>
</Styles>
<Worksheet ss:Name="Report">
<Table>
<Row ss:Height="24">`;

    cols.forEach(c => {
      xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${this.escapeXml(c.label)}</Data></Cell>`;
    });
    xml += `</Row>`;

    data.forEach(row => {
      xml += `<Row>`;
      cols.forEach(c => {
        const val = this.getCellValue(row, c.field);
        xml += `<Cell ss:StyleID="Cell"><Data ss:Type="String">${this.escapeXml(val)}</Data></Cell>`;
      });
      xml += `</Row>`;
    });

    xml += `</Table></Worksheet></Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    this.triggerDownload(blob, filename);
  }

  escapeCsv(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  escapeXml(val: string): string {
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
