import { Chart } from "chart.js/auto";
import 'chartjs-adapter-date-fns';
import { bindable, customElement } from "aurelia";
import { ChartjsTimeBase } from "./chartjs-time-base.js";
import mydata from './mydata.json';

@customElement('dbs-chartjs3')
export class Chartjs3 extends ChartjsTimeBase {
    @bindable therapLevel = 0.005;
    @bindable toxicLevel = 0.012;
    @bindable xvalueunit = 'seconds';
    @bindable labels = "patient, , ,population norm, , ";
    @bindable labelxaxis = "Time [seconds]";
    @bindable levellabels = "therapeutic,toxic";
    @bindable levelvalues = "0.005,0.012";
    @bindable maxdata = 1024;

    bound() {
        const hasExplicitTimeDenom = this.timedenom !== undefined && this.timedenom !== null && this.timedenom !== '';
        super.bound();
        if (typeof this.therapLevel === 'string') this.therapLevel = parseFloat(this.therapLevel);
        if (typeof this.toxicLevel === 'string') this.toxicLevel = parseFloat(this.toxicLevel);
        this.levell = this.levellabels.split(',');
        this.levelv = this.levelvalues.split(',');

        this.hasExplicitTimeDenom = hasExplicitTimeDenom;
        this.usesAutoXLabel = !this.labelxaxis || this.labelxaxis === 'Time [seconds]' || this.labelxaxis === 'Time';

        this.xvalueunit = this.normalizeTimeUnit(this.xvalueunit);
        if (!this.hasExplicitTimeDenom) {
            const divisor = this.getTimeDivisorForUnit(this.xvalueunit);
            this.timedenom = divisor;
            this.timeoperation = x => this.formatTimeValue(x / divisor);
        }
        if (this.usesAutoXLabel) {
            this.labelxaxis = this.getTimeAxisLabel(this.xvalueunit);
        }
    }

    normalizeTimeUnit(unit) {
        const normalized = String(unit || 'seconds').trim().toLowerCase();
        const aliases = {
            s: 'seconds',
            sec: 'seconds',
            second: 'seconds',
            seconds: 'seconds',
            m: 'minutes',
            min: 'minutes',
            minute: 'minutes',
            minutes: 'minutes',
            d: 'days',
            day: 'days',
            days: 'days',
            h: 'hours',
            hr: 'hours',
            hour: 'hours',
            hours: 'hours'
        };
        return aliases[normalized] || 'seconds';
    }

    getTimeDivisorForUnit(unit) {
        if (unit === 'minutes') return 60;
        if (unit === 'hours') return 3600;
        if (unit === 'days') return 86400;
        return 1;
    }

    getTimeAxisLabel(unit) {
        return `Time [${unit}]`;
    }
    
    formatTimeValue(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return value;
        return Number.parseFloat(numeric.toPrecision(2));
    }

    xvalueunitChanged(newVal, oldVal) {
        const normalizedNew = this.normalizeTimeUnit(newVal);
        const normalizedOld = this.normalizeTimeUnit(oldVal);
        this.xvalueunit = normalizedNew;

        if (this.usesAutoXLabel) {
            this.labelxaxis = this.getTimeAxisLabel(normalizedNew);
            if (this.chart?.options?.scales?.x?.title) {
                this.chart.options.scales.x.title.text = this.labelxaxis;
            }
        }

        if (!this.hasExplicitTimeDenom) {
            const oldDivisor = this.getTimeDivisorForUnit(normalizedOld);
            const newDivisor = this.getTimeDivisorForUnit(normalizedNew);
            this.timedenom = newDivisor;
            this.timeoperation = x => this.formatTimeValue(x / newDivisor);

            if (this.chart?.data?.labels && oldDivisor !== newDivisor) {
                this.chart.data.labels = this.chart.data.labels.map(value => {
                    const seconds = Number(value) * oldDivisor;
                    return this.formatTimeValue(seconds / newDivisor);
                });
            }
        }

        if (this.chart) this.chart.update();
    }

