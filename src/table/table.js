import { customElement } from 'aurelia';
import rows from './table.json';
@customElement('dbs-table')
export class Table {
    // Paste your JSON here (shortened for brevity)

    languages = [];
    metricLabels = [
        'Language Support',
        'Context Awareness',
        'Bias & Halucination',
        'Robustness',
        'Performance',
    ];

    constructor() {
        // infer languages from first row: all keys except 'llm_model'
        this.rows = rows;
        if (rows.length > 0) {
            this.languages = Object.keys(rows[0]).filter(k => k !== 'llm_model');
        }
    }

    onRowHeaderClick(row) {
        // Hook for model-specific chart
        console.log('Row clicked:', row.llm_model, row);
        // e.g. this.selectedModel = row; this.showModelChart(row);
    }

    onColumnHeaderClick(lang) {
        // Hook for language-specific chart
        const valuesPerModel = rows.map(r => ({
            model: r.llm_model,
            values: r[lang],
        }));
        console.log('Column clicked:', lang, valuesPerModel);
        // e.g. this.showLanguageChart(lang, valuesPerModel);
    }
}
