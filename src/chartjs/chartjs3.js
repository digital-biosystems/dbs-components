import { Chart, registerables } from "chart.js/auto";
import 'chartjs-adapter-date-fns';
import { bindable, customElement } from "aurelia";
import mydata from './mydata.json';

//Chart.register(...registerables);
@customElement('dbs-chartjs3')
export class Chartjs3 {
    constructor() {

    }
    attached() {
        console.log('chartjs attached');
        // Extract labels (time column), skipping header
        const rawSeconds = mydata.slice(1).map(row => row[0] * 1000); // convert to milliseconds
        const labels = rawSeconds;//.map(s => new Date(1970, 0, 1, 0, 0, s)); // convert to Date objects


        // Extract data for each dataset from columns 1, 2, and 3 (skip header)
        const data0 = mydata.slice(1).map(row => row[1]);
        const data1 = mydata.slice(1).map(row => row[2]);
        const data2 = mydata.slice(1).map(row => row[3]);
        const data10 = mydata.slice(1).map(row => row[4]);
        const data11 = mydata.slice(1).map(row => row[5]);
        const data12 = mydata.slice(1).map(row => row[6]);

        const ctx = this.mychart.getContext('2d');
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
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: "transparent",
                    fill: 0,
                    data: data11,
                    pointRadius: 0,
                    //pointHoverRadius: 0,
                }, {
                    label: '',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: "transparent",
                    fill: 0,
                    data: data12,
                    pointRadius: 0,
                    //pointHoverRadius: 0,
                },{
                    label: 'normal',
                    backgroundColor: 'rgba(99, 102, 255, 1)',
                    borderColor: 'rgb(99, 102, 255)',
                    data: data0,
                    pointRadius: 1,
                    //pointHoverRadius: 1,
                }, {
                    label: '',
                    backgroundColor: 'rgba(99, 102, 255, 0.5)',
                    borderColor: "transparent",
                    fill: 3,
                    data: data1,
                    pointRadius: 0,
                    //pointHoverRadius: 0,
                }, {
                    label: '',
                    backgroundColor: 'rgba(99, 102, 255, 0.5)',
                    borderColor: "transparent",
                    fill: 3,
                    data: data2,
                    pointRadius: 0,
                    //pointHoverRadius: 0,
                }]
            },
            options: {
                responsive:true,
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
                }
            }
        });
        //console.log('data', data0);
    }
}