// The ShareMyDays LIBRARY build number — cache-busts all files under this
// library (components, services, themes, vendor, sampleImages.json). It lives
// IN the library folder so it travels with the copy when synced to a consumer
// app. Each consumer app has its own number too (APP_BUILD_NUMBER in its own
// js/build-number.js); the SmdApp boot loader picks the right one per URL.
//
// Shared service/component files read SHARED_BUILD_NUMBER first and fall back
// to the legacy BUILD_NUMBER (the single number of hosts that haven't split
// into two yet, e.g. PlanMyDay) so the library works in both kinds of host.
const SHARED_BUILD_NUMBER = "202609081002";
window.SHARED_BUILD_NUMBER = SHARED_BUILD_NUMBER;