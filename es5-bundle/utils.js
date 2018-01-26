'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.initialize = initialize;
exports.isDesktop = isDesktop;
exports.isMobile = isMobile;
exports.isPlanB = isPlanB;
exports.canChangeResolution = canChangeResolution;
exports.randomNumber = randomNumber;
exports.closeMediaStream = closeMediaStream;

var _bowser = require('bowser');

var _bowser2 = _interopRequireDefault(_bowser);

var _randomNumber = require('random-number');

var _randomNumber2 = _interopRequireDefault(_randomNumber);

var _Logger = require('./Logger');

var _Logger2 = _interopRequireDefault(_Logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

global.BROWSER = _bowser2.default;

var logger = new _Logger2.default('utils');
var randomNumberGenerator = _randomNumber2.default.generator({
	min: 10000000,
	max: 99999999,
	integer: true
});

var mediaQueryDetectorElem = void 0;

function initialize() {
	logger.debug('initialize()');

	// Media query detector stuff
	mediaQueryDetectorElem = document.getElementById('mediasoup-demo-app-media-query-detector');

	return _promise2.default.resolve();
}

function isDesktop() {
	return true; //!!mediaQueryDetectorElem.offsetParent;
}

function isMobile() {
	return false; //!mediaQueryDetectorElem.offsetParent;
}

function isPlanB() {
	if (_bowser2.default.chrome || _bowser2.default.chromium || _bowser2.default.opera || _bowser2.default.safari || _bowser2.default.msedge || _bowser2.default.firefox && _bowser2.default.version >= 58) return true;else return false;
}

/**
 * Unfortunately Edge produces rtpSender.send() to fail when receiving media
 * from others and removing/adding a local track.
 */
function canChangeResolution() {
	if (_bowser2.default.msedge) return false;

	return true;
}

function randomNumber() {
	return randomNumberGenerator();
}

function closeMediaStream(stream) {
	if (!stream) return;

	var tracks = stream.getTracks();

	for (var i = 0, len = tracks.length; i < len; i++) {
		tracks[i].stop();
	}
}