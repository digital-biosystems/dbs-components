import { Chart } from "chart.js/auto";
import { customElement, bindable, observable } from 'aurelia';
import { geoOrthographic, topojson, ChoroplethController, GeoFeature, ProjectionScale, ColorScale } from "chartjs-chart-geo";
import { whereAlpha2 } from 'iso-3166-1';
import { Chartjs3Base } from "../chartjs/chartjs3-base.js";
import countriesData from './countries-50m.json';
import mydata from './mydata.json';

//import '../w3.css';
//import '../w3-theme-teal.css';

const removeFirstHash = str => str.startsWith('#') ? str.slice(1) : str;

@customElement('dbs-chartjs-geo')
export class ChartjsGeo extends Chartjs3Base {
    @bindable datasrc = '';
    @bindable countriessrc = '';
    @bindable continent = ''; //initial continent to show
    //@bindable selected = {};
    geochart;
    countryDataDesc = {};
    projecturls = [];
    projections = ['azimuthalEqualArea',
        'azimuthalEquidistant',
        'gnomonic',
        'orthographic',
        'stereographic',
        'equalEarth',
        'albers',
        'albersUsa',
        'conicConformal',
        'conicEqualArea',
        'conicEquidistant',
        'equirectangular',
        'mercator',
        'transverseMercator',
        'naturalEarth'];
    @observable countryName='';

        parseCSV(str) {
            const arr = [];
            let quote = false;  // 'true' means we're inside a quoted field
        
            // Iterate over each character, keep track of current row and column (of the returned array)
            for (let row = 0, col = 0, c = 0; c < str.length; c++) {
                let cc = str[c], nc = str[c+1];        // Current character, next character
                arr[row] = arr[row] || [];             // Create a new row if necessary
                arr[row][col] = arr[row][col] || '';   // Create a new column (start with empty string) if necessary
        
                // If the current character is a quotation mark, and we're inside a
                // quoted field, and the next character is also a quotation mark,
                // add a quotation mark to the current column and skip the next character
                if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        
                // If it's just one quotation mark, begin/end quoted field
                if (cc == '"') { quote = !quote; continue; }
        
                // If it's a comma and we're not in a quoted field, move on to the next column
                if (cc == ',' && !quote) { ++col; continue; }
        
                // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
                // and move on to the next row and move to column 0 of that new row
                if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        
                // If it's a newline (LF or CR) and we're not in a quoted field,
                // move on to the next row and move to column 0 of that new row
                if (cc == '\n' && !quote) { ++row; col = 0; continue; }
                if (cc == '\r' && !quote) { ++row; col = 0; continue; }
        
                // Otherwise, append the current character to the current column
                arr[row][col] += cc;
            }
            //console.log('parseCSV arr:',arr)
            return arr;
        }
    
    showSelected(selectedid){
        if (this.countryDataDesc) {
            this.selected = this.countryDataDesc[selectedid];
            //console.log('showselected',selectedid, this.selected)
            if (this.selected) {
              this.countryName = this.selected[0];
              this.projectName = this.selected[3];
              this.projectPublication = this.selected[2];
              this.projectStatus = this.selected[8];
              this.projectStatusText = this.selected[7];
              if (this.selected[4]) {
                this.projecturls = this.selected[4].split(' / ');
              } else this.projecturls = []
              //console.log('countryName',this.countryName)            
            } else 
            console.warn('showselected this.selected is null')
            
        } else {
            console.warn('showselected countryDataDesc is null');
        }
//        console.log(this.selected)
    }

    bound(){
        Chart.register(
            ChoroplethController,
            GeoFeature,
            ProjectionScale,
            ColorScale,
        );
        super.bound();
        // Get location of data src from url hash
        this.paramshash = window.location.hash
        this.params = this.paramshash.split('&');
        console.log('bound() params',this.params)
        if (this.params.length>0) {
            const lastindex= this.params.length;
            if (lastindex>0) {
                const newsrc = removeFirstHash(this.params[0]); 
                //assign only if non-empty
                if (newsrc) this.datasrc=newsrc;
            }
            if (lastindex>1) {
                this.continent=this.params[1];
            }
            console.log('hash contains url:'+this.datasrc);
        }
    }

