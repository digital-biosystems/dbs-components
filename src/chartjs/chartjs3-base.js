import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
//import { ChoroplethController, GeoFeature, ProjectionScale, ColorScale } from 'your-geo-package';
import { geoOrthographic, topojson, ChoroplethController, GeoFeature, ProjectionScale, ColorScale } from "chartjs-chart-geo";

export class Chartjs3Base {
    bound() {
        Chart.register(
            ChoroplethController,
            GeoFeature,
            ProjectionScale,
            ColorScale,
            annotationPlugin,
            ...registerables
        );
    }
}