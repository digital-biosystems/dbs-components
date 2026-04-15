import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

export class Chartjs3Base {
    bound() {
        Chart.register(
            annotationPlugin,
            ...registerables
        );
    }
}