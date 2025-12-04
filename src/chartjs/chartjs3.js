import { Chart, registerables } from "chart.js/auto";
import 'chartjs-adapter-date-fns';
//import annotationPlugin from 'chartjs-plugin-annotation';
import { bindable, customElement, resolve, IEventAggregator } from "aurelia";
import { Chartjs3Base } from "./chartjs3-base";
import mydata from './mydata.json';

//Chart.register(...registerables);
@customElement('dbs-chartjs3')
export class Chartjs3 extends Chartjs3Base {
    @bindable therapLevel = 0.005;
    @bindable toxicLevel = 0.012;
    @bindable demodata = false;
    @bindable labels = "patient, , ,population norm, , ";
    @bindable labelxaxis = "Time [seconds]";
    @bindable labelyaxis = "";
    @bindable levellabels = "therapeutic,toxic";
    @bindable levelvalues = "0.005,0.012";
    @bindable fromid;
    @bindable labels;
    @bindable refindex;// starting  index - if more indices, separate by comma, if range use format start-end
    //@bindable refvalues; //number of values from refindex - only if one refindex is   defined
    @bindable convertors;
    @bindable timedenom; //coeficient which will be denominated from time (e.g. 60 => time/60 in minutes 3600 => time/3600 in hours)
    @bindable timedenomfixed = 1;
    @bindable maxdata = 1024;

    labelsRaw = []
    refindices; // array of indices if multiple indices are defined in refindex separated by comma

