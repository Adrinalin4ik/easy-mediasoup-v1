'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _bowser = require('bowser');

var _bowser2 = _interopRequireDefault(_bowser);

var _Logger = require('../Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _utils = require('../utils');

var utils = _interopRequireWildcard(_utils);

var _Client = require('../Client');

var _Client2 = _interopRequireDefault(_Client);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = new _Logger2.default('Room');
// import LocalVideo from './LocalVideo';
// import RemoteVideo from './RemoteVideo';
// import Stats from './Stats';

var STATS_INTERVAL = 1000;

var Room = function () {
	function Room(config) {
		(0, _classCallCheck3.default)(this, Room);

		this.config = config;
		this.state = {
			peers: {},
			localStream: null,
			localVideoResolution: null, // qvga / vga / hd / fullhd.
			multipleWebcams: false,
			webcamType: null,
			connectionState: null,
			remoteStreams: {},
			showStats: false,
			stats: null,
			activeSpeakerId: null
		};

		// Mounted flag
		// this._mounted = false;
		// // Client instance
		this._client = null;
		// // Timer to retrieve RTC stats.
		this._statsTimer = null;

		// TODO: TMP
		global.ROOM = this;
		this._runClient();
	}

	(0, _createClass3.default)(Room, [{
		key: 'handleLocalMute',
		value: function handleLocalMute(value) {
			logger.debug('handleLocalMute() [value:%s]', value);

			var micTrack = this.state.localStream.getAudioTracks()[0];

			if (!micTrack) return _promise2.default.reject(new Error('no audio track'));

			micTrack.enabled = !value;

			return _promise2.default.resolve();
		}
	}, {
		key: 'handleLocalWebcamToggle',
		value: function handleLocalWebcamToggle(value) {
			var _this = this;

			logger.debug('handleLocalWebcamToggle() [value:%s]', value);

			return _promise2.default.resolve().then(function () {
				if (value) return _this._client.addVideo();else return _this._client.removeVideo();
			}).then(function () {
				var localStream = _this.state.localStream;
				// this.setState({ localStream });
			});
		}
	}, {
		key: 'handleLocalWebcamChange',
		value: function handleLocalWebcamChange() {
			logger.debug('handleLocalWebcamChange()');

			this._client.changeWebcam();
		}
	}, {
		key: 'handleLocalResolutionChange',
		value: function handleLocalResolutionChange() {
			logger.debug('handleLocalResolutionChange()');

			if (!utils.canChangeResolution()) {
				logger.warn('changing local resolution not implemented for this browser');

				return;
			}

			this._client.changeVideoResolution();
		}
	}, {
		key: 'handleStatsClose',
		value: function handleStatsClose() {
			logger.debug('handleStatsClose()');

			// this.setState({ showStats: false });
			this.state.showStats = false;
			this._stopStats();
		}
	}, {
		key: 'handleClickShowStats',
		value: function handleClickShowStats() {
			logger.debug('handleClickShowStats()');

			// this.setState({ showStats: true });
			this.state.showStats = true;
			this._startStats();
		}
	}, {
		key: 'handleDisableRemoteVideo',
		value: function handleDisableRemoteVideo(msid) {
			logger.debug('handleDisableRemoteVideo() [msid:"%s"]', msid);

			return this._client.disableRemoteVideo(msid);
		}
	}, {
		key: 'handleEnableRemoteVideo',
		value: function handleEnableRemoteVideo(msid) {
			logger.debug('handleEnableRemoteVideo() [msid:"%s"]', msid);

			return this._client.enableRemoteVideo(msid);
		}
	}, {
		key: '_runClient',
		value: function _runClient() {
			var _this2 = this;

			var peerId = this.config.peerId;
			var roomId = this.config.roomId;

			logger.debug('_runClient() [peerId:"%s", roomId:"%s"]', peerId, roomId);

			this._client = new _Client2.default(this.config);

			this._client.on('localstream', function (stream, resolution) {
				// 	this.setState(
				// 		{
				// 			localStream          : stream,
				// 			localVideoResolution : resolution
				// 		});
				_this2.state.localStream = stream;
				_this2.state.localVideoResolution = resolution;
				global.emitter.emit("localstream", stream);
			});

			this._client.on('join', function () {
				// Clear remote streams (for reconnections).
				// this.setState({ remoteStreams: {} });
				_this2.state.remoteStreams = {};
				// Start retrieving WebRTC stats (unless mobile or Edge).
				if (utils.isDesktop() && !_bowser2.default.msedge) {
					// this.setState({ showStats: true });
					_this2.state.showStats = true;
					setTimeout(function () {
						_this2._startStats();
					}, STATS_INTERVAL / 2);

					global.emitter.emit("join", null);
				}
			});

			this._client.on('close', function (error) {
				// Clear remote streams (for reconnections) and more stuff.
				// this.setState(
				// 	{
				// 		remoteStreams   : {},
				// 		activeSpeakerId : null
				// 	});
				_this2.state.remoteStreams = {};
				_this2.state.activeSpeakerId = null;
				if (error) {}
				// this.config.onNotify(
				// 	{
				// 		level   : 'error',
				// 		title   : 'Error',
				// 		message : error.message
				// 	});


				// Stop retrieving WebRTC stats.
				_this2._stopStats();
				global.emitter.emit("close", error);
			});

			this._client.on('disconnected', function () {
				// Clear remote streams (for reconnections).
				// this.setState({ remoteStreams: {} });
				_this2.state.remoteStreams = {};
				// this.config.onNotify(
				// 	{
				// 		level   : 'error',
				// 		title   : 'Warning',
				// 		message : 'app disconnected'
				// 	});

				// Stop retrieving WebRTC stats.
				_this2._stopStats();
				global.emitter.emit("disconnected", null);
			});

			this._client.on('numwebcams', function (num) {
				_this2.state.multipleWebcams = num > 1 ? true : false;
				// this.setState(
				// 	{
				// 		multipleWebcams : (num > 1 ? true : false)
				// 	});
				global.emitter.emit("numwebcams", num);
			});

			this._client.on('webcamtype', function (type) {
				_this2.state.webcamType = type;
				// this.setState({ webcamType: type });
				global.emitter.emit("webcamtype", type);
			});

			this._client.on('peers', function (peers) {
				var peersObject = {};

				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = (0, _getIterator3.default)(peers), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var peer = _step.value;

						peersObject[peer.id] = peer;
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion && _iterator.return) {
							_iterator.return();
						}
					} finally {
						if (_didIteratorError) {
							throw _iteratorError;
						}
					}
				}

				_this2.state.peers = peersObject;
				// this.setState({ peers: peersObject });

				global.emitter.emit("peers", peers);
			});

			this._client.on('addpeer', function (peer) {
				// this.config.onNotify(
				// 	{
				// 		level   : 'success',
				// 		message : `${peer.id} joined the room`
				// 	});

				var peers = _this2.state.peers;

				peers[peer.id] = peer;

				_this2.state.peers = peers;
				// this.setState({ peers });

				global.emitter.emit("addpeer", peer.id);
			});

			this._client.on('updatepeer', function (peer) {
				var peers = _this2.state.peers;

				peers[peer.id] = peer;

				_this2.state.peers = peers;
				// this.setState({ peers });
				global.emitter.emit("updatepeer", peer);
			});

			this._client.on('removepeer', function (peer) {
				// this.config.onNotify(
				// 	{
				// 		level   : 'info',
				// 		message : `${peer.id} left the room`
				// 	});

				var peers = _this2.state.peers;

				peer = peers[peer.id];
				if (!peer) return;

				delete peers[peer.id];

				// NOTE: This shouldn't be needed but Safari 11 does not fire pc "removestream"
				// nor stream "removetrack" nor track "ended", so we need to cleanup remote
				// streams when a peer leaves.
				var remoteStreams = _this2.state.remoteStreams;

				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = (0, _getIterator3.default)(peer.msids), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var msid = _step2.value;

						delete remoteStreams[msid];
					}
				} catch (err) {
					_didIteratorError2 = true;
					_iteratorError2 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}
					} finally {
						if (_didIteratorError2) {
							throw _iteratorError2;
						}
					}
				}

				_this2.state.peers = peers;
				_this2.state.remoteStreams = remoteStreams;
				// this.setState({ peers, remoteStreams });

				global.emitter.emit("removepeer", peer);
			});

			this._client.on('connectionstate', function (state) {
				// this.setState({ connectionState: state });
				_this2.state.connectionState = state;
				global.emitter.emit("connectionstate", state);
			});

			this._client.on('addstream', function (stream) {
				var remoteStreams = _this2.state.remoteStreams;
				var streamId = stream.jitsiRemoteId || stream.id;

				remoteStreams[streamId] = stream;

				_this2.state.remoteStreams = remoteStreams;
				// this.setState({ remoteStreams });
				global.emitter.emit("addstream", stream);
			});

			this._client.on('removestream', function (stream) {
				var remoteStreams = _this2.state.remoteStreams;
				var streamId = stream.jitsiRemoteId || stream.id;

				delete remoteStreams[streamId];
				// this.setState({ remoteStreams });

				_this2.state.remoteStreams = remoteStreams;

				global.emitter.emit("removestream", stream);
			});

			this._client.on('addtrack', function () {
				var remoteStreams = _this2.state.remoteStreams;
				_this2.state.remoteStreams = remoteStreams;
				// this.setState({ remoteStreams });
				global.emitter.emit("addtrack", null);
			});

			this._client.on('removetrack', function () {
				var remoteStreams = _this2.state.remoteStreams;
				_this2.state.remoteStreams = remoteStreams;
				// this.setState({ remoteStreams });
				global.emitter.emit("removetrack", null);
			});

			this._client.on('forcestreamsupdate', function () {
				// Just firef for Firefox due to bug:
				// https://bugzilla.mozilla.org/show_bug.cgi?id=1347578
				// this.forceUpdate();
				global.emitter.emit("forcestreamsupdate", null);
			});

			this._client.on('activespeaker', function (peer) {
				_this2.state.activeSpeakerId = peer ? peer.id : null;
				// this.setState(
				// 	{
				// 		activeSpeakerId : (peer ? peer.id : null)
				// 	});
				global.emitter.emit("activespeaker", peer);
			});
		}
	}, {
		key: '_startStats',
		value: function _startStats() {
			logger.debug('_startStats()');

			getStats.call(this);

			function getStats() {
				var _this3 = this;

				this._client.getStats().then(function (stats) {
					// if (!this._mounted)
					// 	return;
					_this3.state.stats = stats;
					// this.setState({ stats });

					_this3._statsTimer = setTimeout(function () {
						getStats.call(_this3);
					}, STATS_INTERVAL);
				}).catch(function (error) {
					logger.error('getStats() failed: %o', error);
					_this3.state.stats = null;
					// this.setState({ stats: null });

					// this._statsTimer = setTimeout(() =>
					// {
					// 	getStats.call(this);
					// }, STATS_INTERVAL);
				});
			}
		}
	}, {
		key: '_stopStats',
		value: function _stopStats() {
			logger.debug('_stopStats()');
			this.state.stats = null;
			// this.setState({ stats: null });

			clearTimeout(this._statsTimer);
		}
	}]);
	return Room;
}();

exports.default = Room;