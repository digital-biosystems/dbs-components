---
title: ChartJS 4
layout: home
nav_order: 3
---

# `<dbs-chartjs4>` Web Component

The `<dbs-chartjs4>` web component displays a chart from data in dataset. It uses [ChartJS 4.5.1](https://www.chartjs.org/docs/4.5.1/) library to render various charts. 

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.

Various types are allowed as implemented by the ChartJS 4.5.1 library via 'type' attribute:
`bar`,`bubble`,`doughnut`,`pie`,`line`,`polarArea`,`radar`,`scatter`. See the types below.

## Demo

### Default line chart

`<dbs-chartjs4></dbs-chartjs4>`
<dbs-chartjs4></dbs-chartjs4>

### bar chart

`<dbs-chartjs4 type="bar"></dbs-chartjs4>`
<dbs-chartjs4 type="bar"></dbs-chartjs4>

### bubble chart
`<dbs-chartjs4 type="bubble"></dbs-chartjs4>`
<dbs-chartjs4 type="bubble"></dbs-chartjs4>

### doughnut chart

`<dbs-chartjs4 type="doughnut"></dbs-chartjs4>`
<dbs-chartjs4 type="doughnut"></dbs-chartjs4>

### pie chart

`<dbs-chartjs4 type="pie"></dbs-chartjs4>`
<dbs-chartjs4 type="pie"></dbs-chartjs4>

### polarArea chart

`<dbs-chartjs4 type="polarArea"></dbs-chartjs4>`
<dbs-chartjs4 type="polarArea"></dbs-chartjs4>

### radar chart

`<dbs-chartjs4 type="radar"></dbs-chartjs4>`
<dbs-chartjs4 type="radar"></dbs-chartjs4>

### scatter chart

`<dbs-chartjs4 type="scatter"></dbs-chartjs4>`
<dbs-chartjs4 type="scatter"></dbs-chartjs4>


## Usage

Include the component in your HTML file:

```html
<script src="path/to/dbs-chartjs.js"></script>
```

Place the custom element

```html
<dbs-chartjs4><dbs-chartjs4>
```

## Attributes

| Attribute | Description                | Type   | Default         |
|-----------|----------------------------|--------|-----------------|
| `type` | The type of chart. Can be `bar`,`bubble`,`doughnut`,`pie`,`line`,`polarArea`,`radar`,`scatter`    | String | "line" |