    constructor() {
        super();
        this.ea = resolve(IEventAggregator);
    }
    bound() {
        super.bound();
        if (typeof this.maxdata === "string") this.maxdata = parseInt(this.maxdata, 10);
        if (typeof this.therapLevel === "string") this.therapLevel = parseFloat(this.therapLevel);
        if (typeof this.toxicLevel === "string") this.toxicLevel = parseFloat(this.toxicLevel);
        if (typeof this.demodata === "string") this.demodata = this.demodata === "true";
        if (typeof this.labels === "string") this.labelsRaw = this.labels.split(",");
        this.levell = this.levellabels.split(',');
        this.levelv = this.levelvalues.split(',');

        if (typeof this.refindex == 'string') {
            //indides are comma separated
            if (this.refindex.indexOf(',') > 0) { this.refindices = this.refindex.split(',') }
            //indices are range start-end
            else if (this.refindex.indexOf('-') > 0) {
                let parts = this.refindex.split('-');
                this.refindex = parseInt(parts[0], 10);
                let endindex = parseInt(parts[1], 10);
                this.refvalues = endindex - this.refindex + 1;
                this.refendindex = endindex + 1;
            } else {
                this.refindex = parseInt(this.refindex, 10);
                this.refvalues = 1;
                this.refendindex = this.refindex + 1;
            }
        } else {
            //this.refindex = 0;
            this.refvalues = 1;
            this.refendindex = this.refindex + 1;
        }
        if (this.convertors) {
            let convertvalues = this.convertors.split(';');
            let identity = x => x;
            this.operation = [];
            for (let i = 0; i < convertvalues.length; i++) {
                if (convertvalues[i].includes(',')) {
                    //convert values are in form numerator,denominator contains comma ','
                    let convertitems = convertvalues[i].split(',');
                    if (convertitems[0] === '1' && convertitems[1] === '1') this.operation.push(identity);
                    else {
                        const numerator = parseFloat(convertitems[0]);
                        const denominator = parseFloat(convertitems[1]);
                        const addend = (convertitems.length > 2) ? parseFloat(convertitems[2]) : 0;
                        /*console.log('adding operation numerator',numerator);
                        console.log('adding operation denominator',denominator);
                        console.log('adding operation addend',addend);*/
                        this.operation.push(x => ((x * numerator / denominator) + addend));
                    }
                } else {
                    //convert values are in form of expression, do not contain comma
                    if (convertvalues === '1/x') this.operation.push(x => 1 / x);

                    else {
                        // for eval() security filter only allowed characters:
                        // algebraic, digits, e, dot, modulo, parenthesis and 'x' and 'e' is allowed
                        let expression = convertvalues[i].replace(/[^-\d/*+.()%xe]/g, '');
                        console.log('chartjs bind(), evaluating expression:' + convertvalues[i] + ' securely filtered to :' + expression);
                        // eslint-disable-next-line no-eval
                        this.operation.push(x => eval(expression));
                    }
                }
            }
        }
        if (typeof this.timedenomfixed === 'string') this.timedenomfixed = parseInt(this.timedenomfixed, 10);
        if (typeof this.timedenom === 'string') {

            this.timedenom = parseFloat(this.timedenom, 10);
            this.timeoperation = x => { return (x / this.timedenom).toFixed(this.timedenomfixed) }; //time operation is denomination 
        } else {
            this.timeoperation = x => { return x }; //time operation is identity - no operation on number is performed
        }
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

        // Build plugins configuration dynamically based on levelv and levell arrays
        const pluginsConfig = {
            legend: {
                labels: {
                    boxWidth: 8,
                    padding: 0,
                    font: { size: 8 }
                }
            }
        };

        // Add annotation plugin only if there are levels defined
        if (this.levelv && this.levelv.length > 0) {
            const annotations = {};
            
            // Add line1 if first level exists
            if (this.levelv.length >= 1 && this.levelv[0]) {
                annotations.line1 = {
                    type: 'line',
                    yMin: parseFloat(this.levelv[0]),
                    yMax: parseFloat(this.levelv[0]),
                    borderColor: 'rgba(255, 99, 99, 1)',
                    borderWidth: 1,
                    borderDash: [6, 6],
                    label: {
                        content: this.levell[0] || 'Level 1',
                        display: true,
                        position: 'start',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                    }
                };
            }
            
            // Add line2 if second level exists
            if (this.levelv.length >= 2 && this.levelv[1]) {
                annotations.line2 = {
                    type: 'line',
                    yMin: parseFloat(this.levelv[1]),
                    yMax: parseFloat(this.levelv[1]),
                    borderColor: 'rgba(99, 154, 255, 1)',
                    borderWidth: 1,
                    borderDash: [6, 6],
                    label: {
                        content: this.levell[1] || 'Level 2',
                        display: true,
                        position: 'end',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                    }
                };
            }
            
            // Only add annotation plugin if we have annotations
            if (Object.keys(annotations).length > 0) {
                pluginsConfig.annotation = {
                    annotations: annotations
                };
            }
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
                        title: {
                            display: true,
                            text: this.labelxaxis
                        },
                        //min: 0,  // optional: start scale at 0 milliseconds
                        // max will auto-adjust
                    },
                    y: {
                        title: {
                            display: true,
                            text: this.labelyaxis
                        }
                    }
                },
                plugins: pluginsConfig
            }
        });
        //console.log('data', data0);
        this.ea.subscribe(`fmidata:${this.fromid}`, msg => { this.handleValueChange(msg); });
        this.ea.subscribe(`fmireset:${this.fromid}`, msg => { });
        this.ea.subscribe(`fmistart:${this.fromid}`, msg => {
            if (this.chart) {
                console.log('chartjs fmistart()');
                if (this.chart.options.tooltips) this.chart.options.tooltips.enabled = false;  // disable tooltips
                this.chart.options.hover.mode = null;               // disable hover interaction
                this.chart.options.hover.animationDuration = 0;     // disable hover animations    
                // Disable interaction events on the canvas
                this.chart.canvas.style.pointerEvents = 'none';
                this.chart.update(0);                          // immediate update to apply change
            }
        });
        this.ea.subscribe(`fmistop:${this.fromid}`, msg => {
            if (this.chart) {
                console.log('chartjs fmistop()');
                if (this.chart.options.tooltips) this.chart.options.tooltips.enabled = true;   // re-enable tooltips
                this.chart.options.hover.mode = 'nearest';           // restore hover mode
                //    this.chart.options.hover.animationDuration = 400;    // restore animation duration default    
                this.chart.canvas.style.pointerEvents = 'auto'; // re-enable interactions

                this.chart.update(0);                          // immediate update to apply change
            }
        });
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
    handleValueChange(e) {

        //e.detail do not reallocate - using same buffer, thus slicing to append to data array
        //let datapoints =e.detail.data.slice(this.refindex, this.refendindex);
        let j = 0;

        function handleIndex(i) {
            {
                //adds data to datasets
                //console.log('chartjs handleValueChange() adding data index, message', i, e);
                //console.log('chartjs handleValueChange() current dataset data', this.chart.data.datasets[j].data);
                //if convert operation is defined as array then convert
                if (this.operation && this.operation[j]) {
                    //console.log('chartjs handleValueChange() applying convertor to data:', e);
                    //console.log('chartjs handleValueChange() applying convertor to data:', e.data[i]);
                    this.chart.data.datasets[j].data.push(this.operation[j](e.data[i]));
                } else {
                    //console.log('chartjs handleValueChange() applying data directly:', e);
                    //console.log('chartjs handleValueChange() applying data directly:', e.data[i]);
                    //else push data directly
                    this.chart.data.datasets[j].data.push(e.data[i]);
                }
                if (this.chart.data.datasets[j].data.length > this.maxdata) {
                    //console.log('shifting dataset chartjs-time', this.chart.data.datasets[j].data);
                    this.chart.data.datasets[j].data.shift();
                }
                j++;
            }
        }

        if (this.refindices) for (let i of this.refindices) handleIndex.call(this, i);
        else for (let i = this.refindex; i < this.refindex + this.refvalues; i++) handleIndex.call(this, i);
        this.chart.data.labels.push(this.timeoperation(e.time));
        if (this.chart.data.labels.length > this.maxdata) {
            this.chart.data.labels.shift();
            if (this.sectionid) {
                //shift sections
                if (this.chart.config.options.section[0].index === 0) this.chart.config.options.section.shift();
                //decrement all indices in sections
                for (let i = 0; i < this.chart.config.options.section.length; i++) this.chart.config.options.section[i].index -= 1;
            }
        }
        //shift - remove first element if data is too big
        //console.log('chartjs handlevaluechange() chart.data.datasets[0].data', this.chart.data.datasets[0].data);
        this.updatechart();
    };

    updatechart() {
        if (this.chart.tooltip) {
            this.chart.tooltip._active = [];
            this.chart.active = [];
        }
        this.chart.update(0);
    }

}