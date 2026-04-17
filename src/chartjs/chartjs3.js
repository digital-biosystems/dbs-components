import { Chart } from "chart.js/auto";
import 'chartjs-adapter-date-fns';
import { bindable, customElement } from "aurelia";
import { ChartjsTimeBase } from "./chartjs-time-base.js";
import mydata from './mydata.json';

@customElement('dbs-chartjs3')
export class Chartjs3 extends ChartjsTimeBase {
    @bindable therapLevel = 0.005;
    @bindable toxicLevel = 0.012;
    @bindable labels = "patient, , ,population norm, , ";
    @bindable labelxaxis = "Time [seconds]";
    @bindable levellabels = "therapeutic,toxic";
    @bindable levelvalues = "0.005,0.012";
    @bindable maxdata = 1024;

    bound() {
        super.bound();
        if (typeof this.therapLevel === 'string') this.therapLevel = parseFloat(this.therapLevel);
        if (typeof this.toxicLevel === 'string') this.toxicLevel = parseFloat(this.toxicLevel);
        this.levell = this.levellabels.split(',');
        this.levelv = this.levelvalues.split(',');
    }

    attached() {
        let labels, data0, data1, data2, data10, data11, data12;

        if (this.demodata) {
            const rawSeconds = mydata.slice(1).map(row => row[0] * 1000);
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
