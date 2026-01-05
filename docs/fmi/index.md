---
title: FMI
layout: home
nav_order: 2
---

# `<dbs-fmi>` Web Component

The `<dbs-fmi>` web component instantiate and execute functional mockup unit exported from modeling environment. Via standardized API calls it can make a simulation step, set values of input variables or parameters and get values of model variables, states.

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.

## Demo
```html
<dbs-fmi id="pgpk"
    showvalues="true"
    mode="oneshot"
    src="../pgx-chart/PKPG_2C_generic.js"
    fminame="PKPG_2C_generic"
    tolerance="1e-9"
    starttime="0"
    stoptime="3600"
    fstepsize="80"
    guid="{25473756-d9b4-4702-ba9c-99538dd6a0e4}"
    valuereferences="1,19,10,28,46,37"
    valuelabels="patient.central.C,patient_low.central.C,patient_high.central.C,ref.central.C,ref_low.central.C,ref_high.central.C"
    inputs="dosage,359,1,1000000,t;dosage,522,1,1000000,t;dosage,441,1,1000000,t;
    period,360,3600,1,t;period,442,3600,1,t;period,523,3600,1,t"
    inputLabels="adminDosage[mg];adminPeriod[h]"
    >
</dbs-fmi>
```

<dbs-fmi id="pgpk"
    showvalues="true"
    mode="oneshot"
    src="../pgx-chart/PKPG_2C_generic.js"
    fminame="PKPG_2C_generic"
    tolerance="1e-9"
    starttime="0"
    stoptime="3600"
    fstepsize="80"
    guid="{25473756-d9b4-4702-ba9c-99538dd6a0e4}"
    valuereferences="1,19,10,28,46,37"
    valuelabels="patient.central.C,patient_low.central.C,patient_high.central.C,ref.central.C,ref_low.central.C,ref_high.central.C"
    inputs="dosage,359,1,1000000,t;dosage,522,1,1000000,t;dosage,441,1,1000000,t;
    period,360,3600,1,t;period,442,3600,1,t;period,523,3600,1,t"
    inputLabels="adminDosage[mg];adminPeriod[h]"    
    >
</dbs-fmi>

## Features

- Standard FMU - in browser simulation
- Lightweight and easy to use
- Compatible with all modern browsers

## Usage

1. Include the component in your HTML file:

```html
<script src="path/to/dbs-fmi.js"></script>
```
2.Place the custom element refering the exported model

```html
<dbs-fmi src="fmi-exported-model.js" ...></dbs-fmi>
```

## Attributes

| Attribute | Description                | Type   | Default         |
|-----------|----------------------------|--------|-----------------|
| `id` | Unique identifier, can be used by other components    | String |  |
| `showvalues` | Shows final simulated values of variables | Boolean | `false` |
| `mode` | `continuous` for continuous simulation, `oneshot` for all simulation steps performed from starttime to stoptime, `onestep` for single simulation step performed after each `start` event | String | `continuous` |
|`src` | link to functional mockup unit translated to JS and WebAssembly | String| |
| `fminame` | FMI name as it is presented in FMU | String | |
| `tolerance` | optional parameter, may not be taken into account | | |
| `starttime` | | | 0 |
| `stoptime` | if defined, simulation will stop at this time | | |
| `fstepsize` | size of simulation step | | |
| `guid` | FMI guid as it is presented in FMU | String | | 
| `valuereferences` | comma separated numbers of variable's references that will be exposed at each simulation step, this values can be visualised in chart or in a table | String | |
| `valuelabels` | optional comma separated names of variables | | |
|`inputs` | list of input variables and link to DOM where it can be changed in form `DOM id,value reference, numerator, denominator, addent, t/f` | | |
| `inputLabels` | optional comma separated names of input variables | | |