    attached() {
        console.log('attached')

/*this.task = PLATFORM.taskQueue.queueTask(() => {
    // Task to be executed after the delay
    console.log('task delayed 100ms');
  }, { delay: 100 });
  */

        //Chart.register(ChoroplethController, GeoFeature, ProjectionScale, ColorScale, ...registerables);
        if (this.datasrc && this.countriessrc) {
            console.log('fetching data from',this.datasrc,this.countriessrc);
            Promise.all([
            fetch(this.countriessrc).then((res) => res.json()),
            fetch(this.datasrc).then((res) => res.text()), // Fetch the CSV file
        ]).then(([topoData, csvData]) => {
            this.doTopoData(topoData,csvData)
        });
        } else {
            console.log('using built-in data');
            this.doTopoData(countriesData,mydata);
        }
        
    }

    doTopoData(topoData,parsedCSV) {
        console.log('doTopoData');
            let that = this;
            this.countries = topojson.feature(topoData, topoData.objects.countries).features;
            // Parse the CSV
            //const parsedCSV = this.parseCSV(csvData);
            // Create a lookup for ISO country codes to project status (number)
            let countryDataMap = {}
            this.countryDataDesc = {}
            for (let row of parsedCSV) {
                try {
                let countryid = whereAlpha2(row[1]);
                if (countryid) {
                    countryDataMap[countryid.numeric]=row[8];
                    this.countryDataDesc[countryid.numeric]=row;
                }
                } catch (exc) {
                    console.warn(exc);
                }
            }
            this.myData = []
            for (let country of this.countries) {
                //let isocountry = whereNumeric(country.id)
                let myValue = 0;
                //if (isocountry) {
                  //let isocountryalpha2 = isocountry.alpha2
                  //let countryvalue = countryDataMap[isocountryalpha2]
                  //myValue = parseFloat(countryvalue);
                //} else {
                    //console.warn('cannot find alpha code for country with id'+ country.id+ ' name:' + country.properties.name);
                //}
                let rawValue = countryDataMap[country.id];
                if (rawValue) {
                    myValue = parseFloat(rawValue)
                } else console.warn('no data for country with id'+ country.id+ ' name:' + country.properties.name);
                this.myData.push({
                    feature: country,
                    value: myValue
                })
            }
            this.worlddata = this.myData;
            this.worldcountries = this.countries;
            //console.log('countries',countries);
            console.log('geoOrthographic function:',geoOrthographic);
            
            this.chart = new Chart(this.geochart.getContext("2d"), {
                type: 'choropleth',
                data: {
                    labels: this.countries.map((d) => d.id +':'+d.properties.name),
                    datasets: [{
                        label: 'Countries',
                        //data: countries.map((d) => ({ feature: d, value: Math.random() })),
                        data:this.myData,
                        outline: this.countries
                    }]
                },
                options: {
                    showOutline: false,
                    showGraticule: true,
                    plugins: {
                        legend: {
                            display: false
                        },

                    },
                    scales: {
                        projection: {
                                  axis:'x',                                  
                                  projection: 'equalEarth', 
                                  //projection: geoOrthographic().rotate([0,0,0]) //'equalEarth', 
                        },
                        color: {
                            axis: 'x',
                            interpolate: 'oranges',
                            legend: {
                                position: 'bottom-right',
                                align: 'right',
                            }
                        }
                    },
                    onClick: (evt, elems) => {
                        let myitem = elems.map((elem) => elem.element.feature.id)
                        //console.log('selected item + this + that', myitem,this,that);
                        that.showSelected(myitem[0])
                    },
                }
            });
            if (this.continent) {
                console.log('switching to continent',this.continent)
                switch (this.continent) {
                    case 'europe':
                      this.switchToEurope();
                      break;
                    case 'asia':
                      this.switchToAsia();
                      break;
                    case 'namerica':
                      this.switchToNAmerica();
                      break;
                    case 'africa':
                      this.switchToAfrica();
                      break;
                    case 'samerica':
                      this.switchToSAmerica();
                      break;
                    case 'australia':
                      this.switchToAustralia();
                      break;
                    default:
                      console.warn('Unknown continent:', this.continent);
                      this.switchToWorld();
                      break;
                  }
                  
            }

    }