    attached() {
        let labels, data0, data1, data2, data10, data11, data12;

        if (this.demodata) {
            const rawSeconds = mydata.slice(1).map(row => this.timeoperation(row[0]));
            labels = rawSeconds;
            data0 = mydata.slice(1).map(row => row[1]);
            data1 = mydata.slice(1).map(row => row[2]);
            data2 = mydata.slice(1).map(row => row[3]);
            data10 = mydata.slice(1).map(row => row[4]);
            data11 = mydata.slice(1).map(row => row[5]);
            data12 = mydata.slice(1).map(row => row[6]);
        } else {
            labels = []; data0 = []; data1 = []; data2 = [];
            data10 = []; data11 = []; data12 = [];
        }

        const pluginsConfig = this.buildBasePluginsConfig();

        if (this.levelv && this.levelv.length > 0) {
            const annotations = {};
            if (this.levelv[0]) {
                annotations.line1 = {
                    type: 'line',
                    yMin: parseFloat(this.levelv[0]),
                    yMax: parseFloat(this.levelv[0]),
                    borderColor: 'rgba(99, 154, 255, 1)',
                    borderWidth: 1,
                    borderDash: [6, 6],
                    label: { content: this.levell[0] || 'Level 1', display: true, position: 'start', backgroundColor: 'rgba(0,0,0,0.4)' }
                };
            }
            if (this.levelv.length >= 2 && this.levelv[1]) {
                annotations.line2 = {
                    type: 'line',
                    yMin: parseFloat(this.levelv[1]),
                    yMax: parseFloat(this.levelv[1]),
                    borderColor: 'rgba(255, 99, 99, 1)',
                    borderWidth: 1,
                    borderDash: [6, 6],
                    label: { content: this.levell[1] || 'Level 2', display: true, position: 'end', backgroundColor: 'rgba(0,0,0,0.4)' }
                };
            }
            if (Object.keys(annotations).length > 0) {
                pluginsConfig.annotation = { annotations };
            }
        }

        const ctx = this.mychart.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'patient',  backgroundColor: 'rgb(255, 99, 132)',       borderColor: 'rgb(255, 99, 132)',       data: data10, pointRadius: 1 },
                    { label: '',         backgroundColor: 'rgba(255, 99, 132, 0.2)', borderColor: 'transparent', fill: 0,   data: data11, pointRadius: 0 },
                    { label: '',         backgroundColor: 'rgba(255, 99, 132, 0.2)', borderColor: 'transparent', fill: 0,   data: data12, pointRadius: 0 },
                    { label: 'normal',   backgroundColor: 'rgba(99, 102, 255, 1)',   borderColor: 'rgb(99, 102, 255)',       data: data0,  pointRadius: 1 },
                    { label: '',         backgroundColor: 'rgba(99, 102, 255, 0.2)', borderColor: 'transparent', fill: 3,   data: data1,  pointRadius: 0 },
                    { label: '',         backgroundColor: 'rgba(99, 102, 255, 0.2)', borderColor: 'transparent', fill: 3,   data: data2,  pointRadius: 0 },
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                animation: false,
                animations: { colors: false, x: false },
                transitions: { active: { animation: { duration: 0 } } },
                scales: {
                    x: { title: { display: true, text: this.labelxaxis } },
                    y: { title: { display: true, text: this.labelyaxis } }
                },
                plugins: pluginsConfig
            }
        });

        this.subscribeToFmiEvents();
    }

    therapLevelChanged(newVal) {
        if (this.chart && this.chart.options.plugins && this.chart.options.plugins.annotation) {
            this.chart.options.plugins.annotation.annotations.line1.yMin = newVal;
            this.chart.options.plugins.annotation.annotations.line1.yMax = newVal;
            this.chart.update();
        }
    }

    toxicLevelChanged(newVal) {
        if (this.chart && this.chart.options.plugins && this.chart.options.plugins.annotation) {
            this.chart.options.plugins.annotation.annotations.line2.yMin = newVal;
            this.chart.options.plugins.annotation.annotations.line2.yMax = newVal;
            this.chart.update();
        }
    }
}
