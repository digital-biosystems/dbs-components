import { bindable, resolve, IEventAggregator } from 'aurelia';
import { Chartjs3Base } from './chartjs3-base.js';

export class ChartjsTimeBase extends Chartjs3Base {
    @bindable fromid;
    @bindable labels;
    @bindable refindex;
    @bindable convertors;
    @bindable timedenom;
    @bindable timedenomfixed = 1;
    @bindable maxdata = 1024;
    @bindable labelxaxis = '';
    @bindable labelyaxis = '';
    @bindable demodata = false;

    labelsRaw = [];
    refindices;
    @bindable operation = []; // populated by dbs-convertors attribute

    constructor() {
        super();
        this.ea = resolve(IEventAggregator);
    }

    bound() {
        super.bound();
        if (typeof this.maxdata === 'string') this.maxdata = parseInt(this.maxdata, 10);
        if (typeof this.demodata === 'string') this.demodata = this.demodata === 'true';
        if (typeof this.labels === 'string') this.labelsRaw = this.labels.split(',');

        if (typeof this.refindex === 'string') {
            if (this.refindex.indexOf(',') > 0) {
                this.refindices = this.refindex.split(',');
            } else if (this.refindex.indexOf('-') > 0) {
                const parts = this.refindex.split('-');
                this.refindex = parseInt(parts[0], 10);
                const endindex = parseInt(parts[1], 10);
                this.refvalues = endindex - this.refindex + 1;
                this.refendindex = endindex + 1;
            } else {
                this.refindex = parseInt(this.refindex, 10);
                this.refvalues = 1;
                this.refendindex = this.refindex + 1;
            }
        } else {
            this.refvalues = 1;
            this.refendindex = this.refindex + 1;
        }

        if (typeof this.timedenomfixed === 'string') this.timedenomfixed = parseInt(this.timedenomfixed, 10);
        if (typeof this.timedenom === 'string') {
            this.timedenom = parseFloat(this.timedenom);
            this.timeoperation = x => (x / this.timedenom).toFixed(this.timedenomfixed);
        } else {
            this.timeoperation = x => x;
        }
    }

    // Subscribes to the four FMI event channels scoped to fromid.
    // Call from subclass attached() after the chart is created.
    subscribeToFmiEvents() {
        this.ea.subscribe(`fmidata:${this.fromid}`, msg => this.handleValueChange(msg));
        this.ea.subscribe(`fmireset:${this.fromid}`, () => this.resetChart());
        this.ea.subscribe(`fmistart:${this.fromid}`, () => {
            if (this.chart) {
                if (this.chart.options.tooltips) this.chart.options.tooltips.enabled = false;
                this.chart.options.hover.mode = null;
                this.chart.options.hover.animationDuration = 0;
                this.chart.canvas.style.pointerEvents = 'none';
                this.chart.update(0);
            }
        });
        this.ea.subscribe(`fmistop:${this.fromid}`, () => {
            if (this.chart) {
                if (this.chart.options.tooltips) this.chart.options.tooltips.enabled = true;
                this.chart.options.hover.mode = 'nearest';
                this.chart.canvas.style.pointerEvents = 'auto';
                this.chart.update(0);
            }
        });
    }

    handleValueChange(e) {
        let j = 0;
        function handleIndex(i) {
            if (this.operation && this.operation[j]) {
                this.chart.data.datasets[j].data.push(this.operation[j](e.data[i]));
            } else {
                this.chart.data.datasets[j].data.push(e.data[i]);
            }
            if (this.chart.data.datasets[j].data.length > this.maxdata) {
                this.chart.data.datasets[j].data.shift();
            }
            j++;
        }
        if (this.refindices) for (let i of this.refindices) handleIndex.call(this, i);
        else for (let i = this.refindex; i < this.refindex + this.refvalues; i++) handleIndex.call(this, i);
        this.chart.data.labels.push(this.timeoperation(e.time));
        if (this.chart.data.labels.length > this.maxdata) {
            this.chart.data.labels.shift();
        }
        this.updatechart();
    }

    updatechart() {
        if (this.chart.tooltip) {
            this.chart.tooltip._active = [];
            this.chart.active = [];
        }
        this.chart.update(0);
    }

    resetChart() {
        if (this.chart && this.chart.data && this.chart.data.datasets) {
            this.chart.data.datasets.forEach(dataset => { dataset.data = []; });
            this.chart.data.labels = [];
            this.chart.update();
        }
    }

    // Returns the shared legend plugin config used by all time-series charts.
    buildBasePluginsConfig() {
        return {
            legend: {
                labels: {
                    boxWidth: 8,
                    padding: 0,
                    font: { size: 8 }
                }
            }
        };
    }
}
