"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMobileDevice = void 0;
// utils/DeviceChercker.js:
function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
}
exports.isMobileDevice = isMobileDevice;
;