    detached(){
          // Cancel the task if needed
  //this.task.cancel();

    }
    switchToEurope() {
        //this.zoomChart(this.chart,[10,50],800)
        //projectionScale: 3,
        //          projectionOffset: [0, 750]
        //console.log('switch chart:',this.chart)        
        if (this.currentProjection == 'orthographic') {
            this.chart.scales.projection.projection.rotate([0,0,0])
        }         
        let scale = 4
        this.chart.options.scales.projection.projectionScale = scale;
        let yy = scale * (3/8 * this.chart.chartArea.height );
        this.chart.options.scales.projection.projectionOffset = [0,yy];
        this.chart.update();
    }

    switchToWorld() {
        //this.zoomChart(this.chart,[10,50],800)
        //projectionScale: 3,
        //          projectionOffset: [0, 750]
        if (this.currentProjection == 'orthographic') {
            this.chart.scales.projection.projection.rotate([0,0,0])
        }
        this.chart.options.scales.projection.projectionScale = 1;
        this.chart.options.scales.projection.projectionOffset = [0,0];
        this.chart.update();
    }
    switchToAsia() {
        //this.zoomChart(this.chart,[10,50],800)
        //projectionScale: 3,
        //          projectionOffset: [0, 750]
        if (this.currentProjection == 'orthographic') {
            let scale = 1
            this.chart.options.scales.projection.projectionScale = scale;
            this.chart.options.scales.projection.projectionOffset = [0,0];
            this.chart.scales.projection.projection.rotate([-80,0,0])
        } else {
        let scale = 2.3
        let xx = - scale * (2/8 * this.chart.chartArea.width);
        let yy = scale * (3/16 * this.chart.chartArea.height );
        this.chart.options.scales.projection.projectionScale = scale;
        this.chart.options.scales.projection.projectionOffset = [xx,yy];
        //this.chart.options.scales.projection.left = 1400;
        //this.chart.options.scales.projection.bottom =250;
        }
        this.chart.update();
    }
    switchToNAmerica() {
        //this.zoomChart(this.chart,[10,50],800)
        //projectionScale: 3,
        //          projectionOffset: [0, 750]
        if (this.currentProjection == 'orthographic') {
            let scale = 1
            this.chart.options.scales.projection.projectionScale = scale;
            this.chart.options.scales.projection.projectionOffset = [0,0];
            this.chart.scales.projection.projection.rotate([90,0,0])
        } else {
        let scale = 2.5;
        let xx = scale * (2/8 * this.chart.chartArea.width);
        let yy = scale * (2/8 * this.chart.chartArea.height );
        this.chart.options.scales.projection.projectionScale = scale;
        this.chart.options.scales.projection.projectionOffset = [xx,yy];
        }
        this.chart.update();
    }
    switchToSAmerica() {
        //this.zoomChart(this.chart,[10,50],800)
        //projectionScale: 3,
        //          projectionOffset: [0, 750]
        if (this.currentProjection == 'orthographic') {
            let scale = 1
            this.chart.options.scales.projection.projectionScale = scale;
            this.chart.options.scales.projection.projectionOffset = [0,0];
            this.chart.scales.projection.projection.rotate([60,0,0])
        } else {
        let scale = 2;
        let xx = scale * (1/8 * this.chart.chartArea.width);
        let yy = -scale * (5/32 * this.chart.chartArea.height );
        this.chart.options.scales.projection.projectionScale = scale;
        this.chart.options.scales.projection.projectionOffset = [xx,yy];
        }
        this.chart.update();
    }
    switchToAfrica() {
        //this.zoomChart(this.chart,[10,50],800)
        //projectionScale: 3,
        //          projectionOffset: [0, 750]
        if (this.currentProjection == 'orthographic') {
            let scale = 1
            this.chart.options.scales.projection.projectionScale = scale;
            this.chart.options.scales.projection.projectionOffset = [0,0];
            this.chart.scales.projection.projection.rotate([0,0,0])
        } else {
        this.chart.options.scales.projection.projectionScale = 1.8;
        this.chart.options.scales.projection.projectionOffset = [0,0];
        }
        this.chart.update();
    }
    switchToPacific() {
        //this.zoomChart(this.chart,[10,50],800)
        //projectionScale: 3,
        //          projectionOffset: [0, 750]
        if (this.currentProjection == 'orthographic') {
            let scale = 1
            this.chart.options.scales.projection.projectionScale = scale;
            this.chart.options.scales.projection.projectionOffset = [0,0];
            this.chart.scales.projection.projection.rotate([-160,0,0])
        } else {
        let scale = 2;
        let xx = -scale * (5/16 * this.chart.chartArea.width);
        let yy = -scale * (1/8 * this.chart.chartArea.height );

        this.chart.options.scales.projection.projectionScale = scale;
        this.chart.options.scales.projection.projectionOffset = [xx,yy];
        }
        this.chart.update();
    }



