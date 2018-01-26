'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Init = undefined;

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _bowser = require('bowser');

var _bowser2 = _interopRequireDefault(_bowser);

var _urlParse = require('url-parse');

var _urlParse2 = _interopRequireDefault(_urlParse);

var _randomString = require('random-string');

var _randomString2 = _interopRequireDefault(_randomString);

var _Logger = require('./Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

var _RTCPeerConnection = require('./edge/RTCPeerConnection');

var _RTCPeerConnection2 = _interopRequireDefault(_RTCPeerConnection);

var _RTCSessionDescription = require('./edge/RTCSessionDescription');

var _RTCSessionDescription2 = _interopRequireDefault(_RTCSessionDescription);

var _Room = require('./components/Room');

var _Room2 = _interopRequireDefault(_Room);

var _wildemitter = require('wildemitter');

var emitter = _interopRequireWildcard(_wildemitter);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Init = exports.Init = function Init(config) {
	(0, _classCallCheck3.default)(this, Init);

	global.emitter = this.emitter = new emitter.default();
	var REGEXP_FRAGMENT_ROOM_ID = new RegExp('^#room-id=([0-9a-zA-Z_-]+)$');
	var logger = new _Logger2.default();

	logger.debug('detected browser [name:"%s", version:%s]', _bowser2.default.name, _bowser2.default.version);

	// If Edge, use the Jitsi RTCPeerConnection shim.
	if (_bowser2.default.msedge) {
		logger.debug('Edge detected, overriding RTCPeerConnection and RTCSessionDescription');

		window.RTCPeerConnection = _RTCPeerConnection2.default;
		window.RTCSessionDescription = _RTCSessionDescription2.default;
	}
	// Otherwise, do almost anything.
	else {
			window.RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.RTCPeerConnection;
		}

	logger.debug('run() [environment:%s]', process.env.NODE_ENV);

	var urlParser = new _urlParse2.default(window.location.href, true);
	var match = urlParser.hash.match(REGEXP_FRAGMENT_ROOM_ID);
	var peerId = (0, _randomString2.default)({ length: 8 }).toLowerCase();
	var roomId = void 0;

	if (match) {
		roomId = match[1];
	} else {
		roomId = (0, _randomString2.default)({ length: 8 }).toLowerCase();
		// window.location = `#room-id=${roomId}`;
	}
	console.log(config);
	var room = this.client = new _Room2.default(config);

	// ReactDOM.render(<App peerId={peerId} roomId={roomId}/>, container);
};