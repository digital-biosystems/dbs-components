---
title: ChartJS 4
layout: home
nav_order: 3
---

# `<dbs-chartjs4>` Web Component

The `<dbs-chartjs4>` web component displays a chart from data in dataset. It uses [ChartJS 4.5.1](https://www.chartjs.org/docs/4.5.1/) library to render various charts. It can listen fmidata channel to draw data from external simulation (fmi component)

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.

Various types are allowed as implemented by the ChartJS 4.5.1 library via 'type' attribute:
`bar`,`bubble`,`doughnut`,`pie`,`line`,`polarArea`,`radar`,`scatter`. See the types below.

## Demo

### Default line chart

`<dbs-chartjs4 demodata="true"></dbs-chartjs4>`
<dbs-chartjs4 demodata="true"></dbs-chartjs4>

### bar chart

`<dbs-chartjs4 type="bar" demodata="true"></dbs-chartjs4>`
<dbs-chartjs4 type="bar" demodata="true"></dbs-chartjs4>

### bubble chart
`<dbs-chartjs4 type="bubble" demodata="true"></dbs-chartjs4>`
<dbs-chartjs4 type="bubble" demodata="true"></dbs-chartjs4>

### doughnut chart

`<dbs-chartjs4 type="doughnut" demodata="true"></dbs-chartjs4>`
<dbs-chartjs4 type="doughnut" demodata="true"></dbs-chartjs4>

### pie chart

`<dbs-chartjs4 type="pie" demodata="true"></dbs-chartjs4>`
<dbs-chartjs4 type="pie" demodata="true"></dbs-chartjs4>

### polarArea chart

`<dbs-chartjs4 type="polarArea" demodata="true"></dbs-chartjs4>`
<dbs-chartjs4 type="polarArea" demodata="true"></dbs-chartjs4>

### radar chart

`<dbs-chartjs4 type="radar" demodata="true"></dbs-chartjs4>`
<dbs-chartjs4 type="radar" demodata="true"></dbs-chartjs4>

### scatter chart

`<dbs-chartjs4 type="scatter" demodata="true"></dbs-chartjs4>`
<dbs-chartjs4 type="scatter" demodata="true"></dbs-chartjs4>

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
| `pointRadius` | radius of data points | number | 0 |
| `fromid` | listen fmi events and data from FMI | String | |
| `refindex` | indices within array in data sent by FMI, can be comma separated `0,3,4` or range `0-5` | String | |
| `demodata` | optional if demodata should be used to show | String | "false" |


