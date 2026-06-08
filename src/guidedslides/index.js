import { createRegistry } from '../register.js';
import { GuidedSlides } from './guided-slides.js';
import { GuidedSlide } from './guided-slide.js';

const registry = createRegistry();
registry.define('dbs-guidedslides', GuidedSlides);
registry.define('dbs-guidedslide', GuidedSlide);
