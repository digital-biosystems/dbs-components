import { Chart } from "chart.js/auto";
import 'chartjs-adapter-date-fns';
import { bindable, customElement } from "aurelia";
import { ChartjsTimeBase } from "./chartjs-time-base";
import mydata from './mydata2.json';

@customElement('dbs-chartjs4')
export class Chartjs4 extends ChartjsTimeBase {
    @bindable labelxaxis = "Time [s]";
    @bindable pointRadius = 0;
    @bindable maxdata = 2048;
    @bindable type = "line";
    @bindable timedenom = "3600";

    bound() {
        super.bound();
        if (typeof this.pointRadius === 'string') this.pointRadius = parseInt(this.pointRadius, 10);
    }

    attached() {
        const pluginsConfig = this.buildBasePluginsConfig();

        let times;
        if (this.demodata) {
            times = mydata.slice(1).map(row => this.timeoperation(row[0]));
        } else {
            times = [];
        }

        const mylabels = this.demodata ? mydata[0] : this.labelsRaw;
        const datasets = [];
        for (let i = 1; i < mylabels.length; i++) {
            datasets.push({
                label: mylabels[i],
                data: this.demodata ? mydata.slice(1).map(row => row[i]) : [],
                pointRadius: this.pointRadius
            });
        }

        const chartlabels = ['line', 'bar', 'scatter', 'bubble'].includes(this.type) ? times : mylabels;

        const ctx = this.mychart.getContext('2d');
        this.chart = new Chart(ctx, {
            type: this.type,
            data: { labels: chartlabels, datasets },
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
}
