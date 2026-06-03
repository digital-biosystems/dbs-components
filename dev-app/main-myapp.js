import Aurelia from 'aurelia';
import { MyApp } from './my-app.js';
// Only import the components actually used by the myapp demo page.
// Deliberately excludes Druglist/Drugviewer/Drugcard (48 MB JSON),
// Kbsearch (812 KB JSON), ChartjsGeo, Webllmchat.
import { Pgxchartd } from '../src/chartjs/pgxchartd.js';
import { Fmi } from '../src/fmi/fmi.js';
import { Chartjs3 } from '../src/chartjs/chartjs3.js';
import { ButtonParams } from '../src/buttonparams/button-params.js';
import { GuidedSlides } from '../src/guidedslides/guided-slides.js';
import { GuidedSlide } from '../src/guidedslides/guided-slide.js';
import { PgxBadge } from '../src/pgxbadge/pgx-badge.js';
import { Value } from '../src/value/value.js';

Aurelia
  .register(Pgxchartd, Fmi, Chartjs3, ButtonParams, GuidedSlides, GuidedSlide, PgxBadge, Value)
  .app(MyApp)
  .start();