    zoomChart(chart, center, scale) {
        // Access the projection configuration
        console.log('zoomChart:',chart)
        chart.options.scales.xy.projection.center = center; // Update center [longitude, latitude]
        chart.options.scales.xy.projection.scale = scale;   // Update zoom scale
      
        // Apply the changes
        chart.update();
      }
      switchToEurope2() {
        //filter data and countries
        this.eucountryids = this.europeanCountryCodes.map( (code) => {
            console.log('mapping '+code+' to numeric');
            let a = whereAlpha2(code)
            console.log('numeric',a);
            if (a) return a.numeric;
            else return null;
        })
        this.eudata = this.worlddata.filter(item => this.eucountryids.includes(item.feature.id));
        this.eucountries = this.worldcountries.filter(country => this.eucountryids.includes(country.id));
        console.log('switching to EU view',this.eudata,this.eucountries)
        console.log('debug world data',this.worlddata,this.worldcountries)
        //switch chart
        // Update the chart's data
        this.chart.data.labels = this.eucountries.map(country => country.properties.name);
        this.chart.data.datasets[0].data = this.eudata;
        this.chart.data.outline = this.eucountries;

        // Re-render the chart
        this.chart.update();
    }
    switchToworld2() {
        //filter data and countries
        //this.eudata = this.worlddata.filter(item => this.europeanCountryCodes.includes(item.country.id));
        //this.eucountries = this.worldcountries.filter(country => this.europeanCountryCodes.includes(country.id));
        //switch chart
        // Update the chart's data
        this.chart.data.labels = this.worldcountries.map(country => country.properties.name);
        this.chart.data.datasets[0].data = this.worlddata;
        this.chart.data.outline = this.worldcountries;

        // Re-render the chart
        this.chart.update();
    }
    switchProjection(p) {
        console.log('switching projection:',p)
        this.currentProjection = p;
        if (p == 'orthographic') {
            this.chart.options.scales.projection.projection = geoOrthographic().rotate([0,0,0])
        } else 
            this.chart.options.scales.projection.projection = p ;
        //this.chart.scales.projection.projection.scales
        this.chart.update();
    }
    resetView(){
        this.switchProjection('equalEarth');this.switchToWorld()
    }

    isAnimating = false;
    toggleAnimation() {
        if (this.currentProjection == 'orthographic') {

        
        if (this.isAnimating) {
          // Stop the animation
          cancelAnimationFrame(this.animationFrameId);
          this.isAnimating = false;
          console.log('Animation stopped.');
        } else {
          // Start the animation
          this.isAnimating = true;
          console.log('Animation started.');
          this.performAnimationFrame();
        }
    }
      }
      
    performAnimationFrame() {
        if (!this.isAnimating) return; // Ensure animation stops when the flag is false
      
        // Call your animation logic here
        this.animate();
      
        // Request the next frame
        this.animationFrameId = requestAnimationFrame(this.performAnimationFrame.bind(this));
      }
      
    animate() {
        // Your animation logic
        //console.log('Animating frame at', performance.now());
        let t = performance.now() / 1000;
        this.chart.scales.projection.projection.rotate([t,0,0])
        this.chart.update()
      }    
}