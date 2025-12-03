import { Chart, registerables } from "chart.js/auto";
import 'chartjs-adapter-date-fns';
//import annotationPlugin from 'chartjs-plugin-annotation';
import { bindable, customElement } from "aurelia";
import { Chartjs3Base } from "./chartjs3-base";
import mydata from './mydata.json';

//Chart.register(...registerables);
@customElement('dbs-chartjs3')
export class Chartjs3 extends Chartjs3Base {
    @bindable therapLevel = 0.005;
    @bindable toxicLevel = 0.012;
    @bindable demodata = true;
    @bindable labels = "patient, , ,population norm, , ";
    labelsRaw = []

    constructor() {
        super();
    }
    bound(){
        super.bound();
        if(typeof this.therapLevel === "string") this.therapLevel=parseFloat(this.therapLevel);
        if(typeof this.toxicLevel === "string") this.toxicLevel=parseFloat(this.toxicLevel);
        if(typeof this.demodata === "string") this.demodata = this.demodata === "true";
        if(typeof this.labels === "string") this.labelsRaw = this.labels.split(",");
    }

    attached() {
        console.log('chartjs attached');
        
        // Prepare labels and data based on demodata flag
        let labels, data0, data1, data2, data10, data11, data12;
        
        if (this.demodata) {
            // Extract labels (time column), skipping header
            const rawSeconds = mydata.slice(1).map(row => row[0] * 1000); // convert to milliseconds
            labels = rawSeconds;//.map(s => new Date(1970, 0, 1, 0, 0, s)); // convert to Date objects

            // Extract data for each dataset from columns 1, 2, and 3 (skip header)
            data0 = mydata.slice(1).map(row => row[1]);
            data1 = mydata.slice(1).map(row => row[2]);
            data2 = mydata.slice(1).map(row => row[3]);
            data10 = mydata.slice(1).map(row => row[4]);
            data11 = mydata.slice(1).map(row => row[5]);
            data12 = mydata.slice(1).map(row => row[6]);
        } else {
            // No demo data - empty arrays
            labels = [];
            data0 = [];
            data1 = [];
            data2 = [];
            data10 = [];
            data11 = [];
            data12 = [];
        }

        const ctx = this.mychart.getContext('2d');
        //Chart.register(annotationPlugin, ...registerables);
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'patient',
                    backgroundColor: 'rgb(255, 99, 132)',
                    borderColor: 'rgb(255, 99, 132)',
                    data: data10,
                    pointRadius: 1,
                    //pointHoverRadius: 1,
                }, {
                    label: '',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: "transparent",
                    fill: 0,
                    data: data11,
                    pointRadius: 0,
                    //pointHoverRadius: 0,
                }, {
                    label: '',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: "transparent",
                    fill: 0,
                    data: data12,
                    pointRadius: 0,
                    //pointHoverRadius: 0,
                }, {
                    label: 'normal',
                    backgroundColor: 'rgba(99, 102, 255, 1)',
                    borderColor: 'rgb(99, 102, 255)',
                    data: data0,
                    pointRadius: 1,
                    //pointHoverRadius: 1,
                }, {
                    label: '',
                    backgroundColor: 'rgba(99, 102, 255, 0.2)',
                    borderColor: "transparent",
                    fill: 3,
                    data: data1,
                    pointRadius: 0,
                    //pointHoverRadius: 0,
                }, {
                    label: '',
                    backgroundColor: 'rgba(99, 102, 255, 0.2)',
                    borderColor: "transparent",
                    fill: 3,
                    data: data2,
                    pointRadius: 0,
                    //pointHoverRadius: 0,
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                animation: false,
                animations: { colors: false, x: false },
                transitions: {
                    active: {
                        animation: {
                            duration: 0
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',  // display units as hours on axis
                            tooltipFormat: 'd (HH)',  // format tooltips as hours:minutes
                            displayFormats: {
                                hour: 'd (HH)'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time [days (hours)]'
                        },
                        min: 0,  // optional: start scale at 0 milliseconds
                        // max will auto-adjust
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'predicted drug concentration [g/L]'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            boxWidth: 8,
                            padding: 0,
                            font: { size: 8 }
                        }
                    },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: this.toxicLevel,
                                yMax: this.toxicLevel,                                
                                borderColor: 'rgba(255, 99, 99, 1)',
                                borderWidth: 1,
                                borderDash: [6, 6],
                                label: {
                                    content: 'toxic level',
                                    display: true,
                                    position: 'start',
                                    backgroundColor: 'rgba(0,0,0,0.4)',

                                }
                            },
                            line2: {
                                type: 'line',
                                yMin: this.therapLevel,
                                yMax: this.therapLevel,
                                borderColor: 'rgba(99, 154, 255, 1)',
                                borderWidth: 1,
                                borderDash: [6, 6],
                                label: {
                                    content: 'therapeutic level',
                                    display: true,
                                    position: 'end',
                                    backgroundColor: 'rgba(0,0,0,0.4)',

                                }
                            }
                        }
                    }
                }

            }
        });
        //console.log('data', data0);
    }

    therapLevelChanged(newVal, oldVal) {
        console.log('Value changed');
        if (this.chart && this.chart.options.plugins && this.chart.options.plugins.annotation) {
            this.chart.options.plugins.annotation.annotations.line2.yMin = newVal;
            this.chart.options.plugins.annotation.annotations.line2.yMax = newVal;
            this.chart.update();
        } else {
            console.warn('Chart or annotation line2 not found');
        }
    }

    toxicLevelChanged(newVal, oldVal) {
        console.log('Value changed');
        if (this.chart && this.chart.options.plugins && this.chart.options.plugins.annotation) {
            this.chart.options.plugins.annotation.annotations.line1.yMin = newVal;
            this.chart.options.plugins.annotation.annotations.line1.yMax = newVal;
            this.chart.update();
        } else {
            console.warn('Chart or annotation line1 not found');
        }
    }
}