/**
 * Leaflet Compatibility Polyfills
 * 
 * leaflet.vectorgrid@1.3.0 calls L.DomEvent.fakeStop which was removed in Leaflet 1.9.
 * This file patches it back as a no-op before the library is loaded.
 */
import L from 'leaflet';

if (L.DomEvent && !L.DomEvent.fakeStop) {
    L.DomEvent.fakeStop = function () { return false; };
}
