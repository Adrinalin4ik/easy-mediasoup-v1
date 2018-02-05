(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.EasyMediasoup = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _bowser = require('bowser');

var _bowser2 = _interopRequireDefault(_bowser);

var _sdpTransform = require('sdp-transform');

var _sdpTransform2 = _interopRequireDefault(_sdpTransform);

var _Logger = require('./Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _protooClient = require('protoo-client');

var _protooClient2 = _interopRequireDefault(_protooClient);

var _urlFactory = require('./urlFactory');

var urlFactory = _interopRequireWildcard(_urlFactory);

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = new _Logger2.default('Client');

var DEFAULT_DO_GETUSERMEDIA = true;
var DEFAULT_ENABLE_SIMULCAST = false;
var DEFAULT_VIDEO_CONSTRAINS = {
	qvga: { width: { ideal: 320 }, height: { ideal: 240 } },
	vga: { width: { ideal: 640 }, height: { ideal: 480 } },
	hd: { width: { ideal: 1280 }, height: { ideal: 720 } }
};

var DEFAULT_SIMULCAST_OPTIONS = {
	low: 100000,
	medium: 300000,
	high: 1500000
};

var VIDEO_CONSTRAINS = [];
var SIMULCAST_OPTIONS = [];
var ENABLE_SIMULCAST = void 0;
var DO_GETUSERMEDIA = void 0;

var Client = function (_events$EventEmitter) {
	(0, _inherits3.default)(Client, _events$EventEmitter);

	function Client(config) {
		(0, _classCallCheck3.default)(this, Client);

		logger.debug('constructor() [peerId:"%s", roomId:"%s"]', config.peerId, config.roomId);

		var _this = (0, _possibleConstructorReturn3.default)(this, (Client.__proto__ || (0, _getPrototypeOf2.default)(Client)).call(this));

		_this.setMaxListeners(Infinity);
		_this.config = config;
		// TODO: TMP
		global.CLIENT = _this;
		//Configs
		console.log(config);
		VIDEO_CONSTRAINS = config.video_constrains !== undefined ? config.video_constrains : DEFAULT_VIDEO_CONSTRAINS;
		SIMULCAST_OPTIONS = config.simulcast_options !== undefined ? config.simulcast_options : DEFAULT_SIMULCAST_OPTIONS;
		DO_GETUSERMEDIA = config.produce !== undefined ? config.produce : DEFAULT_DO_GETUSERMEDIA;
		ENABLE_SIMULCAST = config.useSimulcast !== undefined ? config.useSimulcast : DEFAULT_ENABLE_SIMULCAST;
		/////////

		var url = urlFactory.getProtooUrl(config.media_server_wss, config.peerId, config.roomId);
		var transport = new _protooClient2.default.WebSocketTransport(url);

		// protoo-client Peer instance.
		_this._protooPeer = new _protooClient2.default.Peer(transport);

		// RTCPeerConnection instance.
		_this._peerconnection = null;

		// Webcam map indexed by deviceId.
		_this._webcams = new _map2.default();

		// Local Webcam device.
		_this._webcam = null;

		// Local MediaStream instance.
		_this._localStream = null;

		// Closed flag.
		_this._closed = false;

		// Local video resolution.
		_this._localVideoResolution = 'vga';
		//if video not working
		_this.audioOnlyConnection = false;

		_this._protooPeer.on('open', function () {
			logger.debug('protoo Peer "open" event');
		});

		_this._protooPeer.on('disconnected', function () {
			logger.warn('protoo Peer "disconnected" event');

			// Close RTCPeerConnection.
			try {
				_this._peerconnection.close();
			} catch (error) {}

			// Close local MediaStream.
			if (_this._localStream) utils.closeMediaStream(_this._localStream);

			_this.emit('disconnected');
		});

		_this._protooPeer.on('close', function () {
			if (_this._closed) return;

			logger.warn('protoo Peer "close" event');

			_this.close();
		});

		_this._protooPeer.on('request', _this._handleRequest.bind(_this));
		return _this;
	}

	(0, _createClass3.default)(Client, [{
		key: 'close',
		value: function close() {
			if (this._closed) return;

			this._closed = true;

			logger.debug('close()');

			// Close protoo Peer.
			this._protooPeer.close();

			// Close RTCPeerConnection.
			try {
				this._peerconnection.close();
			} catch (error) {}

			// Close local MediaStream.
			if (this._localStream) utils.closeMediaStream(this._localStream);

			// Emit 'close' event.
			this.emit('close');
		}
	}, {
		key: 'removeVideo',
		value: function removeVideo(dontNegotiate) {
			logger.debug('removeVideo()');

			var stream = this._localStream;
			var videoTrack = stream.getVideoTracks()[0];

			if (!videoTrack) {
				logger.warn('removeVideo() | no video track');

				return _promise2.default.reject(new Error('no video track'));
			}

			videoTrack.stop();
			stream.removeTrack(videoTrack);

			// New API.
			if (this._peerconnection.removeTrack) {
				var sender = void 0;

				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = (0, _getIterator3.default)(this._peerconnection.getSenders()), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						sender = _step.value;

						if (sender.track === videoTrack) break;
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

				this._peerconnection.removeTrack(sender);
			}
			// Old API.
			else {
					this._peerconnection.addStream(stream);
				}

			if (!dontNegotiate) {
				this.emit('localstream', stream, null);

				return this._requestRenegotiation();
			}
		}
	}, {
		key: 'addVideo',
		value: function addVideo() {
			var _this2 = this;

			logger.debug('addVideo()');

			var stream = this._localStream;
			var videoTrack = void 0;
			var videoResolution = this._localVideoResolution; // Keep previous resolution.

			if (stream) videoTrack = stream.getVideoTracks()[0];

			if (videoTrack) {
				logger.warn('addVideo() | there is already a video track');

				return _promise2.default.reject(new Error('there is already a video track'));
			}

			return this._getLocalStream({
				video: VIDEO_CONSTRAINS[videoResolution]
			}).then(function (newStream) {
				var newVideoTrack = newStream.getVideoTracks()[0];

				if (stream) {
					stream.addTrack(newVideoTrack);

					// New API.
					if (_this2._peerconnection.addTrack) {
						_this2._peerconnection.addTrack(newVideoTrack, stream);
					}
					// Old API.
					else {
							_this2._peerconnection.addStream(stream);
						}
				} else {
					_this2._localStream = newStream;

					// New API.
					if (_this2._peerconnection.addTrack) {
						_this2._peerconnection.addTrack(newVideoTrack, stream);
					}
					// Old API.
					else {
							_this2._peerconnection.addStream(stream);
						}
				}

				_this2.emit('localstream', _this2._localStream, videoResolution);
			}).then(function () {
				return _this2._requestRenegotiation();
			}).catch(function (error) {
				logger.error('addVideo() failed: %o', error);

				throw error;
			});
		}
	}, {
		key: 'changeWebcam',
		value: function changeWebcam() {
			var _this3 = this;

			if (this.audioOnlyConnection == true) {
				return 0;
			}

			logger.debug('changeWebcam()');
			return _promise2.default.resolve().then(function () {
				return _this3._updateWebcams();
			}).then(function () {
				var array = (0, _from2.default)(_this3._webcams.keys());
				var len = array.length;
				var deviceId = _this3._webcam ? _this3._webcam.deviceId : undefined;
				var idx = array.indexOf(deviceId);

				if (idx < len - 1) idx++;else idx = 0;

				_this3._webcam = _this3._webcams.get(array[idx]);

				_this3._emitWebcamType();

				if (len < 2) return;

				logger.debug('changeWebcam() | new selected webcam [deviceId:"%s"]', _this3._webcam.deviceId);

				// Reset video resolution to VGA.
				_this3._localVideoResolution = 'vga';

				// For Chrome (old WenRTC API).
				// Replace the track (so new SSRC) and renegotiate.
				if (!_this3._peerconnection.removeTrack) {
					_this3.removeVideo(true);

					return _this3.addVideo();
				}
				// For Firefox (modern WebRTC API).
				// Avoid renegotiation.
				else {
						return _this3._getLocalStream({
							video: VIDEO_CONSTRAINS[_this3._localVideoResolution]
						}).then(function (newStream) {
							var newVideoTrack = newStream.getVideoTracks()[0];
							var stream = _this3._localStream;
							var oldVideoTrack = stream.getVideoTracks()[0];
							var sender = void 0;

							var _iteratorNormalCompletion2 = true;
							var _didIteratorError2 = false;
							var _iteratorError2 = undefined;

							try {
								for (var _iterator2 = (0, _getIterator3.default)(_this3._peerconnection.getSenders()), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
									sender = _step2.value;

									if (sender.track === oldVideoTrack) break;
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

							sender.replaceTrack(newVideoTrack);
							stream.removeTrack(oldVideoTrack);
							oldVideoTrack.stop();
							stream.addTrack(newVideoTrack);

							_this3.emit('localstream', stream, _this3._localVideoResolution);
						});
					}
			}).catch(function (error) {
				logger.error('changeWebcam() failed: %o', error);
			});
		}
	}, {
		key: 'changeVideoResolution',
		value: function changeVideoResolution() {
			var _this4 = this;

			logger.debug('changeVideoResolution()');

			var newVideoResolution = void 0;

			switch (this._localVideoResolution) {
				case 'qvga':
					newVideoResolution = 'vga';
					break;
				case 'vga':
					newVideoResolution = 'hd';
					break;
				case 'hd':
					newVideoResolution = 'qvga';
					break;
				default:
					throw new Error('unknown resolution "' + this._localVideoResolution + '"');
			}

			this._localVideoResolution = newVideoResolution;

			// For Chrome (old WenRTC API).
			// Replace the track (so new SSRC) and renegotiate.
			if (!this._peerconnection.removeTrack) {
				this.removeVideo(true);

				return this.addVideo();
			}
			// For Firefox (modern WebRTC API).
			// Avoid renegotiation.
			else {
					return this._getLocalStream({
						video: VIDEO_CONSTRAINS[this._localVideoResolution]
					}).then(function (newStream) {
						var newVideoTrack = newStream.getVideoTracks()[0];
						var stream = _this4._localStream;
						var oldVideoTrack = stream.getVideoTracks()[0];
						var sender = void 0;

						var _iteratorNormalCompletion3 = true;
						var _didIteratorError3 = false;
						var _iteratorError3 = undefined;

						try {
							for (var _iterator3 = (0, _getIterator3.default)(_this4._peerconnection.getSenders()), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
								sender = _step3.value;

								if (sender.track === oldVideoTrack) break;
							}
						} catch (err) {
							_didIteratorError3 = true;
							_iteratorError3 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion3 && _iterator3.return) {
									_iterator3.return();
								}
							} finally {
								if (_didIteratorError3) {
									throw _iteratorError3;
								}
							}
						}

						sender.replaceTrack(newVideoTrack);
						stream.removeTrack(oldVideoTrack);
						oldVideoTrack.stop();
						stream.addTrack(newVideoTrack);

						_this4.emit('localstream', stream, newVideoResolution);
					}).catch(function (error) {
						logger.error('changeVideoResolution() failed: %o', error);
					});
				}
		}
	}, {
		key: 'getStats',
		value: function getStats() {
			return this._peerconnection.getStats().catch(function (error) {
				logger.error('pc.getStats() failed: %o', error);

				throw error;
			});
		}
	}, {
		key: 'disableRemoteVideo',
		value: function disableRemoteVideo(msid) {
			return this._protooPeer.send('disableremotevideo', { msid: msid, disable: true }).catch(function (error) {
				logger.warn('disableRemoteVideo() failed: %o', error);
			});
		}
	}, {
		key: 'enableRemoteVideo',
		value: function enableRemoteVideo(msid) {
			return this._protooPeer.send('disableremotevideo', { msid: msid, disable: false }).catch(function (error) {
				logger.warn('enableRemoteVideo() failed: %o', error);
			});
		}
	}, {
		key: 'tryToConnectAudoOnly',
		value: function tryToConnectAudoOnly(request, accept, reject) {
			this.audioOnlyConnection = true;
			console.warn("PROC");
			this._handleRequest(request, accept, reject);
		}
	}, {
		key: '_handleRequest',
		value: function _handleRequest(request, accept, reject) {
			var _this5 = this;

			logger.debug('_handleRequest() [method:%s, data:%o]', request.method, request.data);

			switch (request.method) {
				case 'joinme':
					{
						var videoResolution = this._localVideoResolution;

						_promise2.default.resolve().then(function () {
							return _this5._updateWebcams();
						}).then(function () {
							if (DO_GETUSERMEDIA) {
								return _this5._getLocalStream({
									audio: true,
									video: _this5.audioOnlyConnection == true ? false : VIDEO_CONSTRAINS[videoResolution]
								}).then(function (stream) {
									logger.debug('got local stream [resolution:%s]', videoResolution);

									// Close local MediaStream if any.
									if (_this5._localStream) utils.closeMediaStream(_this5._localStream);

									_this5._localStream = stream;

									// Emit 'localstream' event.
									_this5.emit('localstream', stream, videoResolution);
								}).catch(function (error) {
									console.error("CAMERA NOT FOUND", error);
									_this5.emit('noCameraError', error);
									_this5.tryToConnectAudoOnly(request, accept, reject);
								});
							}
						}).then(function () {
							return _this5._createPeerConnection();
						}).then(function () {
							return _this5._peerconnection.createOffer({
								offerToReceiveAudio: 1,
								offerToReceiveVideo: 1
							});
						}).then(function (offer) {
							var capabilities = offer.sdp;
							var parsedSdp = _sdpTransform2.default.parse(capabilities);

							logger.debug('capabilities [parsed:%O, sdp:%s]', parsedSdp, capabilities);

							// Accept the protoo request.
							accept({
								capabilities: capabilities,
								usePlanB: utils.isPlanB()
							});
						}).then(function () {
							logger.debug('"joinme" request accepted');

							// Emit 'join' event.
							_this5.emit('join');
						}).catch(function (error) {
							logger.error('"joinme" request failed: %o', error);

							reject(500, error.message);
							throw error;
						});

						break;
					}

				case 'peers':
					{
						this.emit('peers', request.data.peers);
						accept();

						break;
					}

				case 'addpeer':
					{
						this.emit('addpeer', request.data.peer);
						accept();

						break;
					}

				case 'updatepeer':
					{
						this.emit('updatepeer', request.data.peer);
						accept();

						break;
					}

				case 'removepeer':
					{
						this.emit('removepeer', request.data.peer);
						accept();

						break;
					}

				case 'offer':
					{
						var offer = new RTCSessionDescription(request.data.offer);
						var parsedSdp = _sdpTransform2.default.parse(offer.sdp);

						logger.debug('received offer [parsed:%O, sdp:%s]', parsedSdp, offer.sdp);

						_promise2.default.resolve().then(function () {
							return _this5._peerconnection.setRemoteDescription(offer);
						}).then(function () {
							return _this5._peerconnection.createAnswer();
						})
						// Play with simulcast.
						.then(function (answer) {
							if (!ENABLE_SIMULCAST) return answer;

							// Chrome Plan B simulcast.
							if (utils.isPlanB()) {
								// Just for the initial offer.
								// NOTE: Otherwise Chrome crashes.
								// TODO: This prevents simulcast to be applied to new tracks.
								if (_this5._peerconnection.localDescription && _this5._peerconnection.localDescription.sdp) return answer;

								// TODO: Should be done just for VP8.
								var _parsedSdp = _sdpTransform2.default.parse(answer.sdp);
								var videoMedia = void 0;

								var _iteratorNormalCompletion4 = true;
								var _didIteratorError4 = false;
								var _iteratorError4 = undefined;

								try {
									for (var _iterator4 = (0, _getIterator3.default)(_parsedSdp.media), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
										var m = _step4.value;

										if (m.type === 'video') {
											videoMedia = m;
											break;
										}
									}
								} catch (err) {
									_didIteratorError4 = true;
									_iteratorError4 = err;
								} finally {
									try {
										if (!_iteratorNormalCompletion4 && _iterator4.return) {
											_iterator4.return();
										}
									} finally {
										if (_didIteratorError4) {
											throw _iteratorError4;
										}
									}
								}

								if (!videoMedia || !videoMedia.ssrcs) return answer;

								logger.debug('setting video simulcast (PlanB)');

								var ssrc1 = void 0;
								var ssrc2 = void 0;
								var ssrc3 = void 0;
								var cname = void 0;
								var msid = void 0;

								var _iteratorNormalCompletion5 = true;
								var _didIteratorError5 = false;
								var _iteratorError5 = undefined;

								try {
									for (var _iterator5 = (0, _getIterator3.default)(videoMedia.ssrcs), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
										var ssrcObj = _step5.value;

										// Chrome uses:
										//   a=ssrc:xxxx msid:yyyy zzzz
										//   a=ssrc:xxxx mslabel:yyyy
										//   a=ssrc:xxxx label:zzzz
										// Where yyyy is the MediaStream.id and zzzz the MediaStreamTrack.id.
										switch (ssrcObj.attribute) {
											case 'cname':
												ssrc1 = ssrcObj.id;
												cname = ssrcObj.value;
												break;

											case 'msid':
												msid = ssrcObj.value;
												break;
										}
									}
								} catch (err) {
									_didIteratorError5 = true;
									_iteratorError5 = err;
								} finally {
									try {
										if (!_iteratorNormalCompletion5 && _iterator5.return) {
											_iterator5.return();
										}
									} finally {
										if (_didIteratorError5) {
											throw _iteratorError5;
										}
									}
								}

								ssrc2 = ssrc1 + 1;
								ssrc3 = ssrc1 + 2;

								videoMedia.ssrcGroups = [{
									semantics: 'SIM',
									ssrcs: ssrc1 + ' ' + ssrc2 + ' ' + ssrc3
								}];

								videoMedia.ssrcs = [{
									id: ssrc1,
									attribute: 'cname',
									value: cname
								}, {
									id: ssrc1,
									attribute: 'msid',
									value: msid
								}, {
									id: ssrc2,
									attribute: 'cname',
									value: cname
								}, {
									id: ssrc2,
									attribute: 'msid',
									value: msid
								}, {
									id: ssrc3,
									attribute: 'cname',
									value: cname
								}, {
									id: ssrc3,
									attribute: 'msid',
									value: msid
								}];

								var modifiedAnswer = {
									type: 'answer',
									sdp: _sdpTransform2.default.write(_parsedSdp)
								};

								return modifiedAnswer;
							}
							// Firefox way.
							else {
									var _parsedSdp2 = _sdpTransform2.default.parse(answer.sdp);
									var _videoMedia = void 0;

									logger.debug('created answer [parsed:%O, sdp:%s]', _parsedSdp2, answer.sdp);

									var _iteratorNormalCompletion6 = true;
									var _didIteratorError6 = false;
									var _iteratorError6 = undefined;

									try {
										for (var _iterator6 = (0, _getIterator3.default)(_parsedSdp2.media), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
											var _m = _step6.value;

											if (_m.type === 'video' && _m.direction === 'sendonly') {
												_videoMedia = _m;
												break;
											}
										}
									} catch (err) {
										_didIteratorError6 = true;
										_iteratorError6 = err;
									} finally {
										try {
											if (!_iteratorNormalCompletion6 && _iterator6.return) {
												_iterator6.return();
											}
										} finally {
											if (_didIteratorError6) {
												throw _iteratorError6;
											}
										}
									}

									if (!_videoMedia) return answer;

									logger.debug('setting video simulcast (Unified-Plan)');

									_videoMedia.simulcast_03 = {
										value: 'send rid=1,2'
									};

									_videoMedia.rids = [{ id: '1', direction: 'send' }, { id: '2', direction: 'send' }];

									var _modifiedAnswer = {
										type: 'answer',
										sdp: _sdpTransform2.default.write(_parsedSdp2)
									};

									return _modifiedAnswer;
								}
						}).then(function (answer) {
							return _this5._peerconnection.setLocalDescription(answer);
						}).then(function () {
							var answer = _this5._peerconnection.localDescription;
							var parsedSdp = _sdpTransform2.default.parse(answer.sdp);

							logger.debug('sent answer [parsed:%O, sdp:%s]', parsedSdp, answer.sdp);

							accept({
								answer: {
									type: answer.type,
									sdp: answer.sdp
								}
							});
						}).catch(function (error) {
							logger.error('"offer" request failed: %o', error);

							reject(500, error.message);
							throw error;
						}).then(function () {
							// If Firefox trigger 'forcestreamsupdate' event due to bug:
							// https://bugzilla.mozilla.org/show_bug.cgi?id=1347578
							if (_bowser2.default.firefox || _bowser2.default.gecko) {
								// Not sure, but it thinks that the timeout does the trick.
								setTimeout(function () {
									return _this5.emit('forcestreamsupdate');
								}, 500);
							}
						});

						break;
					}

				case 'activespeaker':
					{
						var data = request.data;

						this.emit('activespeaker', data.peer, data.level);
						accept();

						break;
					}

				default:
					{
						logger.error('unknown method');

						reject(404, 'unknown method');
					}
			}
		}
	}, {
		key: '_updateWebcams',
		value: function _updateWebcams() {
			var _this6 = this;

			logger.debug('_updateWebcams()');

			// Reset the list.
			this._webcams = new _map2.default();

			return _promise2.default.resolve().then(function () {
				return navigator.mediaDevices.enumerateDevices();
			}).then(function (devices) {
				var _iteratorNormalCompletion7 = true;
				var _didIteratorError7 = false;
				var _iteratorError7 = undefined;

				try {
					for (var _iterator7 = (0, _getIterator3.default)(devices), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
						var device = _step7.value;

						if (device.kind !== 'videoinput') continue;

						_this6._webcams.set(device.deviceId, device);
					}
				} catch (err) {
					_didIteratorError7 = true;
					_iteratorError7 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion7 && _iterator7.return) {
							_iterator7.return();
						}
					} finally {
						if (_didIteratorError7) {
							throw _iteratorError7;
						}
					}
				}
			}).then(function () {
				var array = (0, _from2.default)(_this6._webcams.values());
				var len = array.length;
				var currentWebcamId = _this6._webcam ? _this6._webcam.deviceId : undefined;

				logger.debug('_updateWebcams() [webcams:%o]', array);

				if (len === 0) _this6._webcam = null;else if (!_this6._webcams.has(currentWebcamId)) _this6._webcam = array[0];

				_this6.emit('numwebcams', len);

				_this6._emitWebcamType();
			});
		}
	}, {
		key: '_getLocalStream',
		value: function _getLocalStream(constraints) {
			logger.debug('_getLocalStream() [constraints:%o, webcam:%o]', constraints, this._webcam);

			if (this._webcam) constraints.video.deviceId = { exact: this._webcam.deviceId };

			return navigator.mediaDevices.getUserMedia(constraints);
		}
	}, {
		key: '_createPeerConnection',
		value: function _createPeerConnection() {
			var _this7 = this;

			logger.debug('_createPeerConnection()');

			this._peerconnection = new RTCPeerConnection({ iceServers: this.config.turnservers || [] });

			// TODO: TMP
			global.PC = this._peerconnection;

			if (this._localStream) this._peerconnection.addStream(this._localStream);

			this._peerconnection.addEventListener('iceconnectionstatechange', function () {
				var state = _this7._peerconnection.iceConnectionState;

				if (state === 'failed') logger.warn('peerconnection "iceconnectionstatechange" event [state:failed]');else logger.debug('peerconnection "iceconnectionstatechange" event [state:%s]', state);

				_this7.emit('connectionstate', state);
			});

			this._peerconnection.addEventListener('addstream', function (event) {
				var stream = event.stream;

				logger.debug('peerconnection "addstream" event [stream:%o]', stream);

				_this7.emit('addstream', stream);

				// NOTE: For testing.
				var interval = setInterval(function () {
					if (!stream.active) {
						logger.warn('stream inactive [stream:%o]', stream);

						clearInterval(interval);
					}
				}, 2000);

				stream.addEventListener('addtrack', function (event) {
					var track = event.track;

					logger.debug('stream "addtrack" event [track:%o]', track);

					_this7.emit('addtrack', track);

					// Firefox does not implement 'stream.onremovetrack' so let's use 'track.ended'.
					// But... track "ended" is neither fired.
					// https://bugzilla.mozilla.org/show_bug.cgi?id=1347578
					track.addEventListener('ended', function () {
						logger.debug('track "ended" event [track:%o]', track);

						_this7.emit('removetrack', track);
					});
				});

				// NOTE: Not implemented in Firefox.
				stream.addEventListener('removetrack', function (event) {
					var track = event.track;

					logger.debug('stream "removetrack" event [track:%o]', track);

					_this7.emit('removetrack', track);
				});
			});

			this._peerconnection.addEventListener('removestream', function (event) {
				var stream = event.stream;

				logger.debug('peerconnection "removestream" event [stream:%o]', stream);

				_this7.emit('removestream', stream);
			});
		}
	}, {
		key: '_requestRenegotiation',
		value: function _requestRenegotiation() {
			logger.debug('_requestRenegotiation()');

			return this._protooPeer.send('reofferme');
		}
	}, {
		key: '_restartIce',
		value: function _restartIce() {
			logger.debug('_restartIce()');

			return this._protooPeer.send('restartice').then(function () {
				logger.debug('_restartIce() succeded');
			}).catch(function (error) {
				logger.error('_restartIce() failed: %o', error);

				throw error;
			});
		}
	}, {
		key: '_emitWebcamType',
		value: function _emitWebcamType() {
			var webcam = this._webcam;

			if (!webcam) return;

			if (/(back|rear)/i.test(webcam.label)) {
				logger.debug('_emitWebcamType() | it seems to be a back camera');

				this.emit('webcamtype', 'back');
			} else {
				logger.debug('_emitWebcamType() | it seems to be a front camera');

				this.emit('webcamtype', 'front');
			}
		}
	}]);
	return Client;
}(_events2.default.EventEmitter);

exports.default = Client;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Logger":2,"./urlFactory":9,"./utils":10,"babel-runtime/core-js/array/from":11,"babel-runtime/core-js/get-iterator":12,"babel-runtime/core-js/map":15,"babel-runtime/core-js/object/get-prototype-of":18,"babel-runtime/core-js/promise":21,"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/createClass":26,"babel-runtime/helpers/inherits":27,"babel-runtime/helpers/possibleConstructorReturn":28,"bowser":31,"events":158,"protoo-client":163,"sdp-transform":176}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var APP_NAME = 'mediasoup-demo';

var Logger = function () {
	function Logger(prefix) {
		(0, _classCallCheck3.default)(this, Logger);

		if (prefix) {
			this._debug = (0, _debug2.default)(APP_NAME + ':' + prefix);
			this._warn = (0, _debug2.default)(APP_NAME + ':WARN:' + prefix);
			this._error = (0, _debug2.default)(APP_NAME + ':ERROR:' + prefix);
		} else {
			this._debug = (0, _debug2.default)(APP_NAME);
			this._warn = (0, _debug2.default)(APP_NAME + ':WARN');
			this._error = (0, _debug2.default)(APP_NAME + ':ERROR');
		}
		// this._debug.enabled = true
		this._debug.log = console.info.bind(console);
		this._warn.log = console.warn.bind(console);
		this._error.log = console.error.bind(console);
	}

	(0, _createClass3.default)(Logger, [{
		key: 'debug',
		get: function get() {
			return this._debug;
		}
	}, {
		key: 'warn',
		get: function get() {
			return this._warn;
		}
	}, {
		key: 'error',
		get: function get() {
			return this._error;
		}
	}]);
	return Logger;
}();

exports.default = Logger;
},{"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/createClass":26,"debug":156}],3:[function(require,module,exports){
(function (global){
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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../Client":1,"../Logger":2,"../utils":10,"babel-runtime/core-js/get-iterator":12,"babel-runtime/core-js/promise":21,"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/createClass":26,"bowser":31}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _yaeti = require('yaeti');

var _yaeti2 = _interopRequireDefault(_yaeti);

var _Logger = require('../Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _RTCSessionDescription = require('./RTCSessionDescription');

var _RTCSessionDescription2 = _interopRequireDefault(_RTCSessionDescription);

var _utils = require('../utils');

var utils = _interopRequireWildcard(_utils);

var _ortcUtils = require('./ortcUtils');

var ortcUtils = _interopRequireWildcard(_ortcUtils);

var _errors = require('./errors');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* global __filename, RTCIceGatherer, RTCIceTransport, RTCDtlsTransport,
RTCRtpSender, RTCRtpReceiver */

var logger = new _Logger2.default('edge/RTCPeerConnection');

var RTCSignalingState = {
	stable: 'stable',
	haveLocalOffer: 'have-local-offer',
	haveRemoteOffer: 'have-remote-offer',
	closed: 'closed'
};

var RTCIceGatheringState = {
	new: 'new',
	gathering: 'gathering',
	complete: 'complete'
};

var CNAME = 'jitsi-ortc-cname-' + utils.randomNumber();

/**
 * RTCPeerConnection shim for ORTC based endpoints (such as Edge).
 *
 * The interface is based on the W3C specification of 2015, which matches
 * the implementation of Chrome nowadays:
 *
 *   https://www.w3.org/TR/2015/WD-webrtc-20150210/
 *
 * It also implements Plan-B for multi-stream, and assumes single BUNDLEd
 * transport and rtcp-mux.
 */

var ortcRTCPeerConnection = function (_yaeti$EventTarget) {
	(0, _inherits3.default)(ortcRTCPeerConnection, _yaeti$EventTarget);

	/**
  */
	function ortcRTCPeerConnection(pcConfig) {
		(0, _classCallCheck3.default)(this, ortcRTCPeerConnection);

		var _this = (0, _possibleConstructorReturn3.default)(this, (ortcRTCPeerConnection.__proto__ || (0, _getPrototypeOf2.default)(ortcRTCPeerConnection)).call(this));

		logger.debug('constructor() pcConfig:', pcConfig);

		// Buffered local ICE candidates (in WebRTC format).
		// @type {sequence<RTCIceCandidate>}
		_this._bufferedIceCandidates = [];

		// Closed flag.
		// @type {Boolean}
		_this._closed = false;

		// RTCDtlsTransport.
		// @type {RTCDtlsTransport}
		_this._dtlsTransport = null;

		// RTCIceGatherer.
		// @type {RTCIceGatherer}
		_this._iceGatherer = null;

		// RTCPeerConnection iceGatheringState.
		// NOTE: This should not be needed, but Edge does not implement
		// iceGatherer.state.
		// @type {RTCIceGatheringState}
		_this._iceGatheringState = RTCIceGatheringState.new;

		// RTCIceTransport.
		// @type {RTCIceTransport}
		_this._iceTransport = null;

		// Local RTP capabilities (filtered with remote ones).
		// @type {RTCRtpCapabilities}
		_this._localCapabilities = null;

		// Local RTCSessionDescription.
		// @type {RTCSessionDescription}
		_this._localDescription = null;

		// Map with info regarding local media.
		// - index: MediaStreamTrack.id
		// - value: Object
		//   - rtpSender: Associated RTCRtpSender instance
		//   - stream: Associated MediaStream instance
		//   - ssrc: Provisional or definitive SSRC
		//   - rtxSsrc: Provisional or definitive SSRC for RTX
		//   - sending: Boolean indicating whether rtpSender.send() was called.
		_this._localTrackInfos = new _map2.default();

		// Ordered Map with MID as key and kind as value.
		// @type {map<String, String>}
		_this._mids = new _map2.default();

		// Remote RTCSessionDescription.
		// @type {RTCSessionDescription}
		_this._remoteDescription = null;

		// Map of remote streams.
		// - index: MediaStream.jitsiRemoteId (as signaled in remote SDP)
		// - value: MediaStream (locally generated so id does not match)
		// @type {map<Number, MediaStream>}
		_this._remoteStreams = new _map2.default();

		// Map with info about receiving media.
		// - index: Media SSRC
		// - value: Object
		//   - kind: 'audio' / 'video'
		//   - ssrc: Media SSRC
		//   - rtxSsrc: RTX SSRC (may be unset)
		//   - streamId: MediaStream.jitsiRemoteId
		//   - trackId: MediaStreamTrack.jitsiRemoteId
		//   - cname: CNAME
		//   - stream: MediaStream
		//   - track: MediaStreamTrack
		//   - rtpReceiver: Associated RTCRtpReceiver instance
		// @type {map<Number, Object>}
		_this._remoteTrackInfos = new _map2.default();

		// Local SDP global fields.
		_this._sdpGlobalFields = {
			id: utils.randomNumber(),
			version: 0
		};

		// RTCPeerConnection signalingState.
		// @type {RTCSignalingState}
		_this._signalingState = RTCSignalingState.stable;

		// Create the RTCIceGatherer.
		_this._setIceGatherer(pcConfig);

		// Create the RTCIceTransport.
		_this._setIceTransport(_this._iceGatherer);

		// Create the RTCDtlsTransport.
		_this._setDtlsTransport(_this._iceTransport);
		return _this;
	}

	/**
  * Current ICE+DTLS connection state.
  * @return {RTCPeerConnectionState}
  */


	(0, _createClass3.default)(ortcRTCPeerConnection, [{
		key: 'addIceCandidate',


		/**
   * Adds a remote ICE candidate. Implements both the old callbacks based
   * signature and the new Promise based style.
   *
   * Arguments in Promise mode:
   * @param {RTCIceCandidate} candidate
   *
   * Arguments in callbacks mode:
   * @param {RTCIceCandidate} candidate
   * @param {function()} callback
   * @param {function(error)} errback
   */
		value: function addIceCandidate(candidate) {
			var usePromise = void 0;
			var callback = void 0;
			var errback = void 0;

			if (!candidate) {
				throw new TypeError('candidate missing');
			}

			if ((arguments.length <= 1 ? 0 : arguments.length - 1) === 0) {
				usePromise = true;
			} else {
				usePromise = false;
				callback = arguments.length <= 1 ? undefined : arguments[1];
				errback = arguments.length <= 2 ? undefined : arguments[2];

				if (typeof callback !== 'function') {
					throw new TypeError('callback missing');
				}

				if (typeof errback !== 'function') {
					throw new TypeError('errback missing');
				}
			}

			logger.debug('addIceCandidate() candidate:', candidate);

			if (usePromise) {
				return this._addIceCandidate(candidate);
			}

			this._addIceCandidate(candidate).then(function () {
				return callback();
			}).catch(function (error) {
				return errback(error);
			});
		}

		/**
   * Adds a local MediaStream.
   * @param {MediaStream} stream.
   * NOTE: Deprecated API.
   */

	}, {
		key: 'addStream',
		value: function addStream(stream) {
			logger.debug('addStream()');

			this._addStream(stream);
		}

		/**
   * Closes the RTCPeerConnection and all the underlying ORTC objects.
   */

	}, {
		key: 'close',
		value: function close() {
			if (this._closed) {
				return;
			}

			this._closed = true;

			logger.debug('close()');

			this._updateAndEmitSignalingStateChange(RTCSignalingState.closed);

			// Close RTCIceGatherer.
			// NOTE: Not yet implemented by Edge.
			try {
				this._iceGatherer.close();
			} catch (error) {
				logger.warn('iceGatherer.close() failed:' + error);
			}

			// Close RTCIceTransport.
			try {
				this._iceTransport.stop();
			} catch (error) {
				logger.warn('iceTransport.stop() failed:' + error);
			}

			// Close RTCDtlsTransport.
			try {
				this._dtlsTransport.stop();
			} catch (error) {
				logger.warn('dtlsTransport.stop() failed:' + error);
			}

			// Close and clear RTCRtpSenders.
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = (0, _getIterator3.default)(this._localTrackInfos.values()), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var info = _step.value;

					var rtpSender = info.rtpSender;

					try {
						rtpSender.stop();
					} catch (error) {
						logger.warn('rtpSender.stop() failed:' + error);
					}
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

			this._localTrackInfos.clear();

			// Close and clear RTCRtpReceivers.
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = (0, _getIterator3.default)(this._remoteTrackInfos.values()), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var _info = _step2.value;

					var rtpReceiver = _info.rtpReceiver;

					try {
						rtpReceiver.stop();
					} catch (error) {
						logger.warn('rtpReceiver.stop() failed:' + error);
					}
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

			this._remoteTrackInfos.clear();

			// Clear remote streams.
			this._remoteStreams.clear();
		}

		/**
   * Creates a local answer. Implements both the old callbacks based signature
   * and the new Promise based style.
   *
   * Arguments in Promise mode:
   * @param {RTCOfferOptions} [options]
   *
   * Arguments in callbacks mode:
   * @param {function(desc)} callback
   * @param {function(error)} errback
   * @param {MediaConstraints} [constraints]
   */

	}, {
		key: 'createAnswer',
		value: function createAnswer() {
			var usePromise = void 0;
			var options = void 0;
			var callback = void 0;
			var errback = void 0;

			if (arguments.length <= 1) {
				usePromise = true;
				options = arguments.length <= 0 ? undefined : arguments[0];
			} else {
				usePromise = false;
				callback = arguments.length <= 0 ? undefined : arguments[0];
				errback = arguments.length <= 1 ? undefined : arguments[1];
				options = arguments.length <= 2 ? undefined : arguments[2];

				if (typeof callback !== 'function') {
					throw new TypeError('callback missing');
				}

				if (typeof errback !== 'function') {
					throw new TypeError('errback missing');
				}
			}

			logger.debug('createAnswer() options:', options);

			if (usePromise) {
				return this._createAnswer(options);
			}

			this._createAnswer(options).then(function (desc) {
				return callback(desc);
			}).catch(function (error) {
				return errback(error);
			});
		}

		/**
   * Creates a RTCDataChannel.
   */

	}, {
		key: 'createDataChannel',
		value: function createDataChannel() {
			logger.debug('createDataChannel()');

			// NOTE: DataChannels not implemented in Edge.
			throw new Error('createDataChannel() not supported in Edge');
		}

		/**
   * Creates a local offer. Implements both the old callbacks based signature
   * and the new Promise based style.
   *
   * Arguments in Promise mode:
   * @param {RTCOfferOptions} [options]
   *
   * Arguments in callbacks mode:
   * @param {function(desc)} callback
   * @param {function(error)} errback
   * @param {MediaConstraints} [constraints]
   */

	}, {
		key: 'createOffer',
		value: function createOffer() {
			var usePromise = void 0;
			var options = void 0;
			var callback = void 0;
			var errback = void 0;

			if (arguments.length <= 1) {
				usePromise = true;
				options = arguments.length <= 0 ? undefined : arguments[0];
			} else {
				usePromise = false;
				callback = arguments.length <= 0 ? undefined : arguments[0];
				errback = arguments.length <= 1 ? undefined : arguments[1];
				options = arguments.length <= 2 ? undefined : arguments[2];

				if (typeof callback !== 'function') {
					throw new TypeError('callback missing');
				}

				if (typeof errback !== 'function') {
					throw new TypeError('errback missing');
				}
			}

			logger.debug('createOffer() options:', options);

			if (usePromise) {
				return this._createOffer(options);
			}

			this._createOffer(options).then(function (desc) {
				return callback(desc);
			}).catch(function (error) {
				return errback(error);
			});
		}

		/**
   * Gets a sequence of local MediaStreams.
   * @return {sequence<MediaStream>}
   */

	}, {
		key: 'getLocalStreams',
		value: function getLocalStreams() {
			return (0, _from2.default)(this._localTrackInfos.values()).map(function (info) {
				return info.stream;
			}).filter(function (elem, pos, arr) {
				return arr.indexOf(elem) === pos;
			});
		}

		/**
   * Gets a sequence of remote MediaStreams.
   * @return {sequence<MediaStream>}
   */

	}, {
		key: 'getRemoteStreams',
		value: function getRemoteStreams() {
			return (0, _from2.default)(this._remoteStreams.values());
		}

		/**
   * Get RTP statistics. Implements both the old callbacks based signature
   * and the new Promise based style.
   *
   * Arguments in Promise mode:
   * @param {MediaStreamTrack} [selector]
   *
   * Arguments in callbacks mode:
   * @param {MediaStreamTrack} [selector]
   * @param {function(desc)} callback
   * @param {function(error)} errback
   */

	}, {
		key: 'getStats',
		value: function getStats() {
			var usePromise = void 0;
			var selector = void 0;
			var callback = void 0;
			var errback = void 0;

			if (arguments.length <= 1) {
				usePromise = true;
				selector = arguments.length <= 0 ? undefined : arguments[0];
			} else {
				usePromise = false;

				if (arguments.length === 2) {
					callback = arguments.length <= 0 ? undefined : arguments[0];
					errback = arguments.length <= 1 ? undefined : arguments[1];
				} else {
					selector = arguments.length <= 0 ? undefined : arguments[0];
					callback = arguments.length <= 1 ? undefined : arguments[1];
					errback = arguments.length <= 2 ? undefined : arguments[2];
				}

				if (typeof callback !== 'function') {
					throw new TypeError('callback missing');
				}

				if (typeof errback !== 'function') {
					throw new TypeError('errback missing');
				}
			}

			logger.debug('getStats()');

			if (usePromise) {
				return this._getStats(selector);
			}

			this._getStats(selector).then(function (stats) {
				return callback(stats);
			}).catch(function (error) {
				return errback(error);
			});
		}

		/**
   * Removes a local MediaStream.
   * @param {MediaStream} stream.
   * NOTE: Deprecated API.
   */

	}, {
		key: 'removeStream',
		value: function removeStream(stream) {
			logger.debug('removeStream()');

			this._removeStream(stream);
		}

		/**
   * Applies a local description. Implements both the old callbacks based
   * signature and the new Promise based style.
   *
   * Arguments in Promise mode:
   * @param {RTCSessionDescriptionInit} desc
   *
   * Arguments in callbacks mode:
   * @param {RTCSessionDescription} desc
   * @param {function()} callback
   * @param {function(error)} errback
   */

	}, {
		key: 'setLocalDescription',
		value: function setLocalDescription(desc) {
			var usePromise = void 0;
			var callback = void 0;
			var errback = void 0;

			if (!desc) {
				throw new TypeError('description missing');
			}

			if ((arguments.length <= 1 ? 0 : arguments.length - 1) === 0) {
				usePromise = true;
			} else {
				usePromise = false;
				callback = arguments.length <= 1 ? undefined : arguments[1];
				errback = arguments.length <= 2 ? undefined : arguments[2];

				if (typeof callback !== 'function') {
					throw new TypeError('callback missing');
				}

				if (typeof errback !== 'function') {
					throw new TypeError('errback missing');
				}
			}

			logger.debug('setLocalDescription() desc:', desc);

			if (usePromise) {
				return this._setLocalDescription(desc);
			}

			this._setLocalDescription(desc).then(function () {
				return callback();
			}).catch(function (error) {
				return errback(error);
			});
		}

		/**
   * Applies a remote description. Implements both the old callbacks based
   * signature and the new Promise based style.
   *
   * Arguments in Promise mode:
   * @param {RTCSessionDescriptionInit} desc
   *
   * Arguments in callbacks mode:
   * @param {RTCSessionDescription} desc
   * @param {function()} callback
   * @param {function(error)} errback
   */

	}, {
		key: 'setRemoteDescription',
		value: function setRemoteDescription(desc) {
			var usePromise = void 0;
			var callback = void 0;
			var errback = void 0;

			if (!desc) {
				throw new TypeError('description missing');
			}

			if ((arguments.length <= 1 ? 0 : arguments.length - 1) === 0) {
				usePromise = true;
			} else {
				usePromise = false;
				callback = arguments.length <= 1 ? undefined : arguments[1];
				errback = arguments.length <= 2 ? undefined : arguments[2];

				if (typeof callback !== 'function') {
					throw new TypeError('callback missing');
				}

				if (typeof errback !== 'function') {
					throw new TypeError('errback missing');
				}
			}

			logger.debug('setRemoteDescription() desc:', desc);

			if (usePromise) {
				return this._setRemoteDescription(desc);
			}

			this._setRemoteDescription(desc).then(function () {
				return callback();
			}).catch(function (error) {
				return errback(error);
			});
		}

		/**
   * Promise based implementation for addIceCandidate().
   * @return {Promise}
   * @private
   */

	}, {
		key: '_addIceCandidate',
		value: function _addIceCandidate(candidate) {
			// eslint-disable-line no-unused-vars
			if (this._closed) {
				return _promise2.default.reject(new _errors.InvalidStateError('RTCPeerConnection closed'));
			}

			// NOTE: Edge does not support Trickle-ICE so just candidates in the
			// remote SDP are applied. Candidates given later would be just
			// ignored, so notify the called about that.
			return _promise2.default.reject(new Error('addIceCandidate() not supported'));
		}

		/**
   * Implementation for addStream().
   * @private
   */

	}, {
		key: '_addStream',
		value: function _addStream(stream) {
			if (this._closed) {
				throw new _errors.InvalidStateError('RTCPeerConnection closed');
			}

			// Create a RTCRtpSender for each track.
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = (0, _getIterator3.default)(stream.getTracks()), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var track = _step3.value;

					// Ignore if ended.
					if (track.readyState === 'ended') {
						logger.warn('ignoring ended MediaStreamTrack');

						continue;
					}

					// Ignore if track is already present.
					if (this._localTrackInfos.has(track.id)) {
						logger.warn('ignoring already handled MediaStreamTrack');

						continue;
					}

					var rtpSender = new RTCRtpSender(track, this._dtlsTransport);

					// Store it in the map.
					this._localTrackInfos.set(track.id, {
						rtpSender: rtpSender,
						stream: stream
					});
				}

				// Check for local tracks removal.
			} catch (err) {
				_didIteratorError3 = true;
				_iteratorError3 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion3 && _iterator3.return) {
						_iterator3.return();
					}
				} finally {
					if (_didIteratorError3) {
						throw _iteratorError3;
					}
				}
			}

			var _iteratorNormalCompletion4 = true;
			var _didIteratorError4 = false;
			var _iteratorError4 = undefined;

			try {
				for (var _iterator4 = (0, _getIterator3.default)(this._localTrackInfos), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
					var _step4$value = (0, _slicedToArray3.default)(_step4.value, 2),
					    trackId = _step4$value[0],
					    info = _step4$value[1];

					var _track = info.rtpSender.track;

					// Check if any of the local tracks has been stopped.
					if (_track.readyState === 'ended') {
						logger.debug('_addStream() an already handled track was stopped, track.id:' + _track.id);

						try {
							info.rtpSender.stop();
						} catch (error) {
							logger.warn('rtpSender.stop() failed:' + error);
						}

						// Remove from the map.
						this._localTrackInfos.delete(_track.id);

						// Also, if the stream was already handled, check whether tracks
						// have been removed via stream.removeTrack() and, if so, stop
						// their RtpSenders.
					} else if (info.stream === stream && !stream.getTrackById(trackId)) {
						logger.debug('_addStream() a track in this stream was removed, track.id:' + trackId);

						try {
							info.rtpSender.stop();
						} catch (error) {
							logger.warn('rtpSender.stop() failed:' + error);
						}

						// Remove from the map.
						this._localTrackInfos.delete(_track.id);
					}
				}

				// It may need to renegotiate.
			} catch (err) {
				_didIteratorError4 = true;
				_iteratorError4 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion4 && _iterator4.return) {
						_iterator4.return();
					}
				} finally {
					if (_didIteratorError4) {
						throw _iteratorError4;
					}
				}
			}

			this._emitNegotiationNeeded();
		}

		/**
   * Promise based implementation for createAnswer().
   * @returns {Promise}
   * @private
   */

	}, {
		key: '_createAnswer',
		value: function _createAnswer(options) {
			// eslint-disable-line no-unused-vars
			if (this._closed) {
				return _promise2.default.reject(new _errors.InvalidStateError('RTCPeerConnection closed'));
			}

			if (this.signalingState !== RTCSignalingState.haveRemoteOffer) {
				return _promise2.default.reject(new _errors.InvalidStateError('invalid signalingState "' + this.signalingState + '"'));
			}

			// Create an answer.
			var localDescription = this._createLocalDescription('answer');

			// Resolve with it.
			return _promise2.default.resolve(localDescription);
		}

		/**
   * Creates the local RTCSessionDescription.
   * @param {String} type - 'offer' / 'answer'.
   * @return {RTCSessionDescription}
   */

	}, {
		key: '_createLocalDescription',
		value: function _createLocalDescription(type) {
			var sdpObject = {};
			var localIceParameters = this._iceGatherer.getLocalParameters();
			var localIceCandidates = this._iceGatherer.getLocalCandidates();
			var localDtlsParameters = this._dtlsTransport.getLocalParameters();
			var remoteDtlsParameters = this._dtlsTransport.getRemoteParameters();
			var localCapabilities = this._localCapabilities;
			var localTrackInfos = this._localTrackInfos;

			// Increase SDP version if an offer.
			if (type === 'offer') {
				this._sdpGlobalFields.version++;
			}

			// SDP global fields.
			sdpObject.version = 0;
			sdpObject.origin = {
				address: '127.0.0.1',
				ipVer: 4,
				netType: 'IN',
				sessionId: this._sdpGlobalFields.id,
				sessionVersion: this._sdpGlobalFields.version,
				username: 'jitsi-ortc-webrtc-shim'
			};
			sdpObject.name = '-';
			sdpObject.timing = {
				start: 0,
				stop: 0
			};
			sdpObject.msidSemantic = {
				semantic: 'WMS',
				token: '*'
			};
			sdpObject.groups = [{
				mids: (0, _from2.default)(this._mids.keys()).join(' '),
				type: 'BUNDLE'
			}];
			sdpObject.media = [];

			// DTLS fingerprint.
			sdpObject.fingerprint = {
				hash: localDtlsParameters.fingerprints[0].value,
				type: localDtlsParameters.fingerprints[0].algorithm
			};

			// Let's check whether there is video RTX.
			var hasVideoRtx = false;

			var _iteratorNormalCompletion5 = true;
			var _didIteratorError5 = false;
			var _iteratorError5 = undefined;

			try {
				for (var _iterator5 = (0, _getIterator3.default)(localCapabilities.codecs), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
					var codec = _step5.value;

					if (codec.kind === 'video' && codec.name === 'rtx') {
						hasVideoRtx = true;
						break;
					}
				}

				// Add m= sections.
			} catch (err) {
				_didIteratorError5 = true;
				_iteratorError5 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion5 && _iterator5.return) {
						_iterator5.return();
					}
				} finally {
					if (_didIteratorError5) {
						throw _iteratorError5;
					}
				}
			}

			var _iteratorNormalCompletion6 = true;
			var _didIteratorError6 = false;
			var _iteratorError6 = undefined;

			try {
				for (var _iterator6 = (0, _getIterator3.default)(this._mids), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
					var _step6$value = (0, _slicedToArray3.default)(_step6.value, 2),
					    mid = _step6$value[0],
					    kind = _step6$value[1];

					addMediaSection.call(this, mid, kind);
				}

				// Create a RTCSessionDescription.
			} catch (err) {
				_didIteratorError6 = true;
				_iteratorError6 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion6 && _iterator6.return) {
						_iterator6.return();
					}
				} finally {
					if (_didIteratorError6) {
						throw _iteratorError6;
					}
				}
			}

			var localDescription = new _RTCSessionDescription2.default({
				type: type,
				_sdpObject: sdpObject
			});

			logger.debug('_createLocalDescription():', localDescription);

			return localDescription;

			/**
    * Add a m= section.
    */
			function addMediaSection(mid, kind) {
				var mediaObject = {};

				// m= line.
				mediaObject.type = kind;

				switch (kind) {
					case 'audio':
					case 'video':
						mediaObject.protocol = 'RTP/SAVPF';
						mediaObject.port = 9;
						mediaObject.direction = 'sendrecv';
						break;
					case 'application':
						mediaObject.protocol = 'DTLS/SCTP';
						mediaObject.port = 0; // Reject m section.
						mediaObject.payloads = '0'; // Just put something.
						mediaObject.direction = 'inactive';
						break;
				}

				// c= line.
				mediaObject.connection = {
					ip: '127.0.0.1',
					version: 4
				};

				// a=mid attribute.
				mediaObject.mid = mid;

				// ICE.
				mediaObject.iceUfrag = localIceParameters.usernameFragment;
				mediaObject.icePwd = localIceParameters.password;
				mediaObject.candidates = [];

				var _iteratorNormalCompletion7 = true;
				var _didIteratorError7 = false;
				var _iteratorError7 = undefined;

				try {
					for (var _iterator7 = (0, _getIterator3.default)(localIceCandidates), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
						var candidate = _step7.value;

						var candidateObject = {};

						// rtcp-mux is assumed, so component is always 1 (RTP).
						candidateObject.component = 1;
						candidateObject.foundation = candidate.foundation;
						candidateObject.ip = candidate.ip;
						candidateObject.port = candidate.port;
						candidateObject.priority = candidate.priority;
						candidateObject.transport = candidate.protocol.toLowerCase();
						candidateObject.type = candidate.type;
						if (candidateObject.transport === 'tcp') {
							candidateObject.tcptype = candidate.tcpType;
						}

						mediaObject.candidates.push(candidateObject);
					}
				} catch (err) {
					_didIteratorError7 = true;
					_iteratorError7 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion7 && _iterator7.return) {
							_iterator7.return();
						}
					} finally {
						if (_didIteratorError7) {
							throw _iteratorError7;
						}
					}
				}

				mediaObject.endOfCandidates = 'end-of-candidates';

				// DTLS.
				// If 'offer' always use 'actpass'.
				if (type === 'offer') {
					mediaObject.setup = 'actpass';
				} else {
					mediaObject.setup = remoteDtlsParameters.role === 'server' ? 'active' : 'passive';
				}

				if (kind === 'audio' || kind === 'video') {
					mediaObject.rtp = [];
					mediaObject.rtcpFb = [];
					mediaObject.fmtp = [];

					// Array of payload types.
					var payloads = [];

					// Add codecs.
					var _iteratorNormalCompletion8 = true;
					var _didIteratorError8 = false;
					var _iteratorError8 = undefined;

					try {
						for (var _iterator8 = (0, _getIterator3.default)(localCapabilities.codecs), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
							var codec = _step8.value;

							if (codec.kind && codec.kind !== kind) continue;

							payloads.push(codec.preferredPayloadType);

							var rtpObject = {
								codec: codec.name,
								payload: codec.preferredPayloadType,
								rate: codec.clockRate
							};

							if (codec.numChannels > 1) {
								rtpObject.encoding = codec.numChannels;
							}

							mediaObject.rtp.push(rtpObject);

							// If codec has parameters add them into a=fmtp attributes.
							if (codec.parameters) {
								var paramFmtp = {
									config: '',
									payload: codec.preferredPayloadType
								};

								var _iteratorNormalCompletion11 = true;
								var _didIteratorError11 = false;
								var _iteratorError11 = undefined;

								try {
									for (var _iterator11 = (0, _getIterator3.default)((0, _keys2.default)(codec.parameters)), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
										var name = _step11.value;

										/* eslint-disable max-depth */
										if (paramFmtp.config) {
											paramFmtp.config += ';';
										}
										/* eslint-enable max-depth */

										paramFmtp.config += name + '=' + codec.parameters[name];
									}
								} catch (err) {
									_didIteratorError11 = true;
									_iteratorError11 = err;
								} finally {
									try {
										if (!_iteratorNormalCompletion11 && _iterator11.return) {
											_iterator11.return();
										}
									} finally {
										if (_didIteratorError11) {
											throw _iteratorError11;
										}
									}
								}

								if (paramFmtp.config) {
									mediaObject.fmtp.push(paramFmtp);
								}
							}

							// Set RTCP feedback.
							var _iteratorNormalCompletion12 = true;
							var _didIteratorError12 = false;
							var _iteratorError12 = undefined;

							try {
								for (var _iterator12 = (0, _getIterator3.default)(codec.rtcpFeedback || []), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
									var fb = _step12.value;

									mediaObject.rtcpFb.push({
										payload: codec.preferredPayloadType,
										subtype: fb.parameter || undefined,
										type: fb.type
									});
								}
							} catch (err) {
								_didIteratorError12 = true;
								_iteratorError12 = err;
							} finally {
								try {
									if (!_iteratorNormalCompletion12 && _iterator12.return) {
										_iterator12.return();
									}
								} finally {
									if (_didIteratorError12) {
										throw _iteratorError12;
									}
								}
							}
						}

						// If there are no codecs, set this m section as unavailable.
					} catch (err) {
						_didIteratorError8 = true;
						_iteratorError8 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion8 && _iterator8.return) {
								_iterator8.return();
							}
						} finally {
							if (_didIteratorError8) {
								throw _iteratorError8;
							}
						}
					}

					if (payloads.length === 0) {
						mediaObject.payloads = '9'; // Just put something.
						mediaObject.port = 0;
						mediaObject.direction = 'inactive';
					} else {
						mediaObject.payloads = payloads.join(' ');
					}

					// SSRCs.
					mediaObject.ssrcs = [];
					mediaObject.ssrcGroups = [];

					// Add RTP sending stuff.
					var _iteratorNormalCompletion9 = true;
					var _didIteratorError9 = false;
					var _iteratorError9 = undefined;

					try {
						for (var _iterator9 = (0, _getIterator3.default)(localTrackInfos.values()), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
							var info = _step9.value;

							var rtpSender = info.rtpSender;
							var streamId = info.stream.id;
							var track = rtpSender.track;

							// Ignore if ended.
							if (track.readyState === 'ended') continue;

							if (track.kind !== kind) continue;

							// Set a random provisional SSRC if not set.
							if (!info.ssrc) {
								info.ssrc = utils.randomNumber();
							}

							// Whether RTX should be enabled.
							var enableRtx = hasVideoRtx && track.kind === 'video';

							// Set a random provisional RTX SSRC if not set.
							if (enableRtx && !info.rtxSsrc) {
								info.rtxSsrc = info.ssrc + 1;
							}

							mediaObject.ssrcs.push({
								attribute: 'cname',
								id: info.ssrc,
								value: CNAME
							});

							mediaObject.ssrcs.push({
								attribute: 'msid',
								id: info.ssrc,
								value: streamId + ' ' + track.id
							});

							mediaObject.ssrcs.push({
								attribute: 'mslabel',
								id: info.ssrc,
								value: streamId
							});

							mediaObject.ssrcs.push({
								attribute: 'label',
								id: info.ssrc,
								value: track.id
							});

							if (enableRtx) {
								mediaObject.ssrcs.push({
									attribute: 'cname',
									id: info.rtxSsrc,
									value: CNAME
								});

								mediaObject.ssrcs.push({
									attribute: 'msid',
									id: info.rtxSsrc,
									value: streamId + ' ' + track.id
								});

								mediaObject.ssrcs.push({
									attribute: 'mslabel',
									id: info.rtxSsrc,
									value: streamId
								});

								mediaObject.ssrcs.push({
									attribute: 'label',
									id: info.rtxSsrc,
									value: track.id
								});

								mediaObject.ssrcGroups.push({
									semantics: 'FID',
									ssrcs: info.ssrc + ' ' + info.rtxSsrc
								});
							}
						}

						// RTP header extensions.
					} catch (err) {
						_didIteratorError9 = true;
						_iteratorError9 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion9 && _iterator9.return) {
								_iterator9.return();
							}
						} finally {
							if (_didIteratorError9) {
								throw _iteratorError9;
							}
						}
					}

					mediaObject.ext = [];

					var _iteratorNormalCompletion10 = true;
					var _didIteratorError10 = false;
					var _iteratorError10 = undefined;

					try {
						for (var _iterator10 = (0, _getIterator3.default)(localCapabilities.headerExtensions), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
							var extension = _step10.value;

							if (extension.kind && extension.kind !== kind) continue;

							mediaObject.ext.push({
								value: extension.preferredId,
								uri: extension.uri
							});
						}

						// a=rtcp-mux attribute.
					} catch (err) {
						_didIteratorError10 = true;
						_iteratorError10 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion10 && _iterator10.return) {
								_iterator10.return();
							}
						} finally {
							if (_didIteratorError10) {
								throw _iteratorError10;
							}
						}
					}

					mediaObject.rtcpMux = 'rtcp-mux';

					// a=rtcp-rsize.
					mediaObject.rtcpRsize = 'rtcp-rsize';
				}

				// Add the media section.
				sdpObject.media.push(mediaObject);
			}
		}

		/**
   * Promise based implementation for createOffer().
   * @returns {Promise}
   * @private
   */

	}, {
		key: '_createOffer',
		value: function _createOffer(options) {
			// eslint-disable-line no-unused-vars
			if (this._closed) {
				return _promise2.default.reject(new _errors.InvalidStateError('RTCPeerConnection closed'));
			}

			if (this.signalingState !== RTCSignalingState.stable) {
				return _promise2.default.reject(new _errors.InvalidStateError('invalid signalingState "' + this.signalingState + '"'));
			}

			// NOTE: P2P mode not yet supported, so createOffer() should never be
			// called.
			// return Promise.reject(new Error('createoOffer() not yet supported'));

			// HACK: Create an offer assuming this is called before any
			// setRemoteDescription() and assuming that setLocalDescription()
			// wont be called with this offer.

			var sdpObject = {};
			var localIceParameters = this._iceGatherer.getLocalParameters();
			var localIceCandidates = this._iceGatherer.getLocalCandidates();
			var localDtlsParameters = this._dtlsTransport.getLocalParameters();
			var localCapabilities = RTCRtpReceiver.getCapabilities();
			var localTrackInfos = this._localTrackInfos;
			var mids = new _map2.default([['audio', 'audio'], ['video', 'video']]);

			// SDP global fields.
			sdpObject.version = 0;
			sdpObject.origin = {
				address: '127.0.0.1',
				ipVer: 4,
				netType: 'IN',
				sessionId: this._sdpGlobalFields.id,
				sessionVersion: this._sdpGlobalFields.version,
				username: 'jitsi-ortc-webrtc-shim'
			};
			sdpObject.name = '-';
			sdpObject.timing = {
				start: 0,
				stop: 0
			};
			sdpObject.msidSemantic = {
				semantic: 'WMS',
				token: '*'
			};
			sdpObject.groups = [{
				mids: (0, _from2.default)(mids.keys()).join(' '),
				type: 'BUNDLE'
			}];
			sdpObject.media = [];

			// DTLS fingerprint.
			sdpObject.fingerprint = {
				hash: localDtlsParameters.fingerprints[0].value,
				type: localDtlsParameters.fingerprints[0].algorithm
			};

			// Let's check whether there is video RTX.
			var hasVideoRtx = false;

			var _iteratorNormalCompletion13 = true;
			var _didIteratorError13 = false;
			var _iteratorError13 = undefined;

			try {
				for (var _iterator13 = (0, _getIterator3.default)(localCapabilities.codecs), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
					var codec = _step13.value;

					if (codec.kind === 'video' && codec.name === 'rtx') {
						hasVideoRtx = true;
						break;
					}
				}

				// Add m= sections.
			} catch (err) {
				_didIteratorError13 = true;
				_iteratorError13 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion13 && _iterator13.return) {
						_iterator13.return();
					}
				} finally {
					if (_didIteratorError13) {
						throw _iteratorError13;
					}
				}
			}

			var _iteratorNormalCompletion14 = true;
			var _didIteratorError14 = false;
			var _iteratorError14 = undefined;

			try {
				for (var _iterator14 = (0, _getIterator3.default)(mids), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
					var _step14$value = (0, _slicedToArray3.default)(_step14.value, 2),
					    mid = _step14$value[0],
					    kind = _step14$value[1];

					addMediaSection.call(this, mid, kind);
				}

				// Create a RTCSessionDescription.
			} catch (err) {
				_didIteratorError14 = true;
				_iteratorError14 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion14 && _iterator14.return) {
						_iterator14.return();
					}
				} finally {
					if (_didIteratorError14) {
						throw _iteratorError14;
					}
				}
			}

			var localDescription = new _RTCSessionDescription2.default({
				type: 'offer',
				_sdpObject: sdpObject
			});

			logger.debug('_createLocalDescription():', localDescription);

			// Resolve with it.
			return _promise2.default.resolve(localDescription);

			/**
    * Add a m= section.
    */
			function addMediaSection(mid, kind) {
				var mediaObject = {};

				// m= line.
				mediaObject.type = kind;

				switch (kind) {
					case 'audio':
					case 'video':
						mediaObject.protocol = 'RTP/SAVPF';
						mediaObject.port = 9;
						mediaObject.direction = 'sendrecv';
						break;
					case 'application':
						mediaObject.protocol = 'DTLS/SCTP';
						mediaObject.port = 0; // Reject m section.
						mediaObject.payloads = '0'; // Just put something.
						mediaObject.direction = 'inactive';
						break;
				}

				// c= line.
				mediaObject.connection = {
					ip: '127.0.0.1',
					version: 4
				};

				// a=mid attribute.
				mediaObject.mid = mid;

				// ICE.
				mediaObject.iceUfrag = localIceParameters.usernameFragment;
				mediaObject.icePwd = localIceParameters.password;
				mediaObject.candidates = [];

				var _iteratorNormalCompletion15 = true;
				var _didIteratorError15 = false;
				var _iteratorError15 = undefined;

				try {
					for (var _iterator15 = (0, _getIterator3.default)(localIceCandidates), _step15; !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done); _iteratorNormalCompletion15 = true) {
						var candidate = _step15.value;

						var candidateObject = {};

						// rtcp-mux is assumed, so component is always 1 (RTP).
						candidateObject.component = 1;
						candidateObject.foundation = candidate.foundation;
						candidateObject.ip = candidate.ip;
						candidateObject.port = candidate.port;
						candidateObject.priority = candidate.priority;
						candidateObject.transport = candidate.protocol.toLowerCase();
						candidateObject.type = candidate.type;
						if (candidateObject.transport === 'tcp') {
							candidateObject.tcptype = candidate.tcpType;
						}

						mediaObject.candidates.push(candidateObject);
					}
				} catch (err) {
					_didIteratorError15 = true;
					_iteratorError15 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion15 && _iterator15.return) {
							_iterator15.return();
						}
					} finally {
						if (_didIteratorError15) {
							throw _iteratorError15;
						}
					}
				}

				mediaObject.endOfCandidates = 'end-of-candidates';

				// DTLS.
				// 'offer' so always use 'actpass'.
				mediaObject.setup = 'actpass';

				if (kind === 'audio' || kind === 'video') {
					mediaObject.rtp = [];
					mediaObject.rtcpFb = [];
					mediaObject.fmtp = [];

					// Array of payload types.
					var payloads = [];

					// Add codecs.
					var _iteratorNormalCompletion16 = true;
					var _didIteratorError16 = false;
					var _iteratorError16 = undefined;

					try {
						for (var _iterator16 = (0, _getIterator3.default)(localCapabilities.codecs), _step16; !(_iteratorNormalCompletion16 = (_step16 = _iterator16.next()).done); _iteratorNormalCompletion16 = true) {
							var codec = _step16.value;

							if (codec.kind && codec.kind !== kind) continue;

							payloads.push(codec.preferredPayloadType);

							var rtpObject = {
								codec: codec.name,
								payload: codec.preferredPayloadType,
								rate: codec.clockRate
							};

							if (codec.numChannels > 1) {
								rtpObject.encoding = codec.numChannels;
							}

							mediaObject.rtp.push(rtpObject);

							// If codec has parameters add them into a=fmtp attributes.
							if (codec.parameters) {
								var paramFmtp = {
									config: '',
									payload: codec.preferredPayloadType
								};

								var _iteratorNormalCompletion19 = true;
								var _didIteratorError19 = false;
								var _iteratorError19 = undefined;

								try {
									for (var _iterator19 = (0, _getIterator3.default)((0, _keys2.default)(codec.parameters)), _step19; !(_iteratorNormalCompletion19 = (_step19 = _iterator19.next()).done); _iteratorNormalCompletion19 = true) {
										var name = _step19.value;

										/* eslint-disable max-depth */
										if (paramFmtp.config) {
											paramFmtp.config += ';';
										}
										/* eslint-enable max-depth */

										paramFmtp.config += name + '=' + codec.parameters[name];
									}
								} catch (err) {
									_didIteratorError19 = true;
									_iteratorError19 = err;
								} finally {
									try {
										if (!_iteratorNormalCompletion19 && _iterator19.return) {
											_iterator19.return();
										}
									} finally {
										if (_didIteratorError19) {
											throw _iteratorError19;
										}
									}
								}

								if (paramFmtp.config) {
									mediaObject.fmtp.push(paramFmtp);
								}
							}

							// Set RTCP feedback.
							var _iteratorNormalCompletion20 = true;
							var _didIteratorError20 = false;
							var _iteratorError20 = undefined;

							try {
								for (var _iterator20 = (0, _getIterator3.default)(codec.rtcpFeedback || []), _step20; !(_iteratorNormalCompletion20 = (_step20 = _iterator20.next()).done); _iteratorNormalCompletion20 = true) {
									var fb = _step20.value;

									mediaObject.rtcpFb.push({
										payload: codec.preferredPayloadType,
										subtype: fb.parameter || undefined,
										type: fb.type
									});
								}
							} catch (err) {
								_didIteratorError20 = true;
								_iteratorError20 = err;
							} finally {
								try {
									if (!_iteratorNormalCompletion20 && _iterator20.return) {
										_iterator20.return();
									}
								} finally {
									if (_didIteratorError20) {
										throw _iteratorError20;
									}
								}
							}
						}

						// If there are no codecs, set this m section as unavailable.
					} catch (err) {
						_didIteratorError16 = true;
						_iteratorError16 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion16 && _iterator16.return) {
								_iterator16.return();
							}
						} finally {
							if (_didIteratorError16) {
								throw _iteratorError16;
							}
						}
					}

					if (payloads.length === 0) {
						mediaObject.payloads = '9'; // Just put something.
						mediaObject.port = 0;
						mediaObject.direction = 'inactive';
					} else {
						mediaObject.payloads = payloads.join(' ');
					}

					// SSRCs.
					mediaObject.ssrcs = [];
					mediaObject.ssrcGroups = [];

					// Add RTP sending stuff.
					var _iteratorNormalCompletion17 = true;
					var _didIteratorError17 = false;
					var _iteratorError17 = undefined;

					try {
						for (var _iterator17 = (0, _getIterator3.default)(localTrackInfos.values()), _step17; !(_iteratorNormalCompletion17 = (_step17 = _iterator17.next()).done); _iteratorNormalCompletion17 = true) {
							var info = _step17.value;

							var rtpSender = info.rtpSender;
							var streamId = info.stream.id;
							var track = rtpSender.track;

							// Ignore if ended.
							if (track.readyState === 'ended') continue;

							if (track.kind !== kind) continue;

							// Set a random provisional SSRC if not set.
							if (!info.ssrc) {
								info.ssrc = utils.randomNumber();
							}

							// Whether RTX should be enabled.
							var enableRtx = hasVideoRtx && track.kind === 'video';

							// Set a random provisional RTX SSRC if not set.
							if (enableRtx && !info.rtxSsrc) {
								info.rtxSsrc = info.ssrc + 1;
							}

							mediaObject.ssrcs.push({
								attribute: 'cname',
								id: info.ssrc,
								value: CNAME
							});

							mediaObject.ssrcs.push({
								attribute: 'msid',
								id: info.ssrc,
								value: streamId + ' ' + track.id
							});

							mediaObject.ssrcs.push({
								attribute: 'mslabel',
								id: info.ssrc,
								value: streamId
							});

							mediaObject.ssrcs.push({
								attribute: 'label',
								id: info.ssrc,
								value: track.id
							});

							if (enableRtx) {
								mediaObject.ssrcs.push({
									attribute: 'cname',
									id: info.rtxSsrc,
									value: CNAME
								});

								mediaObject.ssrcs.push({
									attribute: 'msid',
									id: info.rtxSsrc,
									value: streamId + ' ' + track.id
								});

								mediaObject.ssrcs.push({
									attribute: 'mslabel',
									id: info.rtxSsrc,
									value: streamId
								});

								mediaObject.ssrcs.push({
									attribute: 'label',
									id: info.rtxSsrc,
									value: track.id
								});

								mediaObject.ssrcGroups.push({
									semantics: 'FID',
									ssrcs: info.ssrc + ' ' + info.rtxSsrc
								});
							}
						}

						// RTP header extensions.
					} catch (err) {
						_didIteratorError17 = true;
						_iteratorError17 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion17 && _iterator17.return) {
								_iterator17.return();
							}
						} finally {
							if (_didIteratorError17) {
								throw _iteratorError17;
							}
						}
					}

					mediaObject.ext = [];

					var _iteratorNormalCompletion18 = true;
					var _didIteratorError18 = false;
					var _iteratorError18 = undefined;

					try {
						for (var _iterator18 = (0, _getIterator3.default)(localCapabilities.headerExtensions), _step18; !(_iteratorNormalCompletion18 = (_step18 = _iterator18.next()).done); _iteratorNormalCompletion18 = true) {
							var extension = _step18.value;

							if (extension.kind && extension.kind !== kind) continue;

							mediaObject.ext.push({
								value: extension.preferredId,
								uri: extension.uri
							});
						}

						// a=rtcp-mux attribute.
					} catch (err) {
						_didIteratorError18 = true;
						_iteratorError18 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion18 && _iterator18.return) {
								_iterator18.return();
							}
						} finally {
							if (_didIteratorError18) {
								throw _iteratorError18;
							}
						}
					}

					mediaObject.rtcpMux = 'rtcp-mux';

					// a=rtcp-rsize.
					mediaObject.rtcpRsize = 'rtcp-rsize';
				}

				// Add the media section.
				sdpObject.media.push(mediaObject);
			}
		}

		/**
   * Emit 'addstream' event.
   * @private
   */

	}, {
		key: '_emitAddStream',
		value: function _emitAddStream(stream) {
			if (this._closed) {
				return;
			}

			logger.debug('emitting "addstream"');

			var event = new _yaeti2.default.Event('addstream');

			event.stream = stream;
			this.dispatchEvent(event);
		}

		/**
   * May emit buffered ICE candidates.
   * @private
   */

	}, {
		key: '_emitBufferedIceCandidates',
		value: function _emitBufferedIceCandidates() {
			if (this._closed) {
				return;
			}

			var _iteratorNormalCompletion21 = true;
			var _didIteratorError21 = false;
			var _iteratorError21 = undefined;

			try {
				for (var _iterator21 = (0, _getIterator3.default)(this._bufferedIceCandidates), _step21; !(_iteratorNormalCompletion21 = (_step21 = _iterator21.next()).done); _iteratorNormalCompletion21 = true) {
					var sdpCandidate = _step21.value;

					if (!sdpCandidate) continue;

					// Now we have set the MID values of the SDP O/A, so let's fill the
					// sdpMIndex of the candidate.
					sdpCandidate.sdpMIndex = this._mids.keys().next().value;

					logger.debug('emitting buffered "icecandidate", candidate:', sdpCandidate);

					var event = new _yaeti2.default.Event('icecandidate');

					event.candidate = sdpCandidate;
					this.dispatchEvent(event);
				}
			} catch (err) {
				_didIteratorError21 = true;
				_iteratorError21 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion21 && _iterator21.return) {
						_iterator21.return();
					}
				} finally {
					if (_didIteratorError21) {
						throw _iteratorError21;
					}
				}
			}

			this._bufferedIceCandidates = [];
		}

		/**
   * May emit 'connectionstatechange' event.
   * @private
   */

	}, {
		key: '_emitConnectionStateChange',
		value: function _emitConnectionStateChange() {
			if (this._closed && this.connectionState !== 'closed') {
				return;
			}

			logger.debug('emitting "connectionstatechange", connectionState:', this.connectionState);

			var event = new _yaeti2.default.Event('connectionstatechange');

			this.dispatchEvent(event);
		}

		/**
   * May emit 'icecandidate' event.
   * @private
   */

	}, {
		key: '_emitIceCandidate',
		value: function _emitIceCandidate(candidate) {
			if (this._closed) {
				return;
			}

			var sdpCandidate = null;

			if (candidate) {
				// NOTE: We assume BUNDLE so let's just emit candidates for the
				// first m= section.
				var sdpMIndex = this._mids.keys().next().value;
				var sdpMLineIndex = 0;
				var sdpAttribute = 'candidate:' + candidate.foundation + ' 1 ' + candidate.protocol + (' ' + candidate.priority + ' ' + candidate.ip + ' ' + candidate.port) + (' typ ' + candidate.type);

				if (candidate.relatedAddress) {
					sdpAttribute += ' raddr ' + candidate.relatedAddress;
				}
				if (candidate.relatedPort) {
					sdpAttribute += ' rport ' + candidate.relatedPort;
				}
				if (candidate.protocol === 'tcp') {
					sdpAttribute += ' tcptype ' + candidate.tcpType;
				}

				sdpCandidate = {
					candidate: sdpAttribute,
					component: 1, // rtcp-mux assumed, so always 1 (RTP).
					foundation: candidate.foundation,
					ip: candidate.ip,
					port: candidate.port,
					priority: candidate.priority,
					protocol: candidate.protocol,
					type: candidate.type,
					sdpMIndex: sdpMIndex,
					sdpMLineIndex: sdpMLineIndex
				};

				if (candidate.protocol === 'tcp') {
					sdpCandidate.tcptype = candidate.tcpType;
				}
				if (candidate.relatedAddress) {
					sdpCandidate.relatedAddress = candidate.relatedAddress;
				}
				if (candidate.relatedPort) {
					sdpCandidate.relatedPort = candidate.relatedPort;
				}
			}

			// If we don't have yet a local description, buffer the candidate.
			if (this._localDescription) {
				logger.debug('emitting "icecandidate", candidate:', sdpCandidate);

				var event = new _yaeti2.default.Event('icecandidate');

				event.candidate = sdpCandidate;
				this.dispatchEvent(event);
			} else {
				logger.debug('buffering gathered ICE candidate:', sdpCandidate);

				this._bufferedIceCandidates.push(sdpCandidate);
			}
		}

		/**
   * May emit 'iceconnectionstatechange' event.
   * @private
   */

	}, {
		key: '_emitIceConnectionStateChange',
		value: function _emitIceConnectionStateChange() {
			if (this._closed && this.iceConnectionState !== 'closed') {
				return;
			}

			logger.debug('emitting "iceconnectionstatechange", iceConnectionState:', this.iceConnectionState);

			var event = new _yaeti2.default.Event('iceconnectionstatechange');

			this.dispatchEvent(event);
		}

		/**
   * May emit 'negotiationneeded' event.
   * @private
   */

	}, {
		key: '_emitNegotiationNeeded',
		value: function _emitNegotiationNeeded() {
			// Ignore if signalingState is not 'stable'.
			if (this.signalingState !== RTCSignalingState.stable) {
				return;
			}

			logger.debug('emitting "negotiationneeded"');

			var event = new _yaeti2.default.Event('negotiationneeded');

			this.dispatchEvent(event);
		}

		/**
   * Emit 'removestream' event.
   * @private
   */

	}, {
		key: '_emitRemoveStream',
		value: function _emitRemoveStream(stream) {
			if (this._closed) {
				return;
			}

			logger.debug('emitting "removestream"');

			var event = new _yaeti2.default.Event('removestream');

			event.stream = stream;
			this.dispatchEvent(event);
		}

		/**
   * Get RTP parameters for a RTCRtpReceiver.
   * @private
   * @return {RTCRtpParameters}
   */

	}, {
		key: '_getParametersForRtpReceiver',
		value: function _getParametersForRtpReceiver(kind, data) {
			var ssrc = data.ssrc;
			var rtxSsrc = data.rtxSsrc;
			var cname = data.cname;
			var localCapabilities = this._localCapabilities;
			var parameters = {
				codecs: [],
				degradationPreference: 'balanced',
				encodings: [],
				headerExtensions: [],
				muxId: '',
				rtcp: {
					cname: cname,
					compound: true, // NOTE: Implemented in Edge.
					mux: true,
					reducedSize: true // NOTE: Not yet implemented in Edge.
				}
			};

			var codecs = [];
			var codecPayloadType = void 0;

			var _iteratorNormalCompletion22 = true;
			var _didIteratorError22 = false;
			var _iteratorError22 = undefined;

			try {
				for (var _iterator22 = (0, _getIterator3.default)(localCapabilities.codecs), _step22; !(_iteratorNormalCompletion22 = (_step22 = _iterator22.next()).done); _iteratorNormalCompletion22 = true) {
					var _codecCapability = _step22.value;

					if (_codecCapability.kind !== kind || _codecCapability.name === 'rtx') {
						continue;
					}

					codecPayloadType = _codecCapability.preferredPayloadType;
					codecs.push({
						clockRate: _codecCapability.clockRate,
						maxptime: _codecCapability.maxptime,
						mimeType: _codecCapability.mimeType,
						name: _codecCapability.name,
						numChannels: _codecCapability.numChannels,
						parameters: _codecCapability.parameters,
						payloadType: _codecCapability.preferredPayloadType,
						ptime: _codecCapability.ptime,
						rtcpFeedback: _codecCapability.rtcpFeedback
					});

					break;
				}
			} catch (err) {
				_didIteratorError22 = true;
				_iteratorError22 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion22 && _iterator22.return) {
						_iterator22.return();
					}
				} finally {
					if (_didIteratorError22) {
						throw _iteratorError22;
					}
				}
			}

			if (rtxSsrc) {
				var _iteratorNormalCompletion23 = true;
				var _didIteratorError23 = false;
				var _iteratorError23 = undefined;

				try {
					for (var _iterator23 = (0, _getIterator3.default)(localCapabilities.codecs), _step23; !(_iteratorNormalCompletion23 = (_step23 = _iterator23.next()).done); _iteratorNormalCompletion23 = true) {
						var codecCapability = _step23.value;

						if (codecCapability.kind !== kind || codecCapability.name !== 'rtx') {
							continue;
						}

						codecs.push({
							clockRate: codecCapability.clockRate,
							mimeType: codecCapability.mimeType,
							name: 'rtx',
							parameters: codecCapability.parameters,
							payloadType: codecCapability.preferredPayloadType,
							rtcpFeedback: codecCapability.rtcpFeedback
						});

						break;
					}
				} catch (err) {
					_didIteratorError23 = true;
					_iteratorError23 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion23 && _iterator23.return) {
							_iterator23.return();
						}
					} finally {
						if (_didIteratorError23) {
							throw _iteratorError23;
						}
					}
				}
			}

			parameters.codecs = codecs;

			var encoding = {
				active: true,
				codecPayloadType: codecPayloadType,
				ssrc: ssrc
			};

			if (rtxSsrc) {
				encoding.rtx = {
					ssrc: rtxSsrc
				};
			}

			parameters.encodings.push(encoding);

			var _iteratorNormalCompletion24 = true;
			var _didIteratorError24 = false;
			var _iteratorError24 = undefined;

			try {
				for (var _iterator24 = (0, _getIterator3.default)(localCapabilities.headerExtensions), _step24; !(_iteratorNormalCompletion24 = (_step24 = _iterator24.next()).done); _iteratorNormalCompletion24 = true) {
					var extension = _step24.value;

					if (extension.kind !== kind) continue;

					parameters.headerExtensions.push({
						encrypt: extension.preferredEncrypt,
						id: extension.preferredId,
						uri: extension.uri
					});
				}
			} catch (err) {
				_didIteratorError24 = true;
				_iteratorError24 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion24 && _iterator24.return) {
						_iterator24.return();
					}
				} finally {
					if (_didIteratorError24) {
						throw _iteratorError24;
					}
				}
			}

			return parameters;
		}

		/**
   * Get RTP parameters for a RTCRtpSender.
   * @private
   * @return {RTCRtpParameters}
   */

	}, {
		key: '_getParametersForRtpSender',
		value: function _getParametersForRtpSender(kind, data) {
			var ssrc = data.ssrc;
			var rtxSsrc = data.rtxSsrc;
			var cname = CNAME;
			var localCapabilities = this._localCapabilities;
			var parameters = {
				codecs: [],
				degradationPreference: 'balanced',
				encodings: [],
				headerExtensions: [],
				muxId: '',
				rtcp: {
					cname: cname,
					compound: true, // NOTE: Implemented in Edge.
					mux: true,
					reducedSize: true // NOTE: Not yet implemented in Edge.
				}
			};

			var codecs = [];
			var codecPayloadType = void 0;

			var _iteratorNormalCompletion25 = true;
			var _didIteratorError25 = false;
			var _iteratorError25 = undefined;

			try {
				for (var _iterator25 = (0, _getIterator3.default)(localCapabilities.codecs), _step25; !(_iteratorNormalCompletion25 = (_step25 = _iterator25.next()).done); _iteratorNormalCompletion25 = true) {
					var _codecCapability2 = _step25.value;

					if (_codecCapability2.kind !== kind || _codecCapability2.name === 'rtx') {
						continue;
					}

					codecPayloadType = _codecCapability2.preferredPayloadType;
					codecs.push({
						clockRate: _codecCapability2.clockRate,
						maxptime: _codecCapability2.maxptime,
						mimeType: _codecCapability2.mimeType,
						name: _codecCapability2.name,
						numChannels: _codecCapability2.numChannels,
						parameters: _codecCapability2.parameters,
						payloadType: _codecCapability2.preferredPayloadType,
						ptime: _codecCapability2.ptime,
						rtcpFeedback: _codecCapability2.rtcpFeedback
					});

					break;
				}
			} catch (err) {
				_didIteratorError25 = true;
				_iteratorError25 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion25 && _iterator25.return) {
						_iterator25.return();
					}
				} finally {
					if (_didIteratorError25) {
						throw _iteratorError25;
					}
				}
			}

			if (rtxSsrc) {
				var _iteratorNormalCompletion26 = true;
				var _didIteratorError26 = false;
				var _iteratorError26 = undefined;

				try {
					for (var _iterator26 = (0, _getIterator3.default)(localCapabilities.codecs), _step26; !(_iteratorNormalCompletion26 = (_step26 = _iterator26.next()).done); _iteratorNormalCompletion26 = true) {
						var codecCapability = _step26.value;

						if (codecCapability.kind !== kind || codecCapability.name !== 'rtx') {
							continue;
						}

						codecs.push({
							clockRate: codecCapability.clockRate,
							mimeType: codecCapability.mimeType,
							name: 'rtx',
							parameters: codecCapability.parameters,
							payloadType: codecCapability.preferredPayloadType,
							rtcpFeedback: codecCapability.rtcpFeedback
						});

						break;
					}
				} catch (err) {
					_didIteratorError26 = true;
					_iteratorError26 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion26 && _iterator26.return) {
							_iterator26.return();
						}
					} finally {
						if (_didIteratorError26) {
							throw _iteratorError26;
						}
					}
				}
			}

			parameters.codecs = codecs;

			var encoding = {
				active: true,
				codecPayloadType: codecPayloadType,
				ssrc: ssrc
			};

			if (rtxSsrc) {
				encoding.rtx = {
					ssrc: rtxSsrc
				};
			}

			parameters.encodings.push(encoding);

			var _iteratorNormalCompletion27 = true;
			var _didIteratorError27 = false;
			var _iteratorError27 = undefined;

			try {
				for (var _iterator27 = (0, _getIterator3.default)(localCapabilities.headerExtensions), _step27; !(_iteratorNormalCompletion27 = (_step27 = _iterator27.next()).done); _iteratorNormalCompletion27 = true) {
					var extension = _step27.value;

					if (extension.kind !== kind) continue;

					parameters.headerExtensions.push({
						encrypt: extension.preferredEncrypt,
						id: extension.preferredId,
						uri: extension.uri
					});
				}
			} catch (err) {
				_didIteratorError27 = true;
				_iteratorError27 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion27 && _iterator27.return) {
						_iterator27.return();
					}
				} finally {
					if (_didIteratorError27) {
						throw _iteratorError27;
					}
				}
			}

			return parameters;
		}

		/**
   * Promise based implementation for getStats().
   * @return {Promise}
   * @private
   */

	}, {
		key: '_getStats',
		value: function _getStats(selector) {
			// eslint-disable-line no-unused-vars
			if (this._closed) {
				return _promise2.default.reject(new _errors.InvalidStateError('RTCPeerConnection closed'));
			}

			// TODO: TBD
			return _promise2.default.reject(new Error('getStats() not yet implemented'));
		}

		/**
   * Handles the local initial answer.
   * @return {Promise}
   * @private
   */

	}, {
		key: '_handleLocalInitialAnswer',
		value: function _handleLocalInitialAnswer(desc) {
			logger.debug('_handleLocalInitialAnswer(), desc:', desc);

			var sdpObject = desc.sdpObject;

			// Update local capabilities as decided by the app.
			this._localCapabilities = ortcUtils.extractCapabilities(sdpObject);

			logger.debug('local capabilities:', this._localCapabilities);

			// TODO: Should inspect the answer given by the app and update our
			// sending RTP parameters if, for example, the app modified SSRC
			// values.
		}

		/**
   * Handles a local re-answer.
   * @return {Promise}
   * @private
   */

	}, {
		key: '_handleLocalReAnswer',
		value: function _handleLocalReAnswer(desc) {
			logger.debug('_handleLocalReAnswer(), desc:', desc);

			var sdpObject = desc.sdpObject;

			// Update local capabilities as decided by the app.
			this._localCapabilities = ortcUtils.extractCapabilities(sdpObject);

			logger.debug('local capabilities:', this._localCapabilities);

			// TODO: Should inspect the answer given by the app and update our
			// sending RTP parameters if, for example, the app modified SSRC
			// values.
		}

		/**
   * Handles the remote initial offer.
   * @return {Promise}
   * @private
   */

	}, {
		key: '_handleRemoteInitialOffer',
		value: function _handleRemoteInitialOffer(desc) {
			logger.debug('_handleRemoteInitialOffer(), desc:', desc);

			var sdpObject = desc.sdpObject;

			// Set MID values.
			this._mids = ortcUtils.extractMids(sdpObject);

			// Get remote RTP capabilities.
			var remoteCapabilities = ortcUtils.extractCapabilities(sdpObject);

			logger.debug('remote capabilities:', remoteCapabilities);

			// Get local RTP capabilities (filter them with remote capabilities).
			this._localCapabilities = ortcUtils.getLocalCapabilities(remoteCapabilities);

			// Start ICE and DTLS.
			this._startIceAndDtls(desc);
		}

		/**
   * Handles a remote re-offer.
   * @return {Promise}
   * @private
   */

	}, {
		key: '_handleRemoteReOffer',
		value: function _handleRemoteReOffer(desc) {
			logger.debug('_handleRemoteReOffer(), desc:', desc);

			var sdpObject = desc.sdpObject;

			// Update MID values (just in case).
			this._mids = ortcUtils.extractMids(sdpObject);

			// Get remote RTP capabilities (filter them with remote capabilities).
			var remoteCapabilities = ortcUtils.extractCapabilities(sdpObject);

			logger.debug('remote capabilities:', remoteCapabilities);

			// Update local RTP capabilities (just in case).
			this._localCapabilities = ortcUtils.getLocalCapabilities(remoteCapabilities);
		}

		/**
   * Start receiving remote media.
   */

	}, {
		key: '_receiveMedia',
		value: function _receiveMedia() {
			logger.debug('_receiveMedia()');

			var currentRemoteSsrcs = new _set2.default(this._remoteTrackInfos.keys());
			var newRemoteTrackInfos = ortcUtils.extractTrackInfos(this._remoteDescription.sdpObject);

			// Map of new remote MediaStream indexed by MediaStream.jitsiRemoteId.
			var addedRemoteStreams = new _map2.default();

			// Map of remote MediaStream indexed by added MediaStreamTrack.
			// NOTE: Just filled for already existing streams.
			var addedRemoteTracks = new _map2.default();

			// Map of remote MediaStream indexed by removed MediaStreamTrack.
			var removedRemoteTracks = new _map2.default();

			logger.debug('_receiveMedia() remote track infos:', newRemoteTrackInfos);

			// Check new tracks.
			var _iteratorNormalCompletion28 = true;
			var _didIteratorError28 = false;
			var _iteratorError28 = undefined;

			try {
				for (var _iterator28 = (0, _getIterator3.default)(newRemoteTrackInfos), _step28; !(_iteratorNormalCompletion28 = (_step28 = _iterator28.next()).done); _iteratorNormalCompletion28 = true) {
					var _step28$value = (0, _slicedToArray3.default)(_step28.value, 2),
					    ssrc = _step28$value[0],
					    info = _step28$value[1];

					// If already handled, ignore it.
					if (currentRemoteSsrcs.has(ssrc)) continue;

					logger.debug('_receiveMedia() new remote track, ssrc:' + ssrc);

					// Otherwise append to the map.
					this._remoteTrackInfos.set(ssrc, info);

					var kind = info.kind;
					var rtxSsrc = info.rtxSsrc;
					var streamRemoteId = info.streamId;
					var trackRemoteId = info.trackId;
					var cname = info.cname;
					var isNewStream = !this._remoteStreams.has(streamRemoteId);
					var stream = void 0;

					if (isNewStream) {
						logger.debug('_receiveMedia() new remote stream, id:' + streamRemoteId);

						// Create a new MediaStream.
						stream = new MediaStream();

						// Set custom property with the remote id.
						stream.jitsiRemoteId = streamRemoteId;

						addedRemoteStreams.set(streamRemoteId, stream);
						this._remoteStreams.set(streamRemoteId, stream);
					} else {
						stream = this._remoteStreams.get(streamRemoteId);
					}

					var rtpReceiver = new RTCRtpReceiver(this._dtlsTransport, kind);
					var parameters = this._getParametersForRtpReceiver(kind, {
						ssrc: ssrc,
						rtxSsrc: rtxSsrc,
						cname: cname
					});

					// Store the track into the info object.
					// NOTE: This should not be needed, but Edge has a bug:
					//   https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12399497/
					info.track = rtpReceiver.track;

					// Set error handler.
					rtpReceiver.onerror = function (ev) {
						logger.error('rtpReceiver "error" event, event:');
						logger.error(ev);
					};

					// Fill the info with the stream and rtpReceiver.
					info.stream = stream;
					info.rtpReceiver = rtpReceiver;

					logger.debug('calling rtpReceiver.receive(), parameters:', parameters);

					// Start receiving media.
					try {
						rtpReceiver.receive(parameters);

						// Get the associated MediaStreamTrack.
						var track = info.track;

						// Set custom property with the remote id.
						track.jitsiRemoteId = trackRemoteId;

						// Add the track to the stream.
						stream.addTrack(track);

						if (!addedRemoteStreams.has(streamRemoteId)) {
							addedRemoteTracks.set(track, stream);
						}
					} catch (error) {
						logger.error('rtpReceiver.receive() failed:' + error.message);
						logger.error(error);
					}
				}

				// Check track removal.
			} catch (err) {
				_didIteratorError28 = true;
				_iteratorError28 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion28 && _iterator28.return) {
						_iterator28.return();
					}
				} finally {
					if (_didIteratorError28) {
						throw _iteratorError28;
					}
				}
			}

			var _iteratorNormalCompletion29 = true;
			var _didIteratorError29 = false;
			var _iteratorError29 = undefined;

			try {
				for (var _iterator29 = (0, _getIterator3.default)(currentRemoteSsrcs), _step29; !(_iteratorNormalCompletion29 = (_step29 = _iterator29.next()).done); _iteratorNormalCompletion29 = true) {
					var ssrc = _step29.value;

					if (newRemoteTrackInfos.has(ssrc)) continue;

					logger.debug('_receiveMedia() remote track removed, ssrc:' + ssrc);

					var info = this._remoteTrackInfos.get(ssrc);
					var _stream = info.stream;
					var _track2 = info.track;
					var _rtpReceiver = info.rtpReceiver;

					try {
						_rtpReceiver.stop();
					} catch (error) {
						logger.warn('rtpReceiver.stop() failed:' + error);
					}

					removedRemoteTracks.set(_track2, _stream);
					_stream.removeTrack(_track2);
					this._remoteTrackInfos.delete(ssrc);
				}

				// Emit MediaStream 'addtrack' for new tracks in already existing
				// streams.
			} catch (err) {
				_didIteratorError29 = true;
				_iteratorError29 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion29 && _iterator29.return) {
						_iterator29.return();
					}
				} finally {
					if (_didIteratorError29) {
						throw _iteratorError29;
					}
				}
			}

			var _iteratorNormalCompletion30 = true;
			var _didIteratorError30 = false;
			var _iteratorError30 = undefined;

			try {
				for (var _iterator30 = (0, _getIterator3.default)(addedRemoteTracks), _step30; !(_iteratorNormalCompletion30 = (_step30 = _iterator30.next()).done); _iteratorNormalCompletion30 = true) {
					var _step30$value = (0, _slicedToArray3.default)(_step30.value, 2),
					    _track3 = _step30$value[0],
					    _stream2 = _step30$value[1];

					var event = new Event('addtrack');

					event.track = _track3;
					_stream2.dispatchEvent(event);
				}

				// Emit MediaStream 'removetrack' for removed tracks.
			} catch (err) {
				_didIteratorError30 = true;
				_iteratorError30 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion30 && _iterator30.return) {
						_iterator30.return();
					}
				} finally {
					if (_didIteratorError30) {
						throw _iteratorError30;
					}
				}
			}

			var _iteratorNormalCompletion31 = true;
			var _didIteratorError31 = false;
			var _iteratorError31 = undefined;

			try {
				for (var _iterator31 = (0, _getIterator3.default)(removedRemoteTracks), _step31; !(_iteratorNormalCompletion31 = (_step31 = _iterator31.next()).done); _iteratorNormalCompletion31 = true) {
					var _step31$value = (0, _slicedToArray3.default)(_step31.value, 2),
					    _track4 = _step31$value[0],
					    _stream3 = _step31$value[1];

					var _event = new Event('removetrack');

					_event.track = _track4;
					_stream3.dispatchEvent(_event);
				}

				// Emit RTCPeerConnection 'addstream' for new remote streams.
			} catch (err) {
				_didIteratorError31 = true;
				_iteratorError31 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion31 && _iterator31.return) {
						_iterator31.return();
					}
				} finally {
					if (_didIteratorError31) {
						throw _iteratorError31;
					}
				}
			}

			var _iteratorNormalCompletion32 = true;
			var _didIteratorError32 = false;
			var _iteratorError32 = undefined;

			try {
				for (var _iterator32 = (0, _getIterator3.default)(addedRemoteStreams.values()), _step32; !(_iteratorNormalCompletion32 = (_step32 = _iterator32.next()).done); _iteratorNormalCompletion32 = true) {
					var _stream4 = _step32.value;

					// Check whether at least a track was added, otherwise ignore it.
					if (_stream4.getTracks().length === 0) {
						logger.warn('ignoring new stream for which no track could be added');

						addedRemoteStreams.delete(_stream4.jitsiRemoteId);
						this._remoteStreams.delete(_stream4.jitsiRemoteId);
					} else {
						this._emitAddStream(_stream4);
					}
				}

				// Emit RTCPeerConnection 'removestream' for removed remote streams.
			} catch (err) {
				_didIteratorError32 = true;
				_iteratorError32 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion32 && _iterator32.return) {
						_iterator32.return();
					}
				} finally {
					if (_didIteratorError32) {
						throw _iteratorError32;
					}
				}
			}

			var _iteratorNormalCompletion33 = true;
			var _didIteratorError33 = false;
			var _iteratorError33 = undefined;

			try {
				for (var _iterator33 = (0, _getIterator3.default)(this._remoteStreams), _step33; !(_iteratorNormalCompletion33 = (_step33 = _iterator33.next()).done); _iteratorNormalCompletion33 = true) {
					var _step33$value = (0, _slicedToArray3.default)(_step33.value, 2),
					    _streamRemoteId = _step33$value[0],
					    _stream5 = _step33$value[1];

					if (_stream5.getTracks().length > 0) continue;

					this._remoteStreams.delete(_streamRemoteId);
					this._emitRemoveStream(_stream5);
				}
			} catch (err) {
				_didIteratorError33 = true;
				_iteratorError33 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion33 && _iterator33.return) {
						_iterator33.return();
					}
				} finally {
					if (_didIteratorError33) {
						throw _iteratorError33;
					}
				}
			}
		}

		/**
   * Implementation for removeStream().
   * @private
   */

	}, {
		key: '_removeStream',
		value: function _removeStream(stream) {
			if (this._closed) {
				throw new _errors.InvalidStateError('RTCPeerConnection closed');
			}

			// Stop and remove the RTCRtpSender associated to each track.
			var _iteratorNormalCompletion34 = true;
			var _didIteratorError34 = false;
			var _iteratorError34 = undefined;

			try {
				for (var _iterator34 = (0, _getIterator3.default)(stream.getTracks()), _step34; !(_iteratorNormalCompletion34 = (_step34 = _iterator34.next()).done); _iteratorNormalCompletion34 = true) {
					var track = _step34.value;

					// Ignore if track not present.
					if (!this._localTrackInfos.has(track.id)) continue;

					var rtpSender = this._localTrackInfos.get(track.id).rtpSender;

					try {
						rtpSender.stop();
					} catch (error) {
						logger.warn('rtpSender.stop() failed:' + error);
					}

					// Remove from the map.
					this._localTrackInfos.delete(track.id);
				}

				// It may need to renegotiate.
			} catch (err) {
				_didIteratorError34 = true;
				_iteratorError34 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion34 && _iterator34.return) {
						_iterator34.return();
					}
				} finally {
					if (_didIteratorError34) {
						throw _iteratorError34;
					}
				}
			}

			this._emitNegotiationNeeded();
		}

		/**
   * Start sending our media to the remote.
   */

	}, {
		key: '_sendMedia',
		value: function _sendMedia() {
			logger.debug('_sendMedia()');

			var _iteratorNormalCompletion35 = true;
			var _didIteratorError35 = false;
			var _iteratorError35 = undefined;

			try {
				for (var _iterator35 = (0, _getIterator3.default)(this._localTrackInfos.values()), _step35; !(_iteratorNormalCompletion35 = (_step35 = _iterator35.next()).done); _iteratorNormalCompletion35 = true) {
					var info = _step35.value;

					// Ignore if already sending.
					if (info.sending) continue;

					var rtpSender = info.rtpSender;
					var ssrc = info.ssrc;
					var rtxSsrc = info.rtxSsrc;
					var track = rtpSender.track;
					var kind = track.kind;

					var parameters = this._getParametersForRtpSender(kind, {
						ssrc: ssrc,
						rtxSsrc: rtxSsrc
					});

					logger.debug('calling rtpSender.send(), parameters:', parameters);

					// Start sending media.
					try {
						rtpSender.send(parameters);

						// Update sending field.
						info.sending = true;
					} catch (error) {
						logger.error('rtpSender.send() failed:' + error.message);
						logger.error(error);
					}
				}
			} catch (err) {
				_didIteratorError35 = true;
				_iteratorError35 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion35 && _iterator35.return) {
						_iterator35.return();
					}
				} finally {
					if (_didIteratorError35) {
						throw _iteratorError35;
					}
				}
			}
		}

		/**
   * Creates the RTCDtlsTransport.
   * @private
   */

	}, {
		key: '_setDtlsTransport',
		value: function _setDtlsTransport(iceTransport) {
			var _this2 = this;

			var dtlsTransport = new RTCDtlsTransport(iceTransport);

			// NOTE: Not yet implemented by Edge.
			dtlsTransport.onstatechange = function () {
				logger.debug('dtlsTransport "statechange" event, ' + ('state:' + dtlsTransport.state));

				_this2._emitConnectionStateChange();
			};

			// NOTE: Not standard, but implemented by Edge.
			dtlsTransport.ondtlsstatechange = function () {
				logger.debug('dtlsTransport "dtlsstatechange" event, ' + ('state:' + dtlsTransport.state));

				_this2._emitConnectionStateChange();
			};

			dtlsTransport.onerror = function (ev) {
				var message = void 0;

				if (ev.message) {
					message = ev.message;
				} else if (ev.error) {
					message = ev.error.message;
				}

				logger.error('dtlsTransport "error" event, message:' + message);

				// TODO: Edge does not set state to 'failed' on error. We should
				// hack it.

				_this2._emitConnectionStateChange();
			};

			this._dtlsTransport = dtlsTransport;
		}

		/**
   * Creates the RTCIceGatherer.
   * @private
   */

	}, {
		key: '_setIceGatherer',
		value: function _setIceGatherer(pcConfig) {
			var _this3 = this;

			var iceGatherOptions = {
				gatherPolicy: pcConfig.iceTransportPolicy || 'all',
				iceServers: pcConfig.iceServers || []
			};
			var iceGatherer = new RTCIceGatherer(iceGatherOptions);

			// NOTE: Not yet implemented by Edge.
			iceGatherer.onstatechange = function () {
				logger.debug('iceGatherer "statechange" event, state:' + iceGatherer.state);

				_this3._updateAndEmitIceGatheringStateChange(iceGatherer.state);
			};

			iceGatherer.onlocalcandidate = function (ev) {
				var candidate = ev.candidate;

				// NOTE: Not yet implemented by Edge.
				var complete = ev.complete;

				logger.debug('iceGatherer "localcandidate" event, candidate:', candidate);

				// NOTE: Instead of null candidate or complete:true, current Edge
				// signals end of gathering with an empty candidate object.
				if (complete || !candidate || (0, _keys2.default)(candidate).length === 0) {

					candidate = null;

					_this3._updateAndEmitIceGatheringStateChange(RTCIceGatheringState.complete);
					_this3._emitIceCandidate(null);
				} else {
					_this3._emitIceCandidate(candidate);
				}
			};

			iceGatherer.onerror = function (ev) {
				var errorCode = ev.errorCode;
				var errorText = ev.errorText;

				logger.error('iceGatherer "error" event, errorCode:' + errorCode + ', ' + ('errorText:' + errorText));
			};

			// NOTE: Not yet implemented by Edge, which starts gathering
			// automatically.
			try {
				iceGatherer.gather();
			} catch (error) {
				logger.warn('iceGatherer.gather() failed:' + error);
			}

			this._iceGatherer = iceGatherer;
		}

		/**
   * Creates the RTCIceTransport.
   * @private
   */

	}, {
		key: '_setIceTransport',
		value: function _setIceTransport(iceGatherer) {
			var _this4 = this;

			var iceTransport = new RTCIceTransport(iceGatherer);

			// NOTE: Not yet implemented by Edge.
			iceTransport.onstatechange = function () {
				logger.debug('iceTransport "statechange" event, ' + ('state:' + iceTransport.state));

				_this4._emitIceConnectionStateChange();
			};

			// NOTE: Not standard, but implemented by Edge.
			iceTransport.onicestatechange = function () {
				logger.debug('iceTransport "icestatechange" event, ' + ('state:' + iceTransport.state));

				if (iceTransport.state === 'completed') {
					logger.debug('nominated candidate pair:', iceTransport.getNominatedCandidatePair());
				}

				_this4._emitIceConnectionStateChange();
			};

			iceTransport.oncandidatepairchange = function (ev) {
				logger.debug('iceTransport "candidatepairchange" event, ' + ('pair:' + ev.pair));
			};

			this._iceTransport = iceTransport;
		}

		/**
   * Promise based implementation for setLocalDescription().
   * @returns {Promise}
   * @private
   */

	}, {
		key: '_setLocalDescription',
		value: function _setLocalDescription(desc) {
			var _this5 = this;

			if (this._closed) {
				return _promise2.default.reject(new _errors.InvalidStateError('RTCPeerConnection closed'));
			}

			var localDescription = void 0;

			try {
				localDescription = new _RTCSessionDescription2.default(desc);
			} catch (error) {
				return _promise2.default.reject(new TypeError('invalid RTCSessionDescriptionInit: ' + error));
			}

			switch (desc.type) {
				case 'offer':
					{
						if (this.signalingState !== RTCSignalingState.stable) {
							return _promise2.default.reject(new _errors.InvalidStateError('invalid signalingState "' + this.signalingState + '"'));
						}

						// NOTE: P2P mode not yet supported, so createOffer() should never
						// has been called, neither setLocalDescription() with an offer.
						return _promise2.default.reject(new TypeError('setLocalDescription() with type "offer" not supported'));
					}
				case 'answer':
					{
						if (this.signalingState !== RTCSignalingState.haveRemoteOffer) {
							return _promise2.default.reject(new _errors.InvalidStateError('invalid signalingState "' + this.signalingState + '"'));
						}

						var isLocalInitialAnswer = Boolean(!this._localDescription);

						return _promise2.default.resolve().then(function () {
							// Different handling for initial answer and re-answer.
							if (isLocalInitialAnswer) {
								return _this5._handleLocalInitialAnswer(localDescription);
							} else {
								// eslint-disable-line no-else-return
								return _this5._handleLocalReAnswer(localDescription);
							}
						}).then(function () {
							logger.debug('setLocalDescription() succeed');

							// Update local description.
							_this5._localDescription = localDescription;

							// Update signaling state.
							_this5._updateAndEmitSignalingStateChange(RTCSignalingState.stable);

							// If initial answer, emit buffered ICE candidates.
							if (isLocalInitialAnswer) {
								_this5._emitBufferedIceCandidates();
							}

							// Send our RTP.
							_this5._sendMedia();

							// Receive remote RTP.
							_this5._receiveMedia();
						}).catch(function (error) {
							logger.error('setLocalDescription() failed: ' + error.message);
							logger.error(error);

							throw error;
						});
					}
				default:
					return _promise2.default.reject(new TypeError('unsupported description.type "' + desc.type + '"'));
			}
		}

		/**
   * Promise based implementation for setRemoteDescription().
   * @returns {Promise}
   * @private
   */

	}, {
		key: '_setRemoteDescription',
		value: function _setRemoteDescription(desc) {
			var _this6 = this;

			if (this._closed) {
				return _promise2.default.reject(new _errors.InvalidStateError('RTCPeerConnection closed'));
			}

			var remoteDescription = void 0;

			try {
				remoteDescription = new _RTCSessionDescription2.default(desc);
			} catch (error) {
				return _promise2.default.reject(new TypeError('invalid RTCSessionDescriptionInit: ' + error));
			}

			switch (desc.type) {
				case 'offer':
					{
						if (this.signalingState !== RTCSignalingState.stable) {
							return _promise2.default.reject(new _errors.InvalidStateError('invalid signalingState "' + this.signalingState + '"'));
						}

						var isRemoteInitialOffer = Boolean(!this._remoteDescription);

						return _promise2.default.resolve().then(function () {
							// Different handling for initial answer and re-answer.
							if (isRemoteInitialOffer) {
								return _this6._handleRemoteInitialOffer(remoteDescription);
							} else {
								// eslint-disable-line no-else-return
								return _this6._handleRemoteReOffer(remoteDescription);
							}
						}).then(function () {
							logger.debug('setRemoteDescription() succeed');

							// Update remote description.
							_this6._remoteDescription = remoteDescription;

							// Update signaling state.
							_this6._updateAndEmitSignalingStateChange(RTCSignalingState.haveRemoteOffer);
						}).catch(function (error) {
							logger.error('setRemoteDescription() failed: ' + error);

							throw error;
						});
					}
				case 'answer':
					{
						if (this.signalingState !== RTCSignalingState.haveLocalOffer) {
							return _promise2.default.reject(new _errors.InvalidStateError('invalid signalingState "' + this.signalingState + '"'));
						}

						// NOTE: P2P mode not yet supported, so createOffer() should never
						// has been called, neither setRemoteDescription() with an answer.
						return _promise2.default.reject(new TypeError('setRemoteDescription() with type "answer" not supported'));
					}
				default:
					return _promise2.default.reject(new TypeError('unsupported description.type "' + desc.type + '"'));
			}
		}

		/**
   * Start ICE and DTLS connection procedures.
   * @param {RTCSessionDescription} desc - Remote description.
   */

	}, {
		key: '_startIceAndDtls',
		value: function _startIceAndDtls(desc) {
			var sdpObject = desc.sdpObject;
			var remoteIceParameters = ortcUtils.extractIceParameters(sdpObject);
			var remoteIceCandidates = ortcUtils.extractIceCandidates(sdpObject);
			var remoteDtlsParameters = ortcUtils.extractDtlsParameters(sdpObject);

			// Start the RTCIceTransport.
			switch (desc.type) {
				case 'offer':
					this._iceTransport.start(this._iceGatherer, remoteIceParameters, 'controlled');
					break;
				case 'answer':
					this._iceTransport.start(this._iceGatherer, remoteIceParameters, 'controlling');
					break;
			}

			// Add remote ICE candidates.
			// NOTE: Remove candidates that Edge doesn't like.
			var _iteratorNormalCompletion36 = true;
			var _didIteratorError36 = false;
			var _iteratorError36 = undefined;

			try {
				for (var _iterator36 = (0, _getIterator3.default)(remoteIceCandidates), _step36; !(_iteratorNormalCompletion36 = (_step36 = _iterator36.next()).done); _iteratorNormalCompletion36 = true) {
					var candidate = _step36.value;

					if (candidate.port === 0 || candidate.port === 9) continue;

					this._iceTransport.addRemoteCandidate(candidate);
				}

				// Also signal a 'complete' candidate as per spec.
				// NOTE: It should be {complete: true} but Edge prefers {}.
				// NOTE: We know that addCandidate() is never used so we need to signal
				// end of candidates (otherwise the RTCIceTransport never enters the
				// 'completed' state).
			} catch (err) {
				_didIteratorError36 = true;
				_iteratorError36 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion36 && _iterator36.return) {
						_iterator36.return();
					}
				} finally {
					if (_didIteratorError36) {
						throw _iteratorError36;
					}
				}
			}

			this._iceTransport.addRemoteCandidate({});

			// Set desired remote DTLS role (as we receive the offer).
			switch (desc.type) {
				case 'offer':
					remoteDtlsParameters.role = 'server';
					break;
				case 'answer':
					remoteDtlsParameters.role = 'client';
					break;
			}

			// Start RTCDtlsTransport.
			this._dtlsTransport.start(remoteDtlsParameters);
		}

		/**
   * May update iceGatheringState and emit 'icegatheringstatechange' event.
   * @private
   */

	}, {
		key: '_updateAndEmitIceGatheringStateChange',
		value: function _updateAndEmitIceGatheringStateChange(state) {
			if (this._closed || state === this.iceGatheringState) {
				return;
			}

			this._iceGatheringState = state;

			logger.debug('emitting "icegatheringstatechange", iceGatheringState:', this.iceGatheringState);

			var event = new _yaeti2.default.Event('icegatheringstatechange');

			this.dispatchEvent(event);
		}

		/**
   * May update signalingState and emit 'signalingstatechange' event.
   * @private
   */

	}, {
		key: '_updateAndEmitSignalingStateChange',
		value: function _updateAndEmitSignalingStateChange(state) {
			if (state === this.signalingState) {
				return;
			}

			this._signalingState = state;

			logger.debug('emitting "signalingstatechange", signalingState:', this.signalingState);

			var event = new _yaeti2.default.Event('signalingstatechange');

			this.dispatchEvent(event);
		}
	}, {
		key: 'connectionState',
		get: function get() {
			return this._dtlsTransport.state;
		}

		/**
   * Current ICE connection state.
   * @return {RTCIceConnectionState}
   */

	}, {
		key: 'iceConnectionState',
		get: function get() {
			return this._iceTransport.state;
		}

		/**
   * Current ICE gathering state.
   * @return {RTCIceGatheringState}
   */

	}, {
		key: 'iceGatheringState',
		get: function get() {
			return this._iceGatheringState;
		}

		/**
   * Gets the local description.
   * @return {RTCSessionDescription}
   */

	}, {
		key: 'localDescription',
		get: function get() {
			return this._localDescription;
		}

		/**
   * Gets the remote description.
   * @return {RTCSessionDescription}
   */

	}, {
		key: 'remoteDescription',
		get: function get() {
			return this._remoteDescription;
		}

		/**
   * Current signaling state.
   * @return {RTCSignalingState}
   */

	}, {
		key: 'signalingState',
		get: function get() {
			return this._signalingState;
		}
	}]);
	return ortcRTCPeerConnection;
}(_yaeti2.default.EventTarget);

exports.default = ortcRTCPeerConnection;
},{"../Logger":2,"../utils":10,"./RTCSessionDescription":5,"./errors":6,"./ortcUtils":7,"babel-runtime/core-js/array/from":11,"babel-runtime/core-js/get-iterator":12,"babel-runtime/core-js/map":15,"babel-runtime/core-js/object/get-prototype-of":18,"babel-runtime/core-js/object/keys":19,"babel-runtime/core-js/promise":21,"babel-runtime/core-js/set":22,"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/createClass":26,"babel-runtime/helpers/inherits":27,"babel-runtime/helpers/possibleConstructorReturn":28,"babel-runtime/helpers/slicedToArray":29,"yaeti":184}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _sdpTransform = require('sdp-transform');

var _sdpTransform2 = _interopRequireDefault(_sdpTransform);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * RTCSessionDescription implementation.
 */
var RTCSessionDescription = function () {
    /**
     * RTCSessionDescription constructor.
     * @param {Object} [data]
     * @param {String} [data.type] - 'offer' / 'answer'.
     * @param {String} [data.sdp] - SDP string.
     * @param {Object} [data._sdpObject] - SDP object generated by the
     * sdp-transform library.
     */
    function RTCSessionDescription(data) {
        (0, _classCallCheck3.default)(this, RTCSessionDescription);

        // @type {String}
        this._sdp = null;

        // @type {Object}
        this._sdpObject = null;

        // @type {String}
        this._type = null;

        switch (data.type) {
            case 'offer':
                break;
            case 'answer':
                break;
            default:
                throw new TypeError('invalid type "' + data.type + '"');
        }

        this._type = data.type;

        if (typeof data.sdp === 'string') {
            this._sdp = data.sdp;
            try {
                this._sdpObject = _sdpTransform2.default.parse(data.sdp);
            } catch (error) {
                throw new Error('invalid sdp: ' + error);
            }
        } else if ((0, _typeof3.default)(data._sdpObject) === 'object') {
            this._sdpObject = data._sdpObject;
            try {
                this._sdp = _sdpTransform2.default.write(data._sdpObject);
            } catch (error) {
                throw new Error('invalid sdp object: ' + error);
            }
        } else {
            throw new TypeError('invalid sdp or _sdpObject');
        }
    }

    /**
     * Get sdp field.
     * @return {String}
     */


    (0, _createClass3.default)(RTCSessionDescription, [{
        key: 'toJSON',


        /**
         * Returns an object with type and sdp fields.
         * @return {Object}
         */
        value: function toJSON() {
            return {
                sdp: this._sdp,
                type: this._type
            };
        }
    }, {
        key: 'sdp',
        get: function get() {
            return this._sdp;
        }

        /**
         * Set sdp field.
         * NOTE: This is not allowed per spec, but lib-jitsi-meet uses it.
         * @param {String} sdp
         */
        ,
        set: function set(sdp) {
            try {
                this._sdpObject = _sdpTransform2.default.parse(sdp);
            } catch (error) {
                throw new Error('invalid sdp: ' + error);
            }

            this._sdp = sdp;
        }

        /**
         * Gets the internal sdp object.
         * @return {Object}
         * @private
         */

    }, {
        key: 'sdpObject',
        get: function get() {
            return this._sdpObject;
        }

        /**
         * Get type field.
         * @return {String}
         */

    }, {
        key: 'type',
        get: function get() {
            return this._type;
        }
    }]);
    return RTCSessionDescription;
}();

exports.default = RTCSessionDescription;
},{"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/createClass":26,"babel-runtime/helpers/typeof":30,"sdp-transform":176}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.InvalidStateError = undefined;

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a class inheriting from Error.
 */
function createErrorClass(name) {
    var klass = function (_Error) {
        (0, _inherits3.default)(klass, _Error);

        /**
         * Custom error class constructor.
         * @param {string} message
         */
        function klass(message) {
            (0, _classCallCheck3.default)(this, klass);

            // Override `name` property value and make it non enumerable.
            var _this = (0, _possibleConstructorReturn3.default)(this, (klass.__proto__ || (0, _getPrototypeOf2.default)(klass)).call(this, message));

            Object.defineProperty(_this, 'name', { value: name });
            return _this;
        }

        return klass;
    }(Error);

    return klass;
}

var InvalidStateError = exports.InvalidStateError = createErrorClass('InvalidStateError');
},{"babel-runtime/core-js/object/get-prototype-of":18,"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/inherits":27,"babel-runtime/helpers/possibleConstructorReturn":28}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

exports.extractCapabilities = extractCapabilities;
exports.extractDtlsParameters = extractDtlsParameters;
exports.extractIceCandidates = extractIceCandidates;
exports.extractIceParameters = extractIceParameters;
exports.extractMids = extractMids;
exports.extractTrackInfos = extractTrackInfos;
exports.getLocalCapabilities = getLocalCapabilities;

var _sdpTransform = require('sdp-transform');

var _sdpTransform2 = _interopRequireDefault(_sdpTransform);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Extract RTP capabilities from remote description.
 * @param {Object} sdpObject - Remote SDP object generated by sdp-transform.
 * @return {RTCRtpCapabilities}
 */
function extractCapabilities(sdpObject) {
    // Map of RtpCodecParameters indexed by payload type.
    var codecsMap = new _map2.default();

    // Array of RtpHeaderExtensions.
    var headerExtensions = [];

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = (0, _getIterator3.default)(sdpObject.media), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var m = _step.value;

            // Media kind.
            var kind = m.type;

            if (kind !== 'audio' && kind !== 'video') {
                continue; // eslint-disable-line no-continue
            }

            // Get codecs.
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = (0, _getIterator3.default)(m.rtp), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var rtp = _step2.value;

                    var codec = {
                        clockRate: rtp.rate,
                        kind: kind,
                        mimeType: kind + '/' + rtp.codec,
                        name: rtp.codec,
                        numChannels: rtp.encoding || 1,
                        parameters: {},
                        preferredPayloadType: rtp.payload,
                        rtcpFeedback: []
                    };

                    codecsMap.set(codec.preferredPayloadType, codec);
                }

                // Get codec parameters.
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

            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = (0, _getIterator3.default)(m.fmtp || []), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var fmtp = _step3.value;

                    var parameters = _sdpTransform2.default.parseFmtpConfig(fmtp.config);
                    var _codec = codecsMap.get(fmtp.payload);

                    if (!_codec) {
                        continue; // eslint-disable-line no-continue
                    }

                    _codec.parameters = parameters;
                }

                // Get RTCP feedback for each codec.
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = (0, _getIterator3.default)(m.rtcpFb || []), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var fb = _step4.value;

                    var _codec2 = codecsMap.get(fb.payload);

                    if (!_codec2) {
                        continue; // eslint-disable-line no-continue
                    }

                    _codec2.rtcpFeedback.push({
                        parameter: fb.subtype || '',
                        type: fb.type
                    });
                }

                // Get RTP header extensions.
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }

            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                var _loop = function _loop() {
                    var ext = _step5.value;

                    var preferredId = ext.value;
                    var uri = ext.uri;
                    var headerExtension = {
                        kind: kind,
                        uri: uri,
                        preferredId: preferredId
                    };

                    // Check if already present.
                    var duplicated = headerExtensions.find(function (savedHeaderExtension) {
                        return headerExtension.kind === savedHeaderExtension.kind && headerExtension.uri === savedHeaderExtension.uri;
                    });

                    if (!duplicated) {
                        headerExtensions.push(headerExtension);
                    }
                };

                for (var _iterator5 = (0, _getIterator3.default)(m.ext || []), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    _loop();
                }
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                        _iterator5.return();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }
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

    return {
        codecs: (0, _from2.default)(codecsMap.values()),
        fecMechanisms: [], // TODO
        headerExtensions: headerExtensions
    };
}

/**
 * Extract DTLS parameters from remote description.
 * @param {Object} sdpObject - Remote SDP object generated by sdp-transform.
 * @return {RTCDtlsParameters}
 */
/* global RTCRtpReceiver */

function extractDtlsParameters(sdpObject) {
    var media = getFirstActiveMediaSection(sdpObject);
    var fingerprint = media.fingerprint || sdpObject.fingerprint;
    var role = void 0;

    switch (media.setup) {
        case 'active':
            role = 'client';
            break;
        case 'passive':
            role = 'server';
            break;
        case 'actpass':
            role = 'auto';
            break;
    }

    return {
        role: role,
        fingerprints: [{
            algorithm: fingerprint.type,
            value: fingerprint.hash
        }]
    };
}

/**
 * Extract ICE candidates from remote description.
 * NOTE: This implementation assumes a single BUNDLEd transport and rtcp-mux.
 * @param {Object} sdpObject - Remote SDP object generated by sdp-transform.
 * @return {sequence<RTCIceCandidate>}
 */
function extractIceCandidates(sdpObject) {
    var media = getFirstActiveMediaSection(sdpObject);
    var candidates = [];

    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
        for (var _iterator6 = (0, _getIterator3.default)(media.candidates), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var c = _step6.value;

            // Ignore RTCP candidates (we assume rtcp-mux).
            if (c.component !== 1) {
                continue; // eslint-disable-line no-continue
            }

            var candidate = {
                foundation: c.foundation,
                ip: c.ip,
                port: c.port,
                priority: c.priority,
                protocol: c.transport.toLowerCase(),
                type: c.type
            };

            candidates.push(candidate);
        }
    } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
            }
        } finally {
            if (_didIteratorError6) {
                throw _iteratorError6;
            }
        }
    }

    return candidates;
}

/**
 * Extract ICE parameters from remote description.
 * NOTE: This implementation assumes a single BUNDLEd transport.
 * @param {Object} sdpObject - Remote SDP object generated by sdp-transform.
 * @return {RTCIceParameters}
 */
function extractIceParameters(sdpObject) {
    var media = getFirstActiveMediaSection(sdpObject);
    var usernameFragment = media.iceUfrag;
    var password = media.icePwd;
    var icelite = sdpObject.icelite === 'ice-lite';

    return {
        icelite: icelite,
        password: password,
        usernameFragment: usernameFragment
    };
}

/**
 * Extract MID values from remote description.
 * @param {Object} sdpObject - Remote SDP object generated by sdp-transform.
 * @return {map<String, String>} Ordered Map with MID as key and kind as value.
 */
function extractMids(sdpObject) {
    var midToKind = new _map2.default();

    // Ignore disabled media sections.
    var _iteratorNormalCompletion7 = true;
    var _didIteratorError7 = false;
    var _iteratorError7 = undefined;

    try {
        for (var _iterator7 = (0, _getIterator3.default)(sdpObject.media), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var m = _step7.value;

            midToKind.set(m.mid, m.type);
        }
    } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion7 && _iterator7.return) {
                _iterator7.return();
            }
        } finally {
            if (_didIteratorError7) {
                throw _iteratorError7;
            }
        }
    }

    return midToKind;
}

/**
 * Extract tracks information.
 * @param {Object} sdpObject - Remote SDP object generated by sdp-transform.
 * @return {Map}
 */
function extractTrackInfos(sdpObject) {
    // Map with info about receiving media.
    // - index: Media SSRC
    // - value: Object
    //   - kind: 'audio' / 'video'
    //   - ssrc: Media SSRC
    //   - rtxSsrc: RTX SSRC (may be unset)
    //   - streamId: MediaStream.jitsiRemoteId
    //   - trackId: MediaStreamTrack.jitsiRemoteId
    //   - cname: CNAME
    // @type {map<Number, Object>}
    var infos = new _map2.default();

    // Map with stream SSRC as index and associated RTX SSRC as value.
    // @type {map<Number, Number>}
    var rtxMap = new _map2.default();

    // Set of RTX SSRC values.
    var rtxSet = new _set2.default();

    var _iteratorNormalCompletion8 = true;
    var _didIteratorError8 = false;
    var _iteratorError8 = undefined;

    try {
        for (var _iterator8 = (0, _getIterator3.default)(sdpObject.media), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
            var m = _step8.value;

            var kind = m.type;

            if (kind !== 'audio' && kind !== 'video') {
                continue; // eslint-disable-line no-continue
            }

            // Get RTX information.
            var _iteratorNormalCompletion9 = true;
            var _didIteratorError9 = false;
            var _iteratorError9 = undefined;

            try {
                for (var _iterator9 = (0, _getIterator3.default)(m.ssrcGroups || []), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                    var ssrcGroup = _step9.value;

                    // Just consider FID.
                    if (ssrcGroup.semantics !== 'FID') {
                        continue; // eslint-disable-line no-continue
                    }

                    var ssrcs = ssrcGroup.ssrcs.split(' ').map(function (ssrc) {
                        return Number(ssrc);
                    });
                    var ssrc = ssrcs[0];
                    var rtxSsrc = ssrcs[1];

                    rtxMap.set(ssrc, rtxSsrc);
                    rtxSet.add(rtxSsrc);
                }
            } catch (err) {
                _didIteratorError9 = true;
                _iteratorError9 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion9 && _iterator9.return) {
                        _iterator9.return();
                    }
                } finally {
                    if (_didIteratorError9) {
                        throw _iteratorError9;
                    }
                }
            }

            var _iteratorNormalCompletion10 = true;
            var _didIteratorError10 = false;
            var _iteratorError10 = undefined;

            try {
                for (var _iterator10 = (0, _getIterator3.default)(m.ssrcs || []), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                    var ssrcObject = _step10.value;

                    var _ssrc = ssrcObject.id;

                    // Ignore RTX.
                    if (rtxSet.has(_ssrc)) {
                        continue; // eslint-disable-line no-continue
                    }

                    var info = infos.get(_ssrc);

                    if (!info) {
                        info = {
                            kind: kind,
                            rtxSsrc: rtxMap.get(_ssrc),
                            ssrc: _ssrc
                        };

                        infos.set(_ssrc, info);
                    }

                    switch (ssrcObject.attribute) {
                        case 'cname':
                            {
                                info.cname = ssrcObject.value;
                                break;
                            }
                        case 'msid':
                            {
                                var values = ssrcObject.value.split(' ');
                                var streamId = values[0];
                                var trackId = values[1];

                                info.streamId = streamId;
                                info.trackId = trackId;
                                break;
                            }
                        case 'mslabel':
                            {
                                var _streamId = ssrcObject.value;

                                info.streamId = _streamId;
                                break;
                            }
                        case 'label':
                            {
                                var _trackId = ssrcObject.value;

                                info.trackId = _trackId;
                                break;
                            }
                    }
                }
            } catch (err) {
                _didIteratorError10 = true;
                _iteratorError10 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion10 && _iterator10.return) {
                        _iterator10.return();
                    }
                } finally {
                    if (_didIteratorError10) {
                        throw _iteratorError10;
                    }
                }
            }
        }
    } catch (err) {
        _didIteratorError8 = true;
        _iteratorError8 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion8 && _iterator8.return) {
                _iterator8.return();
            }
        } finally {
            if (_didIteratorError8) {
                throw _iteratorError8;
            }
        }
    }

    return infos;
}

/**
 * Get local ORTC RTP capabilities filtered and adapted to the given remote RTP
 * capabilities.
 * @param {RTCRtpCapabilities} filterWithCapabilities - RTP capabilities to
 * filter with.
 * @return {RTCRtpCapabilities}
 */
function getLocalCapabilities(filterWithCapabilities) {
    var localFullCapabilities = RTCRtpReceiver.getCapabilities();
    var localCapabilities = {
        codecs: [],
        fecMechanisms: [],
        headerExtensions: []
    };

    // Map of RTX and codec payloads.
    // - index: Codec payloadType
    // - value: Associated RTX payloadType
    // @type {map<Number, Number>}
    var remoteRtxMap = new _map2.default();

    // Set codecs.
    var _iteratorNormalCompletion11 = true;
    var _didIteratorError11 = false;
    var _iteratorError11 = undefined;

    try {
        var _loop2 = function _loop2() {
            var remoteCodec = _step11.value;

            var remoteCodecName = remoteCodec.name.toLowerCase();

            if (remoteCodecName === 'rtx') {
                remoteRtxMap.set(remoteCodec.parameters.apt, remoteCodec.preferredPayloadType);

                return 'continue'; // eslint-disable-line no-continue
            }

            var localCodec = localFullCapabilities.codecs.find(function (codec) {
                return codec.name.toLowerCase() === remoteCodecName && codec.kind === remoteCodec.kind && codec.clockRate === remoteCodec.clockRate;
            });

            if (!localCodec) {
                return 'continue'; // eslint-disable-line no-continue
            }

            var codec = {
                clockRate: localCodec.clockRate,
                kind: localCodec.kind,
                mimeType: localCodec.kind + '/' + localCodec.name,
                name: localCodec.name,
                numChannels: localCodec.numChannels || 1,
                parameters: {},
                preferredPayloadType: remoteCodec.preferredPayloadType,
                rtcpFeedback: []
            };

            var _iteratorNormalCompletion15 = true;
            var _didIteratorError15 = false;
            var _iteratorError15 = undefined;

            try {
                for (var _iterator15 = (0, _getIterator3.default)((0, _keys2.default)(remoteCodec.parameters)), _step15; !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done); _iteratorNormalCompletion15 = true) {
                    var remoteParamName = _step15.value;

                    var remoteParamValue = remoteCodec.parameters[remoteParamName];

                    var _iteratorNormalCompletion17 = true;
                    var _didIteratorError17 = false;
                    var _iteratorError17 = undefined;

                    try {
                        for (var _iterator17 = (0, _getIterator3.default)((0, _keys2.default)(localCodec.parameters)), _step17; !(_iteratorNormalCompletion17 = (_step17 = _iterator17.next()).done); _iteratorNormalCompletion17 = true) {
                            var localParamName = _step17.value;

                            var localParamValue = localCodec.parameters[localParamName];

                            if (localParamName !== remoteParamName) {
                                continue; // eslint-disable-line no-continue
                            }

                            // TODO: We should consider much more cases here, but Edge
                            // does not support many codec parameters.
                            if (localParamValue === remoteParamValue) {
                                // Use this RTP parameter.
                                codec.parameters[localParamName] = localParamValue;
                                break;
                            }
                        }
                    } catch (err) {
                        _didIteratorError17 = true;
                        _iteratorError17 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion17 && _iterator17.return) {
                                _iterator17.return();
                            }
                        } finally {
                            if (_didIteratorError17) {
                                throw _iteratorError17;
                            }
                        }
                    }
                }
            } catch (err) {
                _didIteratorError15 = true;
                _iteratorError15 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion15 && _iterator15.return) {
                        _iterator15.return();
                    }
                } finally {
                    if (_didIteratorError15) {
                        throw _iteratorError15;
                    }
                }
            }

            var _iteratorNormalCompletion16 = true;
            var _didIteratorError16 = false;
            var _iteratorError16 = undefined;

            try {
                var _loop3 = function _loop3() {
                    var remoteFb = _step16.value;

                    var localFb = localCodec.rtcpFeedback.find(function (fb) {
                        return fb.type === remoteFb.type && fb.parameter === remoteFb.parameter;
                    });

                    if (localFb) {
                        // Use this RTCP feedback.
                        codec.rtcpFeedback.push(localFb);
                    }
                };

                for (var _iterator16 = (0, _getIterator3.default)(remoteCodec.rtcpFeedback), _step16; !(_iteratorNormalCompletion16 = (_step16 = _iterator16.next()).done); _iteratorNormalCompletion16 = true) {
                    _loop3();
                }

                // Use this codec.
            } catch (err) {
                _didIteratorError16 = true;
                _iteratorError16 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion16 && _iterator16.return) {
                        _iterator16.return();
                    }
                } finally {
                    if (_didIteratorError16) {
                        throw _iteratorError16;
                    }
                }
            }

            localCapabilities.codecs.push(codec);
        };

        for (var _iterator11 = (0, _getIterator3.default)(filterWithCapabilities.codecs), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
            var _ret2 = _loop2();

            if (_ret2 === 'continue') continue;
        }

        // Add RTX for video codecs.
    } catch (err) {
        _didIteratorError11 = true;
        _iteratorError11 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion11 && _iterator11.return) {
                _iterator11.return();
            }
        } finally {
            if (_didIteratorError11) {
                throw _iteratorError11;
            }
        }
    }

    var _iteratorNormalCompletion12 = true;
    var _didIteratorError12 = false;
    var _iteratorError12 = undefined;

    try {
        for (var _iterator12 = (0, _getIterator3.default)(localCapabilities.codecs), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
            var _codec3 = _step12.value;

            var payloadType = _codec3.preferredPayloadType;

            if (!remoteRtxMap.has(payloadType)) {
                continue; // eslint-disable-line no-continue
            }

            var rtxCodec = {
                clockRate: _codec3.clockRate,
                kind: _codec3.kind,
                mimeType: _codec3.kind + '/rtx',
                name: 'rtx',
                parameters: {
                    apt: payloadType
                },
                preferredPayloadType: remoteRtxMap.get(payloadType),
                rtcpFeedback: []
            };

            // Add RTX codec.
            localCapabilities.codecs.push(rtxCodec);
        }

        // Add RTP header extensions.
    } catch (err) {
        _didIteratorError12 = true;
        _iteratorError12 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion12 && _iterator12.return) {
                _iterator12.return();
            }
        } finally {
            if (_didIteratorError12) {
                throw _iteratorError12;
            }
        }
    }

    var _iteratorNormalCompletion13 = true;
    var _didIteratorError13 = false;
    var _iteratorError13 = undefined;

    try {
        var _loop4 = function _loop4() {
            var remoteExtension = _step13.value;

            var localExtension = localFullCapabilities.headerExtensions.find(function (extension) {
                return extension.kind === remoteExtension.kind && extension.uri === remoteExtension.uri;
            });

            if (localExtension) {
                var extension = {
                    kind: localExtension.kind,
                    preferredEncrypt: Boolean(remoteExtension.preferredEncrypt),
                    preferredId: remoteExtension.preferredId,
                    uri: localExtension.uri
                };

                // Use this RTP header extension.
                localCapabilities.headerExtensions.push(extension);
            }
        };

        for (var _iterator13 = (0, _getIterator3.default)(filterWithCapabilities.headerExtensions), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
            _loop4();
        }

        // Add FEC mechanisms.
        // NOTE: We don't support FEC yet and, in fact, neither does Edge.
    } catch (err) {
        _didIteratorError13 = true;
        _iteratorError13 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion13 && _iterator13.return) {
                _iterator13.return();
            }
        } finally {
            if (_didIteratorError13) {
                throw _iteratorError13;
            }
        }
    }

    var _iteratorNormalCompletion14 = true;
    var _didIteratorError14 = false;
    var _iteratorError14 = undefined;

    try {
        var _loop5 = function _loop5() {
            var remoteFecMechanism = _step14.value;

            var localFecMechanism = localFullCapabilities.fecMechanisms.find(function (fec) {
                return fec === remoteFecMechanism;
            });

            if (localFecMechanism) {
                // Use this FEC mechanism.
                localCapabilities.fecMechanisms.push(localFecMechanism);
            }
        };

        for (var _iterator14 = (0, _getIterator3.default)(filterWithCapabilities.fecMechanisms), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
            _loop5();
        }
    } catch (err) {
        _didIteratorError14 = true;
        _iteratorError14 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion14 && _iterator14.return) {
                _iterator14.return();
            }
        } finally {
            if (_didIteratorError14) {
                throw _iteratorError14;
            }
        }
    }

    return localCapabilities;
}

/**
 * Get the first acive media section.
 * @param {Object} sdpObject - SDP object generated by sdp-transform.
 * @return {Object} SDP media section as parsed by sdp-transform.
 */
function getFirstActiveMediaSection(sdpObject) {
    return sdpObject.media.find(function (m) {
        return m.iceUfrag && m.port !== 0;
    });
}
},{"babel-runtime/core-js/array/from":11,"babel-runtime/core-js/get-iterator":12,"babel-runtime/core-js/map":15,"babel-runtime/core-js/object/keys":19,"babel-runtime/core-js/set":22,"sdp-transform":176}],8:[function(require,module,exports){
(function (process,global){
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
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Logger":2,"./components/Room":3,"./edge/RTCPeerConnection":4,"./edge/RTCSessionDescription":5,"./utils":10,"_process":160,"babel-runtime/helpers/classCallCheck":25,"bowser":31,"random-string":170,"url-parse":179,"wildemitter":183}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.getProtooUrl = getProtooUrl;
function getProtooUrl(media_server_wss, peerId, roomId) {
	var url = media_server_wss + '/?peer-id=' + peerId + '&room-id=' + roomId;

	return url;
}
},{}],10:[function(require,module,exports){
(function (global){
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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Logger":2,"babel-runtime/core-js/promise":21,"bowser":31,"random-number":169}],11:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/array/from"), __esModule: true };
},{"core-js/library/fn/array/from":32}],12:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/get-iterator"), __esModule: true };
},{"core-js/library/fn/get-iterator":33}],13:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/is-iterable"), __esModule: true };
},{"core-js/library/fn/is-iterable":34}],14:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/json/stringify"), __esModule: true };
},{"core-js/library/fn/json/stringify":35}],15:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/map"), __esModule: true };
},{"core-js/library/fn/map":36}],16:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/create"), __esModule: true };
},{"core-js/library/fn/object/create":37}],17:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/define-property"), __esModule: true };
},{"core-js/library/fn/object/define-property":38}],18:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/get-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/get-prototype-of":39}],19:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/keys"), __esModule: true };
},{"core-js/library/fn/object/keys":40}],20:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/set-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/set-prototype-of":41}],21:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/promise"), __esModule: true };
},{"core-js/library/fn/promise":42}],22:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/set"), __esModule: true };
},{"core-js/library/fn/set":43}],23:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/symbol"), __esModule: true };
},{"core-js/library/fn/symbol":44}],24:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/symbol/iterator"), __esModule: true };
},{"core-js/library/fn/symbol/iterator":45}],25:[function(require,module,exports){
"use strict";

exports.__esModule = true;

exports.default = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};
},{}],26:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _defineProperty = require("../core-js/object/define-property");

var _defineProperty2 = _interopRequireDefault(_defineProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      (0, _defineProperty2.default)(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();
},{"../core-js/object/define-property":17}],27:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _setPrototypeOf = require("../core-js/object/set-prototype-of");

var _setPrototypeOf2 = _interopRequireDefault(_setPrototypeOf);

var _create = require("../core-js/object/create");

var _create2 = _interopRequireDefault(_create);

var _typeof2 = require("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : (0, _typeof3.default)(superClass)));
  }

  subClass.prototype = (0, _create2.default)(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf2.default ? (0, _setPrototypeOf2.default)(subClass, superClass) : subClass.__proto__ = superClass;
};
},{"../core-js/object/create":16,"../core-js/object/set-prototype-of":20,"../helpers/typeof":30}],28:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _typeof2 = require("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && ((typeof call === "undefined" ? "undefined" : (0, _typeof3.default)(call)) === "object" || typeof call === "function") ? call : self;
};
},{"../helpers/typeof":30}],29:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _isIterable2 = require("../core-js/is-iterable");

var _isIterable3 = _interopRequireDefault(_isIterable2);

var _getIterator2 = require("../core-js/get-iterator");

var _getIterator3 = _interopRequireDefault(_getIterator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = (0, _getIterator3.default)(arr), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if ((0, _isIterable3.default)(Object(arr))) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();
},{"../core-js/get-iterator":12,"../core-js/is-iterable":13}],30:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _iterator = require("../core-js/symbol/iterator");

var _iterator2 = _interopRequireDefault(_iterator);

var _symbol = require("../core-js/symbol");

var _symbol2 = _interopRequireDefault(_symbol);

var _typeof = typeof _symbol2.default === "function" && typeof _iterator2.default === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default && obj !== _symbol2.default.prototype ? "symbol" : typeof obj; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = typeof _symbol2.default === "function" && _typeof(_iterator2.default) === "symbol" ? function (obj) {
  return typeof obj === "undefined" ? "undefined" : _typeof(obj);
} : function (obj) {
  return obj && typeof _symbol2.default === "function" && obj.constructor === _symbol2.default && obj !== _symbol2.default.prototype ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof(obj);
};
},{"../core-js/symbol":23,"../core-js/symbol/iterator":24}],31:[function(require,module,exports){
/*!
 * Bowser - a browser detector
 * https://github.com/ded/bowser
 * MIT License | (c) Dustin Diaz 2015
 */

!function (root, name, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(name, definition)
  else root[name] = definition()
}(this, 'bowser', function () {
  /**
    * See useragents.js for examples of navigator.userAgent
    */

  var t = true

  function detect(ua) {

    function getFirstMatch(regex) {
      var match = ua.match(regex);
      return (match && match.length > 1 && match[1]) || '';
    }

    function getSecondMatch(regex) {
      var match = ua.match(regex);
      return (match && match.length > 1 && match[2]) || '';
    }

    var iosdevice = getFirstMatch(/(ipod|iphone|ipad)/i).toLowerCase()
      , likeAndroid = /like android/i.test(ua)
      , android = !likeAndroid && /android/i.test(ua)
      , nexusMobile = /nexus\s*[0-6]\s*/i.test(ua)
      , nexusTablet = !nexusMobile && /nexus\s*[0-9]+/i.test(ua)
      , chromeos = /CrOS/.test(ua)
      , silk = /silk/i.test(ua)
      , sailfish = /sailfish/i.test(ua)
      , tizen = /tizen/i.test(ua)
      , webos = /(web|hpw)os/i.test(ua)
      , windowsphone = /windows phone/i.test(ua)
      , samsungBrowser = /SamsungBrowser/i.test(ua)
      , windows = !windowsphone && /windows/i.test(ua)
      , mac = !iosdevice && !silk && /macintosh/i.test(ua)
      , linux = !android && !sailfish && !tizen && !webos && /linux/i.test(ua)
      , edgeVersion = getSecondMatch(/edg([ea]|ios)\/(\d+(\.\d+)?)/i)
      , versionIdentifier = getFirstMatch(/version\/(\d+(\.\d+)?)/i)
      , tablet = /tablet/i.test(ua) && !/tablet pc/i.test(ua)
      , mobile = !tablet && /[^-]mobi/i.test(ua)
      , xbox = /xbox/i.test(ua)
      , result

    if (/opera/i.test(ua)) {
      //  an old Opera
      result = {
        name: 'Opera'
      , opera: t
      , version: versionIdentifier || getFirstMatch(/(?:opera|opr|opios)[\s\/](\d+(\.\d+)?)/i)
      }
    } else if (/opr\/|opios/i.test(ua)) {
      // a new Opera
      result = {
        name: 'Opera'
        , opera: t
        , version: getFirstMatch(/(?:opr|opios)[\s\/](\d+(\.\d+)?)/i) || versionIdentifier
      }
    }
    else if (/SamsungBrowser/i.test(ua)) {
      result = {
        name: 'Samsung Internet for Android'
        , samsungBrowser: t
        , version: versionIdentifier || getFirstMatch(/(?:SamsungBrowser)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/coast/i.test(ua)) {
      result = {
        name: 'Opera Coast'
        , coast: t
        , version: versionIdentifier || getFirstMatch(/(?:coast)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/yabrowser/i.test(ua)) {
      result = {
        name: 'Yandex Browser'
      , yandexbrowser: t
      , version: versionIdentifier || getFirstMatch(/(?:yabrowser)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/ucbrowser/i.test(ua)) {
      result = {
          name: 'UC Browser'
        , ucbrowser: t
        , version: getFirstMatch(/(?:ucbrowser)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (/mxios/i.test(ua)) {
      result = {
        name: 'Maxthon'
        , maxthon: t
        , version: getFirstMatch(/(?:mxios)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (/epiphany/i.test(ua)) {
      result = {
        name: 'Epiphany'
        , epiphany: t
        , version: getFirstMatch(/(?:epiphany)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (/puffin/i.test(ua)) {
      result = {
        name: 'Puffin'
        , puffin: t
        , version: getFirstMatch(/(?:puffin)[\s\/](\d+(?:\.\d+)?)/i)
      }
    }
    else if (/sleipnir/i.test(ua)) {
      result = {
        name: 'Sleipnir'
        , sleipnir: t
        , version: getFirstMatch(/(?:sleipnir)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (/k-meleon/i.test(ua)) {
      result = {
        name: 'K-Meleon'
        , kMeleon: t
        , version: getFirstMatch(/(?:k-meleon)[\s\/](\d+(?:\.\d+)+)/i)
      }
    }
    else if (windowsphone) {
      result = {
        name: 'Windows Phone'
      , osname: 'Windows Phone'
      , windowsphone: t
      }
      if (edgeVersion) {
        result.msedge = t
        result.version = edgeVersion
      }
      else {
        result.msie = t
        result.version = getFirstMatch(/iemobile\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/msie|trident/i.test(ua)) {
      result = {
        name: 'Internet Explorer'
      , msie: t
      , version: getFirstMatch(/(?:msie |rv:)(\d+(\.\d+)?)/i)
      }
    } else if (chromeos) {
      result = {
        name: 'Chrome'
      , osname: 'Chrome OS'
      , chromeos: t
      , chromeBook: t
      , chrome: t
      , version: getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i)
      }
    } else if (/edg([ea]|ios)/i.test(ua)) {
      result = {
        name: 'Microsoft Edge'
      , msedge: t
      , version: edgeVersion
      }
    }
    else if (/vivaldi/i.test(ua)) {
      result = {
        name: 'Vivaldi'
        , vivaldi: t
        , version: getFirstMatch(/vivaldi\/(\d+(\.\d+)?)/i) || versionIdentifier
      }
    }
    else if (sailfish) {
      result = {
        name: 'Sailfish'
      , osname: 'Sailfish OS'
      , sailfish: t
      , version: getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/seamonkey\//i.test(ua)) {
      result = {
        name: 'SeaMonkey'
      , seamonkey: t
      , version: getFirstMatch(/seamonkey\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/firefox|iceweasel|fxios/i.test(ua)) {
      result = {
        name: 'Firefox'
      , firefox: t
      , version: getFirstMatch(/(?:firefox|iceweasel|fxios)[ \/](\d+(\.\d+)?)/i)
      }
      if (/\((mobile|tablet);[^\)]*rv:[\d\.]+\)/i.test(ua)) {
        result.firefoxos = t
        result.osname = 'Firefox OS'
      }
    }
    else if (silk) {
      result =  {
        name: 'Amazon Silk'
      , silk: t
      , version : getFirstMatch(/silk\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/phantom/i.test(ua)) {
      result = {
        name: 'PhantomJS'
      , phantom: t
      , version: getFirstMatch(/phantomjs\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/slimerjs/i.test(ua)) {
      result = {
        name: 'SlimerJS'
        , slimer: t
        , version: getFirstMatch(/slimerjs\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/blackberry|\bbb\d+/i.test(ua) || /rim\stablet/i.test(ua)) {
      result = {
        name: 'BlackBerry'
      , osname: 'BlackBerry OS'
      , blackberry: t
      , version: versionIdentifier || getFirstMatch(/blackberry[\d]+\/(\d+(\.\d+)?)/i)
      }
    }
    else if (webos) {
      result = {
        name: 'WebOS'
      , osname: 'WebOS'
      , webos: t
      , version: versionIdentifier || getFirstMatch(/w(?:eb)?osbrowser\/(\d+(\.\d+)?)/i)
      };
      /touchpad\//i.test(ua) && (result.touchpad = t)
    }
    else if (/bada/i.test(ua)) {
      result = {
        name: 'Bada'
      , osname: 'Bada'
      , bada: t
      , version: getFirstMatch(/dolfin\/(\d+(\.\d+)?)/i)
      };
    }
    else if (tizen) {
      result = {
        name: 'Tizen'
      , osname: 'Tizen'
      , tizen: t
      , version: getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.\d+)?)/i) || versionIdentifier
      };
    }
    else if (/qupzilla/i.test(ua)) {
      result = {
        name: 'QupZilla'
        , qupzilla: t
        , version: getFirstMatch(/(?:qupzilla)[\s\/](\d+(?:\.\d+)+)/i) || versionIdentifier
      }
    }
    else if (/chromium/i.test(ua)) {
      result = {
        name: 'Chromium'
        , chromium: t
        , version: getFirstMatch(/(?:chromium)[\s\/](\d+(?:\.\d+)?)/i) || versionIdentifier
      }
    }
    else if (/chrome|crios|crmo/i.test(ua)) {
      result = {
        name: 'Chrome'
        , chrome: t
        , version: getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i)
      }
    }
    else if (android) {
      result = {
        name: 'Android'
        , version: versionIdentifier
      }
    }
    else if (/safari|applewebkit/i.test(ua)) {
      result = {
        name: 'Safari'
      , safari: t
      }
      if (versionIdentifier) {
        result.version = versionIdentifier
      }
    }
    else if (iosdevice) {
      result = {
        name : iosdevice == 'iphone' ? 'iPhone' : iosdevice == 'ipad' ? 'iPad' : 'iPod'
      }
      // WTF: version is not part of user agent in web apps
      if (versionIdentifier) {
        result.version = versionIdentifier
      }
    }
    else if(/googlebot/i.test(ua)) {
      result = {
        name: 'Googlebot'
      , googlebot: t
      , version: getFirstMatch(/googlebot\/(\d+(\.\d+))/i) || versionIdentifier
      }
    }
    else {
      result = {
        name: getFirstMatch(/^(.*)\/(.*) /),
        version: getSecondMatch(/^(.*)\/(.*) /)
     };
   }

    // set webkit or gecko flag for browsers based on these engines
    if (!result.msedge && /(apple)?webkit/i.test(ua)) {
      if (/(apple)?webkit\/537\.36/i.test(ua)) {
        result.name = result.name || "Blink"
        result.blink = t
      } else {
        result.name = result.name || "Webkit"
        result.webkit = t
      }
      if (!result.version && versionIdentifier) {
        result.version = versionIdentifier
      }
    } else if (!result.opera && /gecko\//i.test(ua)) {
      result.name = result.name || "Gecko"
      result.gecko = t
      result.version = result.version || getFirstMatch(/gecko\/(\d+(\.\d+)?)/i)
    }

    // set OS flags for platforms that have multiple browsers
    if (!result.windowsphone && (android || result.silk)) {
      result.android = t
      result.osname = 'Android'
    } else if (!result.windowsphone && iosdevice) {
      result[iosdevice] = t
      result.ios = t
      result.osname = 'iOS'
    } else if (mac) {
      result.mac = t
      result.osname = 'macOS'
    } else if (xbox) {
      result.xbox = t
      result.osname = 'Xbox'
    } else if (windows) {
      result.windows = t
      result.osname = 'Windows'
    } else if (linux) {
      result.linux = t
      result.osname = 'Linux'
    }

    function getWindowsVersion (s) {
      switch (s) {
        case 'NT': return 'NT'
        case 'XP': return 'XP'
        case 'NT 5.0': return '2000'
        case 'NT 5.1': return 'XP'
        case 'NT 5.2': return '2003'
        case 'NT 6.0': return 'Vista'
        case 'NT 6.1': return '7'
        case 'NT 6.2': return '8'
        case 'NT 6.3': return '8.1'
        case 'NT 10.0': return '10'
        default: return undefined
      }
    }

    // OS version extraction
    var osVersion = '';
    if (result.windows) {
      osVersion = getWindowsVersion(getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i))
    } else if (result.windowsphone) {
      osVersion = getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i);
    } else if (result.mac) {
      osVersion = getFirstMatch(/Mac OS X (\d+([_\.\s]\d+)*)/i);
      osVersion = osVersion.replace(/[_\s]/g, '.');
    } else if (iosdevice) {
      osVersion = getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i);
      osVersion = osVersion.replace(/[_\s]/g, '.');
    } else if (android) {
      osVersion = getFirstMatch(/android[ \/-](\d+(\.\d+)*)/i);
    } else if (result.webos) {
      osVersion = getFirstMatch(/(?:web|hpw)os\/(\d+(\.\d+)*)/i);
    } else if (result.blackberry) {
      osVersion = getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i);
    } else if (result.bada) {
      osVersion = getFirstMatch(/bada\/(\d+(\.\d+)*)/i);
    } else if (result.tizen) {
      osVersion = getFirstMatch(/tizen[\/\s](\d+(\.\d+)*)/i);
    }
    if (osVersion) {
      result.osversion = osVersion;
    }

    // device type extraction
    var osMajorVersion = !result.windows && osVersion.split('.')[0];
    if (
         tablet
      || nexusTablet
      || iosdevice == 'ipad'
      || (android && (osMajorVersion == 3 || (osMajorVersion >= 4 && !mobile)))
      || result.silk
    ) {
      result.tablet = t
    } else if (
         mobile
      || iosdevice == 'iphone'
      || iosdevice == 'ipod'
      || android
      || nexusMobile
      || result.blackberry
      || result.webos
      || result.bada
    ) {
      result.mobile = t
    }

    // Graded Browser Support
    // http://developer.yahoo.com/yui/articles/gbs
    if (result.msedge ||
        (result.msie && result.version >= 10) ||
        (result.yandexbrowser && result.version >= 15) ||
		    (result.vivaldi && result.version >= 1.0) ||
        (result.chrome && result.version >= 20) ||
        (result.samsungBrowser && result.version >= 4) ||
        (result.firefox && result.version >= 20.0) ||
        (result.safari && result.version >= 6) ||
        (result.opera && result.version >= 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] >= 6) ||
        (result.blackberry && result.version >= 10.1)
        || (result.chromium && result.version >= 20)
        ) {
      result.a = t;
    }
    else if ((result.msie && result.version < 10) ||
        (result.chrome && result.version < 20) ||
        (result.firefox && result.version < 20.0) ||
        (result.safari && result.version < 6) ||
        (result.opera && result.version < 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] < 6)
        || (result.chromium && result.version < 20)
        ) {
      result.c = t
    } else result.x = t

    return result
  }

  var bowser = detect(typeof navigator !== 'undefined' ? navigator.userAgent || '' : '')

  bowser.test = function (browserList) {
    for (var i = 0; i < browserList.length; ++i) {
      var browserItem = browserList[i];
      if (typeof browserItem=== 'string') {
        if (browserItem in bowser) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get version precisions count
   *
   * @example
   *   getVersionPrecision("1.10.3") // 3
   *
   * @param  {string} version
   * @return {number}
   */
  function getVersionPrecision(version) {
    return version.split(".").length;
  }

  /**
   * Array::map polyfill
   *
   * @param  {Array} arr
   * @param  {Function} iterator
   * @return {Array}
   */
  function map(arr, iterator) {
    var result = [], i;
    if (Array.prototype.map) {
      return Array.prototype.map.call(arr, iterator);
    }
    for (i = 0; i < arr.length; i++) {
      result.push(iterator(arr[i]));
    }
    return result;
  }

  /**
   * Calculate browser version weight
   *
   * @example
   *   compareVersions(['1.10.2.1',  '1.8.2.1.90'])    // 1
   *   compareVersions(['1.010.2.1', '1.09.2.1.90']);  // 1
   *   compareVersions(['1.10.2.1',  '1.10.2.1']);     // 0
   *   compareVersions(['1.10.2.1',  '1.0800.2']);     // -1
   *
   * @param  {Array<String>} versions versions to compare
   * @return {Number} comparison result
   */
  function compareVersions(versions) {
    // 1) get common precision for both versions, for example for "10.0" and "9" it should be 2
    var precision = Math.max(getVersionPrecision(versions[0]), getVersionPrecision(versions[1]));
    var chunks = map(versions, function (version) {
      var delta = precision - getVersionPrecision(version);

      // 2) "9" -> "9.0" (for precision = 2)
      version = version + new Array(delta + 1).join(".0");

      // 3) "9.0" -> ["000000000"", "000000009"]
      return map(version.split("."), function (chunk) {
        return new Array(20 - chunk.length).join("0") + chunk;
      }).reverse();
    });

    // iterate in reverse order by reversed chunks array
    while (--precision >= 0) {
      // 4) compare: "000000009" > "000000010" = false (but "9" > "10" = true)
      if (chunks[0][precision] > chunks[1][precision]) {
        return 1;
      }
      else if (chunks[0][precision] === chunks[1][precision]) {
        if (precision === 0) {
          // all version chunks are same
          return 0;
        }
      }
      else {
        return -1;
      }
    }
  }

  /**
   * Check if browser is unsupported
   *
   * @example
   *   bowser.isUnsupportedBrowser({
   *     msie: "10",
   *     firefox: "23",
   *     chrome: "29",
   *     safari: "5.1",
   *     opera: "16",
   *     phantom: "534"
   *   });
   *
   * @param  {Object}  minVersions map of minimal version to browser
   * @param  {Boolean} [strictMode = false] flag to return false if browser wasn't found in map
   * @param  {String}  [ua] user agent string
   * @return {Boolean}
   */
  function isUnsupportedBrowser(minVersions, strictMode, ua) {
    var _bowser = bowser;

    // make strictMode param optional with ua param usage
    if (typeof strictMode === 'string') {
      ua = strictMode;
      strictMode = void(0);
    }

    if (strictMode === void(0)) {
      strictMode = false;
    }
    if (ua) {
      _bowser = detect(ua);
    }

    var version = "" + _bowser.version;
    for (var browser in minVersions) {
      if (minVersions.hasOwnProperty(browser)) {
        if (_bowser[browser]) {
          if (typeof minVersions[browser] !== 'string') {
            throw new Error('Browser version in the minVersion map should be a string: ' + browser + ': ' + String(minVersions));
          }

          // browser version and min supported version.
          return compareVersions([version, minVersions[browser]]) < 0;
        }
      }
    }

    return strictMode; // not found
  }

  /**
   * Check if browser is supported
   *
   * @param  {Object} minVersions map of minimal version to browser
   * @param  {Boolean} [strictMode = false] flag to return false if browser wasn't found in map
   * @param  {String}  [ua] user agent string
   * @return {Boolean}
   */
  function check(minVersions, strictMode, ua) {
    return !isUnsupportedBrowser(minVersions, strictMode, ua);
  }

  bowser.isUnsupportedBrowser = isUnsupportedBrowser;
  bowser.compareVersions = compareVersions;
  bowser.check = check;

  /*
   * Set our detect method to the main bowser object so we can
   * reuse it to test other user agents.
   * This is needed to implement future tests.
   */
  bowser._detect = detect;

  return bowser
});

},{}],32:[function(require,module,exports){
require('../../modules/es6.string.iterator');
require('../../modules/es6.array.from');
module.exports = require('../../modules/_core').Array.from;

},{"../../modules/_core":60,"../../modules/es6.array.from":132,"../../modules/es6.string.iterator":143}],33:[function(require,module,exports){
require('../modules/web.dom.iterable');
require('../modules/es6.string.iterator');
module.exports = require('../modules/core.get-iterator');

},{"../modules/core.get-iterator":130,"../modules/es6.string.iterator":143,"../modules/web.dom.iterable":155}],34:[function(require,module,exports){
require('../modules/web.dom.iterable');
require('../modules/es6.string.iterator');
module.exports = require('../modules/core.is-iterable');

},{"../modules/core.is-iterable":131,"../modules/es6.string.iterator":143,"../modules/web.dom.iterable":155}],35:[function(require,module,exports){
var core = require('../../modules/_core');
var $JSON = core.JSON || (core.JSON = { stringify: JSON.stringify });
module.exports = function stringify(it) { // eslint-disable-line no-unused-vars
  return $JSON.stringify.apply($JSON, arguments);
};

},{"../../modules/_core":60}],36:[function(require,module,exports){
require('../modules/es6.object.to-string');
require('../modules/es6.string.iterator');
require('../modules/web.dom.iterable');
require('../modules/es6.map');
require('../modules/es7.map.to-json');
require('../modules/es7.map.of');
require('../modules/es7.map.from');
module.exports = require('../modules/_core').Map;

},{"../modules/_core":60,"../modules/es6.map":134,"../modules/es6.object.to-string":140,"../modules/es6.string.iterator":143,"../modules/es7.map.from":145,"../modules/es7.map.of":146,"../modules/es7.map.to-json":147,"../modules/web.dom.iterable":155}],37:[function(require,module,exports){
require('../../modules/es6.object.create');
var $Object = require('../../modules/_core').Object;
module.exports = function create(P, D) {
  return $Object.create(P, D);
};

},{"../../modules/_core":60,"../../modules/es6.object.create":135}],38:[function(require,module,exports){
require('../../modules/es6.object.define-property');
var $Object = require('../../modules/_core').Object;
module.exports = function defineProperty(it, key, desc) {
  return $Object.defineProperty(it, key, desc);
};

},{"../../modules/_core":60,"../../modules/es6.object.define-property":136}],39:[function(require,module,exports){
require('../../modules/es6.object.get-prototype-of');
module.exports = require('../../modules/_core').Object.getPrototypeOf;

},{"../../modules/_core":60,"../../modules/es6.object.get-prototype-of":137}],40:[function(require,module,exports){
require('../../modules/es6.object.keys');
module.exports = require('../../modules/_core').Object.keys;

},{"../../modules/_core":60,"../../modules/es6.object.keys":138}],41:[function(require,module,exports){
require('../../modules/es6.object.set-prototype-of');
module.exports = require('../../modules/_core').Object.setPrototypeOf;

},{"../../modules/_core":60,"../../modules/es6.object.set-prototype-of":139}],42:[function(require,module,exports){
require('../modules/es6.object.to-string');
require('../modules/es6.string.iterator');
require('../modules/web.dom.iterable');
require('../modules/es6.promise');
require('../modules/es7.promise.finally');
require('../modules/es7.promise.try');
module.exports = require('../modules/_core').Promise;

},{"../modules/_core":60,"../modules/es6.object.to-string":140,"../modules/es6.promise":141,"../modules/es6.string.iterator":143,"../modules/es7.promise.finally":148,"../modules/es7.promise.try":149,"../modules/web.dom.iterable":155}],43:[function(require,module,exports){
require('../modules/es6.object.to-string');
require('../modules/es6.string.iterator');
require('../modules/web.dom.iterable');
require('../modules/es6.set');
require('../modules/es7.set.to-json');
require('../modules/es7.set.of');
require('../modules/es7.set.from');
module.exports = require('../modules/_core').Set;

},{"../modules/_core":60,"../modules/es6.object.to-string":140,"../modules/es6.set":142,"../modules/es6.string.iterator":143,"../modules/es7.set.from":150,"../modules/es7.set.of":151,"../modules/es7.set.to-json":152,"../modules/web.dom.iterable":155}],44:[function(require,module,exports){
require('../../modules/es6.symbol');
require('../../modules/es6.object.to-string');
require('../../modules/es7.symbol.async-iterator');
require('../../modules/es7.symbol.observable');
module.exports = require('../../modules/_core').Symbol;

},{"../../modules/_core":60,"../../modules/es6.object.to-string":140,"../../modules/es6.symbol":144,"../../modules/es7.symbol.async-iterator":153,"../../modules/es7.symbol.observable":154}],45:[function(require,module,exports){
require('../../modules/es6.string.iterator');
require('../../modules/web.dom.iterable');
module.exports = require('../../modules/_wks-ext').f('iterator');

},{"../../modules/_wks-ext":127,"../../modules/es6.string.iterator":143,"../../modules/web.dom.iterable":155}],46:[function(require,module,exports){
module.exports = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};

},{}],47:[function(require,module,exports){
module.exports = function () { /* empty */ };

},{}],48:[function(require,module,exports){
module.exports = function (it, Constructor, name, forbiddenField) {
  if (!(it instanceof Constructor) || (forbiddenField !== undefined && forbiddenField in it)) {
    throw TypeError(name + ': incorrect invocation!');
  } return it;
};

},{}],49:[function(require,module,exports){
var isObject = require('./_is-object');
module.exports = function (it) {
  if (!isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};

},{"./_is-object":80}],50:[function(require,module,exports){
var forOf = require('./_for-of');

module.exports = function (iter, ITERATOR) {
  var result = [];
  forOf(iter, false, result.push, result, ITERATOR);
  return result;
};

},{"./_for-of":70}],51:[function(require,module,exports){
// false -> Array#indexOf
// true  -> Array#includes
var toIObject = require('./_to-iobject');
var toLength = require('./_to-length');
var toAbsoluteIndex = require('./_to-absolute-index');
module.exports = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
      if (O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

},{"./_to-absolute-index":118,"./_to-iobject":120,"./_to-length":121}],52:[function(require,module,exports){
// 0 -> Array#forEach
// 1 -> Array#map
// 2 -> Array#filter
// 3 -> Array#some
// 4 -> Array#every
// 5 -> Array#find
// 6 -> Array#findIndex
var ctx = require('./_ctx');
var IObject = require('./_iobject');
var toObject = require('./_to-object');
var toLength = require('./_to-length');
var asc = require('./_array-species-create');
module.exports = function (TYPE, $create) {
  var IS_MAP = TYPE == 1;
  var IS_FILTER = TYPE == 2;
  var IS_SOME = TYPE == 3;
  var IS_EVERY = TYPE == 4;
  var IS_FIND_INDEX = TYPE == 6;
  var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
  var create = $create || asc;
  return function ($this, callbackfn, that) {
    var O = toObject($this);
    var self = IObject(O);
    var f = ctx(callbackfn, that, 3);
    var length = toLength(self.length);
    var index = 0;
    var result = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined;
    var val, res;
    for (;length > index; index++) if (NO_HOLES || index in self) {
      val = self[index];
      res = f(val, index, O);
      if (TYPE) {
        if (IS_MAP) result[index] = res;   // map
        else if (res) switch (TYPE) {
          case 3: return true;             // some
          case 5: return val;              // find
          case 6: return index;            // findIndex
          case 2: result.push(val);        // filter
        } else if (IS_EVERY) return false; // every
      }
    }
    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
  };
};

},{"./_array-species-create":54,"./_ctx":62,"./_iobject":77,"./_to-length":121,"./_to-object":122}],53:[function(require,module,exports){
var isObject = require('./_is-object');
var isArray = require('./_is-array');
var SPECIES = require('./_wks')('species');

module.exports = function (original) {
  var C;
  if (isArray(original)) {
    C = original.constructor;
    // cross-realm fallback
    if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
    if (isObject(C)) {
      C = C[SPECIES];
      if (C === null) C = undefined;
    }
  } return C === undefined ? Array : C;
};

},{"./_is-array":79,"./_is-object":80,"./_wks":128}],54:[function(require,module,exports){
// 9.4.2.3 ArraySpeciesCreate(originalArray, length)
var speciesConstructor = require('./_array-species-constructor');

module.exports = function (original, length) {
  return new (speciesConstructor(original))(length);
};

},{"./_array-species-constructor":53}],55:[function(require,module,exports){
// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = require('./_cof');
var TAG = require('./_wks')('toStringTag');
// ES3 wrong here
var ARG = cof(function () { return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function (it, key) {
  try {
    return it[key];
  } catch (e) { /* empty */ }
};

module.exports = function (it) {
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};

},{"./_cof":56,"./_wks":128}],56:[function(require,module,exports){
var toString = {}.toString;

module.exports = function (it) {
  return toString.call(it).slice(8, -1);
};

},{}],57:[function(require,module,exports){
'use strict';
var dP = require('./_object-dp').f;
var create = require('./_object-create');
var redefineAll = require('./_redefine-all');
var ctx = require('./_ctx');
var anInstance = require('./_an-instance');
var forOf = require('./_for-of');
var $iterDefine = require('./_iter-define');
var step = require('./_iter-step');
var setSpecies = require('./_set-species');
var DESCRIPTORS = require('./_descriptors');
var fastKey = require('./_meta').fastKey;
var validate = require('./_validate-collection');
var SIZE = DESCRIPTORS ? '_s' : 'size';

var getEntry = function (that, key) {
  // fast case
  var index = fastKey(key);
  var entry;
  if (index !== 'F') return that._i[index];
  // frozen object case
  for (entry = that._f; entry; entry = entry.n) {
    if (entry.k == key) return entry;
  }
};

module.exports = {
  getConstructor: function (wrapper, NAME, IS_MAP, ADDER) {
    var C = wrapper(function (that, iterable) {
      anInstance(that, C, NAME, '_i');
      that._t = NAME;         // collection type
      that._i = create(null); // index
      that._f = undefined;    // first entry
      that._l = undefined;    // last entry
      that[SIZE] = 0;         // size
      if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      // 23.1.3.1 Map.prototype.clear()
      // 23.2.3.2 Set.prototype.clear()
      clear: function clear() {
        for (var that = validate(this, NAME), data = that._i, entry = that._f; entry; entry = entry.n) {
          entry.r = true;
          if (entry.p) entry.p = entry.p.n = undefined;
          delete data[entry.i];
        }
        that._f = that._l = undefined;
        that[SIZE] = 0;
      },
      // 23.1.3.3 Map.prototype.delete(key)
      // 23.2.3.4 Set.prototype.delete(value)
      'delete': function (key) {
        var that = validate(this, NAME);
        var entry = getEntry(that, key);
        if (entry) {
          var next = entry.n;
          var prev = entry.p;
          delete that._i[entry.i];
          entry.r = true;
          if (prev) prev.n = next;
          if (next) next.p = prev;
          if (that._f == entry) that._f = next;
          if (that._l == entry) that._l = prev;
          that[SIZE]--;
        } return !!entry;
      },
      // 23.2.3.6 Set.prototype.forEach(callbackfn, thisArg = undefined)
      // 23.1.3.5 Map.prototype.forEach(callbackfn, thisArg = undefined)
      forEach: function forEach(callbackfn /* , that = undefined */) {
        validate(this, NAME);
        var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3);
        var entry;
        while (entry = entry ? entry.n : this._f) {
          f(entry.v, entry.k, this);
          // revert to the last existing entry
          while (entry && entry.r) entry = entry.p;
        }
      },
      // 23.1.3.7 Map.prototype.has(key)
      // 23.2.3.7 Set.prototype.has(value)
      has: function has(key) {
        return !!getEntry(validate(this, NAME), key);
      }
    });
    if (DESCRIPTORS) dP(C.prototype, 'size', {
      get: function () {
        return validate(this, NAME)[SIZE];
      }
    });
    return C;
  },
  def: function (that, key, value) {
    var entry = getEntry(that, key);
    var prev, index;
    // change existing entry
    if (entry) {
      entry.v = value;
    // create new entry
    } else {
      that._l = entry = {
        i: index = fastKey(key, true), // <- index
        k: key,                        // <- key
        v: value,                      // <- value
        p: prev = that._l,             // <- previous entry
        n: undefined,                  // <- next entry
        r: false                       // <- removed
      };
      if (!that._f) that._f = entry;
      if (prev) prev.n = entry;
      that[SIZE]++;
      // add to index
      if (index !== 'F') that._i[index] = entry;
    } return that;
  },
  getEntry: getEntry,
  setStrong: function (C, NAME, IS_MAP) {
    // add .keys, .values, .entries, [@@iterator]
    // 23.1.3.4, 23.1.3.8, 23.1.3.11, 23.1.3.12, 23.2.3.5, 23.2.3.8, 23.2.3.10, 23.2.3.11
    $iterDefine(C, NAME, function (iterated, kind) {
      this._t = validate(iterated, NAME); // target
      this._k = kind;                     // kind
      this._l = undefined;                // previous
    }, function () {
      var that = this;
      var kind = that._k;
      var entry = that._l;
      // revert to the last existing entry
      while (entry && entry.r) entry = entry.p;
      // get next entry
      if (!that._t || !(that._l = entry = entry ? entry.n : that._t._f)) {
        // or finish the iteration
        that._t = undefined;
        return step(1);
      }
      // return step by kind
      if (kind == 'keys') return step(0, entry.k);
      if (kind == 'values') return step(0, entry.v);
      return step(0, [entry.k, entry.v]);
    }, IS_MAP ? 'entries' : 'values', !IS_MAP, true);

    // add [@@species], 23.1.2.2, 23.2.2.2
    setSpecies(NAME);
  }
};

},{"./_an-instance":48,"./_ctx":62,"./_descriptors":64,"./_for-of":70,"./_iter-define":83,"./_iter-step":85,"./_meta":88,"./_object-create":91,"./_object-dp":92,"./_redefine-all":106,"./_set-species":111,"./_validate-collection":125}],58:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var classof = require('./_classof');
var from = require('./_array-from-iterable');
module.exports = function (NAME) {
  return function toJSON() {
    if (classof(this) != NAME) throw TypeError(NAME + "#toJSON isn't generic");
    return from(this);
  };
};

},{"./_array-from-iterable":50,"./_classof":55}],59:[function(require,module,exports){
'use strict';
var global = require('./_global');
var $export = require('./_export');
var meta = require('./_meta');
var fails = require('./_fails');
var hide = require('./_hide');
var redefineAll = require('./_redefine-all');
var forOf = require('./_for-of');
var anInstance = require('./_an-instance');
var isObject = require('./_is-object');
var setToStringTag = require('./_set-to-string-tag');
var dP = require('./_object-dp').f;
var each = require('./_array-methods')(0);
var DESCRIPTORS = require('./_descriptors');

module.exports = function (NAME, wrapper, methods, common, IS_MAP, IS_WEAK) {
  var Base = global[NAME];
  var C = Base;
  var ADDER = IS_MAP ? 'set' : 'add';
  var proto = C && C.prototype;
  var O = {};
  if (!DESCRIPTORS || typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function () {
    new C().entries().next();
  }))) {
    // create collection constructor
    C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
    redefineAll(C.prototype, methods);
    meta.NEED = true;
  } else {
    C = wrapper(function (target, iterable) {
      anInstance(target, C, NAME, '_c');
      target._c = new Base();
      if (iterable != undefined) forOf(iterable, IS_MAP, target[ADDER], target);
    });
    each('add,clear,delete,forEach,get,has,set,keys,values,entries,toJSON'.split(','), function (KEY) {
      var IS_ADDER = KEY == 'add' || KEY == 'set';
      if (KEY in proto && !(IS_WEAK && KEY == 'clear')) hide(C.prototype, KEY, function (a, b) {
        anInstance(this, C, KEY);
        if (!IS_ADDER && IS_WEAK && !isObject(a)) return KEY == 'get' ? undefined : false;
        var result = this._c[KEY](a === 0 ? 0 : a, b);
        return IS_ADDER ? this : result;
      });
    });
    IS_WEAK || dP(C.prototype, 'size', {
      get: function () {
        return this._c.size;
      }
    });
  }

  setToStringTag(C, NAME);

  O[NAME] = C;
  $export($export.G + $export.W + $export.F, O);

  if (!IS_WEAK) common.setStrong(C, NAME, IS_MAP);

  return C;
};

},{"./_an-instance":48,"./_array-methods":52,"./_descriptors":64,"./_export":68,"./_fails":69,"./_for-of":70,"./_global":71,"./_hide":73,"./_is-object":80,"./_meta":88,"./_object-dp":92,"./_redefine-all":106,"./_set-to-string-tag":112}],60:[function(require,module,exports){
var core = module.exports = { version: '2.5.3' };
if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef

},{}],61:[function(require,module,exports){
'use strict';
var $defineProperty = require('./_object-dp');
var createDesc = require('./_property-desc');

module.exports = function (object, index, value) {
  if (index in object) $defineProperty.f(object, index, createDesc(0, value));
  else object[index] = value;
};

},{"./_object-dp":92,"./_property-desc":105}],62:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./_a-function');
module.exports = function (fn, that, length) {
  aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

},{"./_a-function":46}],63:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};

},{}],64:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./_fails')(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});

},{"./_fails":69}],65:[function(require,module,exports){
var isObject = require('./_is-object');
var document = require('./_global').document;
// typeof document.createElement is 'object' in old IE
var is = isObject(document) && isObject(document.createElement);
module.exports = function (it) {
  return is ? document.createElement(it) : {};
};

},{"./_global":71,"./_is-object":80}],66:[function(require,module,exports){
// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');

},{}],67:[function(require,module,exports){
// all enumerable object keys, includes symbols
var getKeys = require('./_object-keys');
var gOPS = require('./_object-gops');
var pIE = require('./_object-pie');
module.exports = function (it) {
  var result = getKeys(it);
  var getSymbols = gOPS.f;
  if (getSymbols) {
    var symbols = getSymbols(it);
    var isEnum = pIE.f;
    var i = 0;
    var key;
    while (symbols.length > i) if (isEnum.call(it, key = symbols[i++])) result.push(key);
  } return result;
};

},{"./_object-gops":97,"./_object-keys":100,"./_object-pie":101}],68:[function(require,module,exports){
var global = require('./_global');
var core = require('./_core');
var ctx = require('./_ctx');
var hide = require('./_hide');
var PROTOTYPE = 'prototype';

var $export = function (type, name, source) {
  var IS_FORCED = type & $export.F;
  var IS_GLOBAL = type & $export.G;
  var IS_STATIC = type & $export.S;
  var IS_PROTO = type & $export.P;
  var IS_BIND = type & $export.B;
  var IS_WRAP = type & $export.W;
  var exports = IS_GLOBAL ? core : core[name] || (core[name] = {});
  var expProto = exports[PROTOTYPE];
  var target = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE];
  var key, own, out;
  if (IS_GLOBAL) source = name;
  for (key in source) {
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if (own && key in exports) continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function (C) {
      var F = function (a, b, c) {
        if (this instanceof C) {
          switch (arguments.length) {
            case 0: return new C();
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if (IS_PROTO) {
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if (type & $export.R && expProto && !expProto[key]) hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library`
module.exports = $export;

},{"./_core":60,"./_ctx":62,"./_global":71,"./_hide":73}],69:[function(require,module,exports){
module.exports = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};

},{}],70:[function(require,module,exports){
var ctx = require('./_ctx');
var call = require('./_iter-call');
var isArrayIter = require('./_is-array-iter');
var anObject = require('./_an-object');
var toLength = require('./_to-length');
var getIterFn = require('./core.get-iterator-method');
var BREAK = {};
var RETURN = {};
var exports = module.exports = function (iterable, entries, fn, that, ITERATOR) {
  var iterFn = ITERATOR ? function () { return iterable; } : getIterFn(iterable);
  var f = ctx(fn, that, entries ? 2 : 1);
  var index = 0;
  var length, step, iterator, result;
  if (typeof iterFn != 'function') throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if (isArrayIter(iterFn)) for (length = toLength(iterable.length); length > index; index++) {
    result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
    if (result === BREAK || result === RETURN) return result;
  } else for (iterator = iterFn.call(iterable); !(step = iterator.next()).done;) {
    result = call(iterator, f, step.value, entries);
    if (result === BREAK || result === RETURN) return result;
  }
};
exports.BREAK = BREAK;
exports.RETURN = RETURN;

},{"./_an-object":49,"./_ctx":62,"./_is-array-iter":78,"./_iter-call":81,"./_to-length":121,"./core.get-iterator-method":129}],71:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self
  // eslint-disable-next-line no-new-func
  : Function('return this')();
if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef

},{}],72:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function (it, key) {
  return hasOwnProperty.call(it, key);
};

},{}],73:[function(require,module,exports){
var dP = require('./_object-dp');
var createDesc = require('./_property-desc');
module.exports = require('./_descriptors') ? function (object, key, value) {
  return dP.f(object, key, createDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

},{"./_descriptors":64,"./_object-dp":92,"./_property-desc":105}],74:[function(require,module,exports){
var document = require('./_global').document;
module.exports = document && document.documentElement;

},{"./_global":71}],75:[function(require,module,exports){
module.exports = !require('./_descriptors') && !require('./_fails')(function () {
  return Object.defineProperty(require('./_dom-create')('div'), 'a', { get: function () { return 7; } }).a != 7;
});

},{"./_descriptors":64,"./_dom-create":65,"./_fails":69}],76:[function(require,module,exports){
// fast apply, http://jsperf.lnkit.com/fast-apply/5
module.exports = function (fn, args, that) {
  var un = that === undefined;
  switch (args.length) {
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
  } return fn.apply(that, args);
};

},{}],77:[function(require,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = require('./_cof');
// eslint-disable-next-line no-prototype-builtins
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
  return cof(it) == 'String' ? it.split('') : Object(it);
};

},{"./_cof":56}],78:[function(require,module,exports){
// check on default Array iterator
var Iterators = require('./_iterators');
var ITERATOR = require('./_wks')('iterator');
var ArrayProto = Array.prototype;

module.exports = function (it) {
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};

},{"./_iterators":86,"./_wks":128}],79:[function(require,module,exports){
// 7.2.2 IsArray(argument)
var cof = require('./_cof');
module.exports = Array.isArray || function isArray(arg) {
  return cof(arg) == 'Array';
};

},{"./_cof":56}],80:[function(require,module,exports){
module.exports = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

},{}],81:[function(require,module,exports){
// call something on iterator step with safe closing on error
var anObject = require('./_an-object');
module.exports = function (iterator, fn, value, entries) {
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch (e) {
    var ret = iterator['return'];
    if (ret !== undefined) anObject(ret.call(iterator));
    throw e;
  }
};

},{"./_an-object":49}],82:[function(require,module,exports){
'use strict';
var create = require('./_object-create');
var descriptor = require('./_property-desc');
var setToStringTag = require('./_set-to-string-tag');
var IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./_hide')(IteratorPrototype, require('./_wks')('iterator'), function () { return this; });

module.exports = function (Constructor, NAME, next) {
  Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
  setToStringTag(Constructor, NAME + ' Iterator');
};

},{"./_hide":73,"./_object-create":91,"./_property-desc":105,"./_set-to-string-tag":112,"./_wks":128}],83:[function(require,module,exports){
'use strict';
var LIBRARY = require('./_library');
var $export = require('./_export');
var redefine = require('./_redefine');
var hide = require('./_hide');
var has = require('./_has');
var Iterators = require('./_iterators');
var $iterCreate = require('./_iter-create');
var setToStringTag = require('./_set-to-string-tag');
var getPrototypeOf = require('./_object-gpo');
var ITERATOR = require('./_wks')('iterator');
var BUGGY = !([].keys && 'next' in [].keys()); // Safari has buggy iterators w/o `next`
var FF_ITERATOR = '@@iterator';
var KEYS = 'keys';
var VALUES = 'values';

var returnThis = function () { return this; };

module.exports = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
  $iterCreate(Constructor, NAME, next);
  var getMethod = function (kind) {
    if (!BUGGY && kind in proto) return proto[kind];
    switch (kind) {
      case KEYS: return function keys() { return new Constructor(this, kind); };
      case VALUES: return function values() { return new Constructor(this, kind); };
    } return function entries() { return new Constructor(this, kind); };
  };
  var TAG = NAME + ' Iterator';
  var DEF_VALUES = DEFAULT == VALUES;
  var VALUES_BUG = false;
  var proto = Base.prototype;
  var $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT];
  var $default = (!BUGGY && $native) || getMethod(DEFAULT);
  var $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined;
  var $anyNative = NAME == 'Array' ? proto.entries || $native : $native;
  var methods, key, IteratorPrototype;
  // Fix native
  if ($anyNative) {
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base()));
    if (IteratorPrototype !== Object.prototype && IteratorPrototype.next) {
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if (!LIBRARY && !has(IteratorPrototype, ITERATOR)) hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if (DEF_VALUES && $native && $native.name !== VALUES) {
    VALUES_BUG = true;
    $default = function values() { return $native.call(this); };
  }
  // Define iterator
  if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG] = returnThis;
  if (DEFAULT) {
    methods = {
      values: DEF_VALUES ? $default : getMethod(VALUES),
      keys: IS_SET ? $default : getMethod(KEYS),
      entries: $entries
    };
    if (FORCED) for (key in methods) {
      if (!(key in proto)) redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};

},{"./_export":68,"./_has":72,"./_hide":73,"./_iter-create":82,"./_iterators":86,"./_library":87,"./_object-gpo":98,"./_redefine":107,"./_set-to-string-tag":112,"./_wks":128}],84:[function(require,module,exports){
var ITERATOR = require('./_wks')('iterator');
var SAFE_CLOSING = false;

try {
  var riter = [7][ITERATOR]();
  riter['return'] = function () { SAFE_CLOSING = true; };
  // eslint-disable-next-line no-throw-literal
  Array.from(riter, function () { throw 2; });
} catch (e) { /* empty */ }

module.exports = function (exec, skipClosing) {
  if (!skipClosing && !SAFE_CLOSING) return false;
  var safe = false;
  try {
    var arr = [7];
    var iter = arr[ITERATOR]();
    iter.next = function () { return { done: safe = true }; };
    arr[ITERATOR] = function () { return iter; };
    exec(arr);
  } catch (e) { /* empty */ }
  return safe;
};

},{"./_wks":128}],85:[function(require,module,exports){
module.exports = function (done, value) {
  return { value: value, done: !!done };
};

},{}],86:[function(require,module,exports){
module.exports = {};

},{}],87:[function(require,module,exports){
module.exports = true;

},{}],88:[function(require,module,exports){
var META = require('./_uid')('meta');
var isObject = require('./_is-object');
var has = require('./_has');
var setDesc = require('./_object-dp').f;
var id = 0;
var isExtensible = Object.isExtensible || function () {
  return true;
};
var FREEZE = !require('./_fails')(function () {
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function (it) {
  setDesc(it, META, { value: {
    i: 'O' + ++id, // object ID
    w: {}          // weak collections IDs
  } });
};
var fastKey = function (it, create) {
  // return primitive with prefix
  if (!isObject(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if (!has(it, META)) {
    // can't set metadata to uncaught frozen object
    if (!isExtensible(it)) return 'F';
    // not necessary to add metadata
    if (!create) return 'E';
    // add missing metadata
    setMeta(it);
  // return object ID
  } return it[META].i;
};
var getWeak = function (it, create) {
  if (!has(it, META)) {
    // can't set metadata to uncaught frozen object
    if (!isExtensible(it)) return true;
    // not necessary to add metadata
    if (!create) return false;
    // add missing metadata
    setMeta(it);
  // return hash weak collections IDs
  } return it[META].w;
};
// add metadata on freeze-family methods calling
var onFreeze = function (it) {
  if (FREEZE && meta.NEED && isExtensible(it) && !has(it, META)) setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY: META,
  NEED: false,
  fastKey: fastKey,
  getWeak: getWeak,
  onFreeze: onFreeze
};

},{"./_fails":69,"./_has":72,"./_is-object":80,"./_object-dp":92,"./_uid":124}],89:[function(require,module,exports){
var global = require('./_global');
var macrotask = require('./_task').set;
var Observer = global.MutationObserver || global.WebKitMutationObserver;
var process = global.process;
var Promise = global.Promise;
var isNode = require('./_cof')(process) == 'process';

module.exports = function () {
  var head, last, notify;

  var flush = function () {
    var parent, fn;
    if (isNode && (parent = process.domain)) parent.exit();
    while (head) {
      fn = head.fn;
      head = head.next;
      try {
        fn();
      } catch (e) {
        if (head) notify();
        else last = undefined;
        throw e;
      }
    } last = undefined;
    if (parent) parent.enter();
  };

  // Node.js
  if (isNode) {
    notify = function () {
      process.nextTick(flush);
    };
  // browsers with MutationObserver, except iOS Safari - https://github.com/zloirock/core-js/issues/339
  } else if (Observer && !(global.navigator && global.navigator.standalone)) {
    var toggle = true;
    var node = document.createTextNode('');
    new Observer(flush).observe(node, { characterData: true }); // eslint-disable-line no-new
    notify = function () {
      node.data = toggle = !toggle;
    };
  // environments with maybe non-completely correct, but existent Promise
  } else if (Promise && Promise.resolve) {
    var promise = Promise.resolve();
    notify = function () {
      promise.then(flush);
    };
  // for other environments - macrotask based on:
  // - setImmediate
  // - MessageChannel
  // - window.postMessag
  // - onreadystatechange
  // - setTimeout
  } else {
    notify = function () {
      // strange IE + webpack dev server bug - use .call(global)
      macrotask.call(global, flush);
    };
  }

  return function (fn) {
    var task = { fn: fn, next: undefined };
    if (last) last.next = task;
    if (!head) {
      head = task;
      notify();
    } last = task;
  };
};

},{"./_cof":56,"./_global":71,"./_task":117}],90:[function(require,module,exports){
'use strict';
// 25.4.1.5 NewPromiseCapability(C)
var aFunction = require('./_a-function');

function PromiseCapability(C) {
  var resolve, reject;
  this.promise = new C(function ($$resolve, $$reject) {
    if (resolve !== undefined || reject !== undefined) throw TypeError('Bad Promise constructor');
    resolve = $$resolve;
    reject = $$reject;
  });
  this.resolve = aFunction(resolve);
  this.reject = aFunction(reject);
}

module.exports.f = function (C) {
  return new PromiseCapability(C);
};

},{"./_a-function":46}],91:[function(require,module,exports){
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject = require('./_an-object');
var dPs = require('./_object-dps');
var enumBugKeys = require('./_enum-bug-keys');
var IE_PROTO = require('./_shared-key')('IE_PROTO');
var Empty = function () { /* empty */ };
var PROTOTYPE = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = require('./_dom-create')('iframe');
  var i = enumBugKeys.length;
  var lt = '<';
  var gt = '>';
  var iframeDocument;
  iframe.style.display = 'none';
  require('./_html').appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while (i--) delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties) {
  var result;
  if (O !== null) {
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty();
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};

},{"./_an-object":49,"./_dom-create":65,"./_enum-bug-keys":66,"./_html":74,"./_object-dps":93,"./_shared-key":113}],92:[function(require,module,exports){
var anObject = require('./_an-object');
var IE8_DOM_DEFINE = require('./_ie8-dom-define');
var toPrimitive = require('./_to-primitive');
var dP = Object.defineProperty;

exports.f = require('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (IE8_DOM_DEFINE) try {
    return dP(O, P, Attributes);
  } catch (e) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

},{"./_an-object":49,"./_descriptors":64,"./_ie8-dom-define":75,"./_to-primitive":123}],93:[function(require,module,exports){
var dP = require('./_object-dp');
var anObject = require('./_an-object');
var getKeys = require('./_object-keys');

module.exports = require('./_descriptors') ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var keys = getKeys(Properties);
  var length = keys.length;
  var i = 0;
  var P;
  while (length > i) dP.f(O, P = keys[i++], Properties[P]);
  return O;
};

},{"./_an-object":49,"./_descriptors":64,"./_object-dp":92,"./_object-keys":100}],94:[function(require,module,exports){
var pIE = require('./_object-pie');
var createDesc = require('./_property-desc');
var toIObject = require('./_to-iobject');
var toPrimitive = require('./_to-primitive');
var has = require('./_has');
var IE8_DOM_DEFINE = require('./_ie8-dom-define');
var gOPD = Object.getOwnPropertyDescriptor;

exports.f = require('./_descriptors') ? gOPD : function getOwnPropertyDescriptor(O, P) {
  O = toIObject(O);
  P = toPrimitive(P, true);
  if (IE8_DOM_DEFINE) try {
    return gOPD(O, P);
  } catch (e) { /* empty */ }
  if (has(O, P)) return createDesc(!pIE.f.call(O, P), O[P]);
};

},{"./_descriptors":64,"./_has":72,"./_ie8-dom-define":75,"./_object-pie":101,"./_property-desc":105,"./_to-iobject":120,"./_to-primitive":123}],95:[function(require,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = require('./_to-iobject');
var gOPN = require('./_object-gopn').f;
var toString = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function (it) {
  try {
    return gOPN(it);
  } catch (e) {
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it) {
  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
};

},{"./_object-gopn":96,"./_to-iobject":120}],96:[function(require,module,exports){
// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var $keys = require('./_object-keys-internal');
var hiddenKeys = require('./_enum-bug-keys').concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return $keys(O, hiddenKeys);
};

},{"./_enum-bug-keys":66,"./_object-keys-internal":99}],97:[function(require,module,exports){
exports.f = Object.getOwnPropertySymbols;

},{}],98:[function(require,module,exports){
// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has = require('./_has');
var toObject = require('./_to-object');
var IE_PROTO = require('./_shared-key')('IE_PROTO');
var ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function (O) {
  O = toObject(O);
  if (has(O, IE_PROTO)) return O[IE_PROTO];
  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};

},{"./_has":72,"./_shared-key":113,"./_to-object":122}],99:[function(require,module,exports){
var has = require('./_has');
var toIObject = require('./_to-iobject');
var arrayIndexOf = require('./_array-includes')(false);
var IE_PROTO = require('./_shared-key')('IE_PROTO');

module.exports = function (object, names) {
  var O = toIObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) if (key != IE_PROTO) has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (has(O, key = names[i++])) {
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

},{"./_array-includes":51,"./_has":72,"./_shared-key":113,"./_to-iobject":120}],100:[function(require,module,exports){
// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys = require('./_object-keys-internal');
var enumBugKeys = require('./_enum-bug-keys');

module.exports = Object.keys || function keys(O) {
  return $keys(O, enumBugKeys);
};

},{"./_enum-bug-keys":66,"./_object-keys-internal":99}],101:[function(require,module,exports){
exports.f = {}.propertyIsEnumerable;

},{}],102:[function(require,module,exports){
// most Object methods by ES6 should accept primitives
var $export = require('./_export');
var core = require('./_core');
var fails = require('./_fails');
module.exports = function (KEY, exec) {
  var fn = (core.Object || {})[KEY] || Object[KEY];
  var exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function () { fn(1); }), 'Object', exp);
};

},{"./_core":60,"./_export":68,"./_fails":69}],103:[function(require,module,exports){
module.exports = function (exec) {
  try {
    return { e: false, v: exec() };
  } catch (e) {
    return { e: true, v: e };
  }
};

},{}],104:[function(require,module,exports){
var anObject = require('./_an-object');
var isObject = require('./_is-object');
var newPromiseCapability = require('./_new-promise-capability');

module.exports = function (C, x) {
  anObject(C);
  if (isObject(x) && x.constructor === C) return x;
  var promiseCapability = newPromiseCapability.f(C);
  var resolve = promiseCapability.resolve;
  resolve(x);
  return promiseCapability.promise;
};

},{"./_an-object":49,"./_is-object":80,"./_new-promise-capability":90}],105:[function(require,module,exports){
module.exports = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

},{}],106:[function(require,module,exports){
var hide = require('./_hide');
module.exports = function (target, src, safe) {
  for (var key in src) {
    if (safe && target[key]) target[key] = src[key];
    else hide(target, key, src[key]);
  } return target;
};

},{"./_hide":73}],107:[function(require,module,exports){
module.exports = require('./_hide');

},{"./_hide":73}],108:[function(require,module,exports){
'use strict';
// https://tc39.github.io/proposal-setmap-offrom/
var $export = require('./_export');
var aFunction = require('./_a-function');
var ctx = require('./_ctx');
var forOf = require('./_for-of');

module.exports = function (COLLECTION) {
  $export($export.S, COLLECTION, { from: function from(source /* , mapFn, thisArg */) {
    var mapFn = arguments[1];
    var mapping, A, n, cb;
    aFunction(this);
    mapping = mapFn !== undefined;
    if (mapping) aFunction(mapFn);
    if (source == undefined) return new this();
    A = [];
    if (mapping) {
      n = 0;
      cb = ctx(mapFn, arguments[2], 2);
      forOf(source, false, function (nextItem) {
        A.push(cb(nextItem, n++));
      });
    } else {
      forOf(source, false, A.push, A);
    }
    return new this(A);
  } });
};

},{"./_a-function":46,"./_ctx":62,"./_export":68,"./_for-of":70}],109:[function(require,module,exports){
'use strict';
// https://tc39.github.io/proposal-setmap-offrom/
var $export = require('./_export');

module.exports = function (COLLECTION) {
  $export($export.S, COLLECTION, { of: function of() {
    var length = arguments.length;
    var A = new Array(length);
    while (length--) A[length] = arguments[length];
    return new this(A);
  } });
};

},{"./_export":68}],110:[function(require,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var isObject = require('./_is-object');
var anObject = require('./_an-object');
var check = function (O, proto) {
  anObject(O);
  if (!isObject(proto) && proto !== null) throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
    function (test, buggy, set) {
      try {
        set = require('./_ctx')(Function.call, require('./_object-gopd').f(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch (e) { buggy = true; }
      return function setPrototypeOf(O, proto) {
        check(O, proto);
        if (buggy) O.__proto__ = proto;
        else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
  check: check
};

},{"./_an-object":49,"./_ctx":62,"./_is-object":80,"./_object-gopd":94}],111:[function(require,module,exports){
'use strict';
var global = require('./_global');
var core = require('./_core');
var dP = require('./_object-dp');
var DESCRIPTORS = require('./_descriptors');
var SPECIES = require('./_wks')('species');

module.exports = function (KEY) {
  var C = typeof core[KEY] == 'function' ? core[KEY] : global[KEY];
  if (DESCRIPTORS && C && !C[SPECIES]) dP.f(C, SPECIES, {
    configurable: true,
    get: function () { return this; }
  });
};

},{"./_core":60,"./_descriptors":64,"./_global":71,"./_object-dp":92,"./_wks":128}],112:[function(require,module,exports){
var def = require('./_object-dp').f;
var has = require('./_has');
var TAG = require('./_wks')('toStringTag');

module.exports = function (it, tag, stat) {
  if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, { configurable: true, value: tag });
};

},{"./_has":72,"./_object-dp":92,"./_wks":128}],113:[function(require,module,exports){
var shared = require('./_shared')('keys');
var uid = require('./_uid');
module.exports = function (key) {
  return shared[key] || (shared[key] = uid(key));
};

},{"./_shared":114,"./_uid":124}],114:[function(require,module,exports){
var global = require('./_global');
var SHARED = '__core-js_shared__';
var store = global[SHARED] || (global[SHARED] = {});
module.exports = function (key) {
  return store[key] || (store[key] = {});
};

},{"./_global":71}],115:[function(require,module,exports){
// 7.3.20 SpeciesConstructor(O, defaultConstructor)
var anObject = require('./_an-object');
var aFunction = require('./_a-function');
var SPECIES = require('./_wks')('species');
module.exports = function (O, D) {
  var C = anObject(O).constructor;
  var S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
};

},{"./_a-function":46,"./_an-object":49,"./_wks":128}],116:[function(require,module,exports){
var toInteger = require('./_to-integer');
var defined = require('./_defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function (TO_STRING) {
  return function (that, pos) {
    var s = String(defined(that));
    var i = toInteger(pos);
    var l = s.length;
    var a, b;
    if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};

},{"./_defined":63,"./_to-integer":119}],117:[function(require,module,exports){
var ctx = require('./_ctx');
var invoke = require('./_invoke');
var html = require('./_html');
var cel = require('./_dom-create');
var global = require('./_global');
var process = global.process;
var setTask = global.setImmediate;
var clearTask = global.clearImmediate;
var MessageChannel = global.MessageChannel;
var Dispatch = global.Dispatch;
var counter = 0;
var queue = {};
var ONREADYSTATECHANGE = 'onreadystatechange';
var defer, channel, port;
var run = function () {
  var id = +this;
  // eslint-disable-next-line no-prototype-builtins
  if (queue.hasOwnProperty(id)) {
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listener = function (event) {
  run.call(event.data);
};
// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
if (!setTask || !clearTask) {
  setTask = function setImmediate(fn) {
    var args = [];
    var i = 1;
    while (arguments.length > i) args.push(arguments[i++]);
    queue[++counter] = function () {
      // eslint-disable-next-line no-new-func
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id) {
    delete queue[id];
  };
  // Node.js 0.8-
  if (require('./_cof')(process) == 'process') {
    defer = function (id) {
      process.nextTick(ctx(run, id, 1));
    };
  // Sphere (JS game engine) Dispatch API
  } else if (Dispatch && Dispatch.now) {
    defer = function (id) {
      Dispatch.now(ctx(run, id, 1));
    };
  // Browsers with MessageChannel, includes WebWorkers
  } else if (MessageChannel) {
    channel = new MessageChannel();
    port = channel.port2;
    channel.port1.onmessage = listener;
    defer = ctx(port.postMessage, port, 1);
  // Browsers with postMessage, skip WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if (global.addEventListener && typeof postMessage == 'function' && !global.importScripts) {
    defer = function (id) {
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listener, false);
  // IE8-
  } else if (ONREADYSTATECHANGE in cel('script')) {
    defer = function (id) {
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function () {
        html.removeChild(this);
        run.call(id);
      };
    };
  // Rest old browsers
  } else {
    defer = function (id) {
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set: setTask,
  clear: clearTask
};

},{"./_cof":56,"./_ctx":62,"./_dom-create":65,"./_global":71,"./_html":74,"./_invoke":76}],118:[function(require,module,exports){
var toInteger = require('./_to-integer');
var max = Math.max;
var min = Math.min;
module.exports = function (index, length) {
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};

},{"./_to-integer":119}],119:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil = Math.ceil;
var floor = Math.floor;
module.exports = function (it) {
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

},{}],120:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./_iobject');
var defined = require('./_defined');
module.exports = function (it) {
  return IObject(defined(it));
};

},{"./_defined":63,"./_iobject":77}],121:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./_to-integer');
var min = Math.min;
module.exports = function (it) {
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

},{"./_to-integer":119}],122:[function(require,module,exports){
// 7.1.13 ToObject(argument)
var defined = require('./_defined');
module.exports = function (it) {
  return Object(defined(it));
};

},{"./_defined":63}],123:[function(require,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = require('./_is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function (it, S) {
  if (!isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};

},{"./_is-object":80}],124:[function(require,module,exports){
var id = 0;
var px = Math.random();
module.exports = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

},{}],125:[function(require,module,exports){
var isObject = require('./_is-object');
module.exports = function (it, TYPE) {
  if (!isObject(it) || it._t !== TYPE) throw TypeError('Incompatible receiver, ' + TYPE + ' required!');
  return it;
};

},{"./_is-object":80}],126:[function(require,module,exports){
var global = require('./_global');
var core = require('./_core');
var LIBRARY = require('./_library');
var wksExt = require('./_wks-ext');
var defineProperty = require('./_object-dp').f;
module.exports = function (name) {
  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
  if (name.charAt(0) != '_' && !(name in $Symbol)) defineProperty($Symbol, name, { value: wksExt.f(name) });
};

},{"./_core":60,"./_global":71,"./_library":87,"./_object-dp":92,"./_wks-ext":127}],127:[function(require,module,exports){
exports.f = require('./_wks');

},{"./_wks":128}],128:[function(require,module,exports){
var store = require('./_shared')('wks');
var uid = require('./_uid');
var Symbol = require('./_global').Symbol;
var USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function (name) {
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;

},{"./_global":71,"./_shared":114,"./_uid":124}],129:[function(require,module,exports){
var classof = require('./_classof');
var ITERATOR = require('./_wks')('iterator');
var Iterators = require('./_iterators');
module.exports = require('./_core').getIteratorMethod = function (it) {
  if (it != undefined) return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};

},{"./_classof":55,"./_core":60,"./_iterators":86,"./_wks":128}],130:[function(require,module,exports){
var anObject = require('./_an-object');
var get = require('./core.get-iterator-method');
module.exports = require('./_core').getIterator = function (it) {
  var iterFn = get(it);
  if (typeof iterFn != 'function') throw TypeError(it + ' is not iterable!');
  return anObject(iterFn.call(it));
};

},{"./_an-object":49,"./_core":60,"./core.get-iterator-method":129}],131:[function(require,module,exports){
var classof = require('./_classof');
var ITERATOR = require('./_wks')('iterator');
var Iterators = require('./_iterators');
module.exports = require('./_core').isIterable = function (it) {
  var O = Object(it);
  return O[ITERATOR] !== undefined
    || '@@iterator' in O
    // eslint-disable-next-line no-prototype-builtins
    || Iterators.hasOwnProperty(classof(O));
};

},{"./_classof":55,"./_core":60,"./_iterators":86,"./_wks":128}],132:[function(require,module,exports){
'use strict';
var ctx = require('./_ctx');
var $export = require('./_export');
var toObject = require('./_to-object');
var call = require('./_iter-call');
var isArrayIter = require('./_is-array-iter');
var toLength = require('./_to-length');
var createProperty = require('./_create-property');
var getIterFn = require('./core.get-iterator-method');

$export($export.S + $export.F * !require('./_iter-detect')(function (iter) { Array.from(iter); }), 'Array', {
  // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
  from: function from(arrayLike /* , mapfn = undefined, thisArg = undefined */) {
    var O = toObject(arrayLike);
    var C = typeof this == 'function' ? this : Array;
    var aLen = arguments.length;
    var mapfn = aLen > 1 ? arguments[1] : undefined;
    var mapping = mapfn !== undefined;
    var index = 0;
    var iterFn = getIterFn(O);
    var length, result, step, iterator;
    if (mapping) mapfn = ctx(mapfn, aLen > 2 ? arguments[2] : undefined, 2);
    // if object isn't iterable or it's array with default iterator - use simple case
    if (iterFn != undefined && !(C == Array && isArrayIter(iterFn))) {
      for (iterator = iterFn.call(O), result = new C(); !(step = iterator.next()).done; index++) {
        createProperty(result, index, mapping ? call(iterator, mapfn, [step.value, index], true) : step.value);
      }
    } else {
      length = toLength(O.length);
      for (result = new C(length); length > index; index++) {
        createProperty(result, index, mapping ? mapfn(O[index], index) : O[index]);
      }
    }
    result.length = index;
    return result;
  }
});

},{"./_create-property":61,"./_ctx":62,"./_export":68,"./_is-array-iter":78,"./_iter-call":81,"./_iter-detect":84,"./_to-length":121,"./_to-object":122,"./core.get-iterator-method":129}],133:[function(require,module,exports){
'use strict';
var addToUnscopables = require('./_add-to-unscopables');
var step = require('./_iter-step');
var Iterators = require('./_iterators');
var toIObject = require('./_to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = require('./_iter-define')(Array, 'Array', function (iterated, kind) {
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var kind = this._k;
  var index = this._i++;
  if (!O || index >= O.length) {
    this._t = undefined;
    return step(1);
  }
  if (kind == 'keys') return step(0, index);
  if (kind == 'values') return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');

},{"./_add-to-unscopables":47,"./_iter-define":83,"./_iter-step":85,"./_iterators":86,"./_to-iobject":120}],134:[function(require,module,exports){
'use strict';
var strong = require('./_collection-strong');
var validate = require('./_validate-collection');
var MAP = 'Map';

// 23.1 Map Objects
module.exports = require('./_collection')(MAP, function (get) {
  return function Map() { return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.1.3.6 Map.prototype.get(key)
  get: function get(key) {
    var entry = strong.getEntry(validate(this, MAP), key);
    return entry && entry.v;
  },
  // 23.1.3.9 Map.prototype.set(key, value)
  set: function set(key, value) {
    return strong.def(validate(this, MAP), key === 0 ? 0 : key, value);
  }
}, strong, true);

},{"./_collection":59,"./_collection-strong":57,"./_validate-collection":125}],135:[function(require,module,exports){
var $export = require('./_export');
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
$export($export.S, 'Object', { create: require('./_object-create') });

},{"./_export":68,"./_object-create":91}],136:[function(require,module,exports){
var $export = require('./_export');
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !require('./_descriptors'), 'Object', { defineProperty: require('./_object-dp').f });

},{"./_descriptors":64,"./_export":68,"./_object-dp":92}],137:[function(require,module,exports){
// 19.1.2.9 Object.getPrototypeOf(O)
var toObject = require('./_to-object');
var $getPrototypeOf = require('./_object-gpo');

require('./_object-sap')('getPrototypeOf', function () {
  return function getPrototypeOf(it) {
    return $getPrototypeOf(toObject(it));
  };
});

},{"./_object-gpo":98,"./_object-sap":102,"./_to-object":122}],138:[function(require,module,exports){
// 19.1.2.14 Object.keys(O)
var toObject = require('./_to-object');
var $keys = require('./_object-keys');

require('./_object-sap')('keys', function () {
  return function keys(it) {
    return $keys(toObject(it));
  };
});

},{"./_object-keys":100,"./_object-sap":102,"./_to-object":122}],139:[function(require,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $export = require('./_export');
$export($export.S, 'Object', { setPrototypeOf: require('./_set-proto').set });

},{"./_export":68,"./_set-proto":110}],140:[function(require,module,exports){

},{}],141:[function(require,module,exports){
'use strict';
var LIBRARY = require('./_library');
var global = require('./_global');
var ctx = require('./_ctx');
var classof = require('./_classof');
var $export = require('./_export');
var isObject = require('./_is-object');
var aFunction = require('./_a-function');
var anInstance = require('./_an-instance');
var forOf = require('./_for-of');
var speciesConstructor = require('./_species-constructor');
var task = require('./_task').set;
var microtask = require('./_microtask')();
var newPromiseCapabilityModule = require('./_new-promise-capability');
var perform = require('./_perform');
var promiseResolve = require('./_promise-resolve');
var PROMISE = 'Promise';
var TypeError = global.TypeError;
var process = global.process;
var $Promise = global[PROMISE];
var isNode = classof(process) == 'process';
var empty = function () { /* empty */ };
var Internal, newGenericPromiseCapability, OwnPromiseCapability, Wrapper;
var newPromiseCapability = newGenericPromiseCapability = newPromiseCapabilityModule.f;

var USE_NATIVE = !!function () {
  try {
    // correct subclassing with @@species support
    var promise = $Promise.resolve(1);
    var FakePromise = (promise.constructor = {})[require('./_wks')('species')] = function (exec) {
      exec(empty, empty);
    };
    // unhandled rejections tracking support, NodeJS Promise without it fails @@species test
    return (isNode || typeof PromiseRejectionEvent == 'function') && promise.then(empty) instanceof FakePromise;
  } catch (e) { /* empty */ }
}();

// helpers
var isThenable = function (it) {
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};
var notify = function (promise, isReject) {
  if (promise._n) return;
  promise._n = true;
  var chain = promise._c;
  microtask(function () {
    var value = promise._v;
    var ok = promise._s == 1;
    var i = 0;
    var run = function (reaction) {
      var handler = ok ? reaction.ok : reaction.fail;
      var resolve = reaction.resolve;
      var reject = reaction.reject;
      var domain = reaction.domain;
      var result, then;
      try {
        if (handler) {
          if (!ok) {
            if (promise._h == 2) onHandleUnhandled(promise);
            promise._h = 1;
          }
          if (handler === true) result = value;
          else {
            if (domain) domain.enter();
            result = handler(value);
            if (domain) domain.exit();
          }
          if (result === reaction.promise) {
            reject(TypeError('Promise-chain cycle'));
          } else if (then = isThenable(result)) {
            then.call(result, resolve, reject);
          } else resolve(result);
        } else reject(value);
      } catch (e) {
        reject(e);
      }
    };
    while (chain.length > i) run(chain[i++]); // variable length - can't use forEach
    promise._c = [];
    promise._n = false;
    if (isReject && !promise._h) onUnhandled(promise);
  });
};
var onUnhandled = function (promise) {
  task.call(global, function () {
    var value = promise._v;
    var unhandled = isUnhandled(promise);
    var result, handler, console;
    if (unhandled) {
      result = perform(function () {
        if (isNode) {
          process.emit('unhandledRejection', value, promise);
        } else if (handler = global.onunhandledrejection) {
          handler({ promise: promise, reason: value });
        } else if ((console = global.console) && console.error) {
          console.error('Unhandled promise rejection', value);
        }
      });
      // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
      promise._h = isNode || isUnhandled(promise) ? 2 : 1;
    } promise._a = undefined;
    if (unhandled && result.e) throw result.v;
  });
};
var isUnhandled = function (promise) {
  return promise._h !== 1 && (promise._a || promise._c).length === 0;
};
var onHandleUnhandled = function (promise) {
  task.call(global, function () {
    var handler;
    if (isNode) {
      process.emit('rejectionHandled', promise);
    } else if (handler = global.onrejectionhandled) {
      handler({ promise: promise, reason: promise._v });
    }
  });
};
var $reject = function (value) {
  var promise = this;
  if (promise._d) return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  promise._v = value;
  promise._s = 2;
  if (!promise._a) promise._a = promise._c.slice();
  notify(promise, true);
};
var $resolve = function (value) {
  var promise = this;
  var then;
  if (promise._d) return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  try {
    if (promise === value) throw TypeError("Promise can't be resolved itself");
    if (then = isThenable(value)) {
      microtask(function () {
        var wrapper = { _w: promise, _d: false }; // wrap
        try {
          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
        } catch (e) {
          $reject.call(wrapper, e);
        }
      });
    } else {
      promise._v = value;
      promise._s = 1;
      notify(promise, false);
    }
  } catch (e) {
    $reject.call({ _w: promise, _d: false }, e); // wrap
  }
};

// constructor polyfill
if (!USE_NATIVE) {
  // 25.4.3.1 Promise(executor)
  $Promise = function Promise(executor) {
    anInstance(this, $Promise, PROMISE, '_h');
    aFunction(executor);
    Internal.call(this);
    try {
      executor(ctx($resolve, this, 1), ctx($reject, this, 1));
    } catch (err) {
      $reject.call(this, err);
    }
  };
  // eslint-disable-next-line no-unused-vars
  Internal = function Promise(executor) {
    this._c = [];             // <- awaiting reactions
    this._a = undefined;      // <- checked in isUnhandled reactions
    this._s = 0;              // <- state
    this._d = false;          // <- done
    this._v = undefined;      // <- value
    this._h = 0;              // <- rejection state, 0 - default, 1 - handled, 2 - unhandled
    this._n = false;          // <- notify
  };
  Internal.prototype = require('./_redefine-all')($Promise.prototype, {
    // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
    then: function then(onFulfilled, onRejected) {
      var reaction = newPromiseCapability(speciesConstructor(this, $Promise));
      reaction.ok = typeof onFulfilled == 'function' ? onFulfilled : true;
      reaction.fail = typeof onRejected == 'function' && onRejected;
      reaction.domain = isNode ? process.domain : undefined;
      this._c.push(reaction);
      if (this._a) this._a.push(reaction);
      if (this._s) notify(this, false);
      return reaction.promise;
    },
    // 25.4.5.1 Promise.prototype.catch(onRejected)
    'catch': function (onRejected) {
      return this.then(undefined, onRejected);
    }
  });
  OwnPromiseCapability = function () {
    var promise = new Internal();
    this.promise = promise;
    this.resolve = ctx($resolve, promise, 1);
    this.reject = ctx($reject, promise, 1);
  };
  newPromiseCapabilityModule.f = newPromiseCapability = function (C) {
    return C === $Promise || C === Wrapper
      ? new OwnPromiseCapability(C)
      : newGenericPromiseCapability(C);
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, { Promise: $Promise });
require('./_set-to-string-tag')($Promise, PROMISE);
require('./_set-species')(PROMISE);
Wrapper = require('./_core')[PROMISE];

// statics
$export($export.S + $export.F * !USE_NATIVE, PROMISE, {
  // 25.4.4.5 Promise.reject(r)
  reject: function reject(r) {
    var capability = newPromiseCapability(this);
    var $$reject = capability.reject;
    $$reject(r);
    return capability.promise;
  }
});
$export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, {
  // 25.4.4.6 Promise.resolve(x)
  resolve: function resolve(x) {
    return promiseResolve(LIBRARY && this === Wrapper ? $Promise : this, x);
  }
});
$export($export.S + $export.F * !(USE_NATIVE && require('./_iter-detect')(function (iter) {
  $Promise.all(iter)['catch'](empty);
})), PROMISE, {
  // 25.4.4.1 Promise.all(iterable)
  all: function all(iterable) {
    var C = this;
    var capability = newPromiseCapability(C);
    var resolve = capability.resolve;
    var reject = capability.reject;
    var result = perform(function () {
      var values = [];
      var index = 0;
      var remaining = 1;
      forOf(iterable, false, function (promise) {
        var $index = index++;
        var alreadyCalled = false;
        values.push(undefined);
        remaining++;
        C.resolve(promise).then(function (value) {
          if (alreadyCalled) return;
          alreadyCalled = true;
          values[$index] = value;
          --remaining || resolve(values);
        }, reject);
      });
      --remaining || resolve(values);
    });
    if (result.e) reject(result.v);
    return capability.promise;
  },
  // 25.4.4.4 Promise.race(iterable)
  race: function race(iterable) {
    var C = this;
    var capability = newPromiseCapability(C);
    var reject = capability.reject;
    var result = perform(function () {
      forOf(iterable, false, function (promise) {
        C.resolve(promise).then(capability.resolve, reject);
      });
    });
    if (result.e) reject(result.v);
    return capability.promise;
  }
});

},{"./_a-function":46,"./_an-instance":48,"./_classof":55,"./_core":60,"./_ctx":62,"./_export":68,"./_for-of":70,"./_global":71,"./_is-object":80,"./_iter-detect":84,"./_library":87,"./_microtask":89,"./_new-promise-capability":90,"./_perform":103,"./_promise-resolve":104,"./_redefine-all":106,"./_set-species":111,"./_set-to-string-tag":112,"./_species-constructor":115,"./_task":117,"./_wks":128}],142:[function(require,module,exports){
'use strict';
var strong = require('./_collection-strong');
var validate = require('./_validate-collection');
var SET = 'Set';

// 23.2 Set Objects
module.exports = require('./_collection')(SET, function (get) {
  return function Set() { return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.2.3.1 Set.prototype.add(value)
  add: function add(value) {
    return strong.def(validate(this, SET), value = value === 0 ? 0 : value, value);
  }
}, strong);

},{"./_collection":59,"./_collection-strong":57,"./_validate-collection":125}],143:[function(require,module,exports){
'use strict';
var $at = require('./_string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
require('./_iter-define')(String, 'String', function (iterated) {
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var index = this._i;
  var point;
  if (index >= O.length) return { value: undefined, done: true };
  point = $at(O, index);
  this._i += point.length;
  return { value: point, done: false };
});

},{"./_iter-define":83,"./_string-at":116}],144:[function(require,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var global = require('./_global');
var has = require('./_has');
var DESCRIPTORS = require('./_descriptors');
var $export = require('./_export');
var redefine = require('./_redefine');
var META = require('./_meta').KEY;
var $fails = require('./_fails');
var shared = require('./_shared');
var setToStringTag = require('./_set-to-string-tag');
var uid = require('./_uid');
var wks = require('./_wks');
var wksExt = require('./_wks-ext');
var wksDefine = require('./_wks-define');
var enumKeys = require('./_enum-keys');
var isArray = require('./_is-array');
var anObject = require('./_an-object');
var isObject = require('./_is-object');
var toIObject = require('./_to-iobject');
var toPrimitive = require('./_to-primitive');
var createDesc = require('./_property-desc');
var _create = require('./_object-create');
var gOPNExt = require('./_object-gopn-ext');
var $GOPD = require('./_object-gopd');
var $DP = require('./_object-dp');
var $keys = require('./_object-keys');
var gOPD = $GOPD.f;
var dP = $DP.f;
var gOPN = gOPNExt.f;
var $Symbol = global.Symbol;
var $JSON = global.JSON;
var _stringify = $JSON && $JSON.stringify;
var PROTOTYPE = 'prototype';
var HIDDEN = wks('_hidden');
var TO_PRIMITIVE = wks('toPrimitive');
var isEnum = {}.propertyIsEnumerable;
var SymbolRegistry = shared('symbol-registry');
var AllSymbols = shared('symbols');
var OPSymbols = shared('op-symbols');
var ObjectProto = Object[PROTOTYPE];
var USE_NATIVE = typeof $Symbol == 'function';
var QObject = global.QObject;
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function () {
  return _create(dP({}, 'a', {
    get: function () { return dP(this, 'a', { value: 7 }).a; }
  })).a != 7;
}) ? function (it, key, D) {
  var protoDesc = gOPD(ObjectProto, key);
  if (protoDesc) delete ObjectProto[key];
  dP(it, key, D);
  if (protoDesc && it !== ObjectProto) dP(ObjectProto, key, protoDesc);
} : dP;

var wrap = function (tag) {
  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
  sym._k = tag;
  return sym;
};

var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function (it) {
  return typeof it == 'symbol';
} : function (it) {
  return it instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D) {
  if (it === ObjectProto) $defineProperty(OPSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if (has(AllSymbols, key)) {
    if (!D.enumerable) {
      if (!has(it, HIDDEN)) dP(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if (has(it, HIDDEN) && it[HIDDEN][key]) it[HIDDEN][key] = false;
      D = _create(D, { enumerable: createDesc(0, false) });
    } return setSymbolDesc(it, key, D);
  } return dP(it, key, D);
};
var $defineProperties = function defineProperties(it, P) {
  anObject(it);
  var keys = enumKeys(P = toIObject(P));
  var i = 0;
  var l = keys.length;
  var key;
  while (l > i) $defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P) {
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key) {
  var E = isEnum.call(this, key = toPrimitive(key, true));
  if (this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
  it = toIObject(it);
  key = toPrimitive(key, true);
  if (it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return;
  var D = gOPD(it, key);
  if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key])) D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it) {
  var names = gOPN(toIObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META) result.push(key);
  } return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
  var IS_OP = it === ObjectProto;
  var names = gOPN(IS_OP ? OPSymbols : toIObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true)) result.push(AllSymbols[key]);
  } return result;
};

// 19.4.1.1 Symbol([description])
if (!USE_NATIVE) {
  $Symbol = function Symbol() {
    if (this instanceof $Symbol) throw TypeError('Symbol is not a constructor!');
    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
    var $set = function (value) {
      if (this === ObjectProto) $set.call(OPSymbols, value);
      if (has(this, HIDDEN) && has(this[HIDDEN], tag)) this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    };
    if (DESCRIPTORS && setter) setSymbolDesc(ObjectProto, tag, { configurable: true, set: $set });
    return wrap(tag);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString() {
    return this._k;
  });

  $GOPD.f = $getOwnPropertyDescriptor;
  $DP.f = $defineProperty;
  require('./_object-gopn').f = gOPNExt.f = $getOwnPropertyNames;
  require('./_object-pie').f = $propertyIsEnumerable;
  require('./_object-gops').f = $getOwnPropertySymbols;

  if (DESCRIPTORS && !require('./_library')) {
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }

  wksExt.f = function (name) {
    return wrap(wks(name));
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, { Symbol: $Symbol });

for (var es6Symbols = (
  // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
).split(','), j = 0; es6Symbols.length > j;)wks(es6Symbols[j++]);

for (var wellKnownSymbols = $keys(wks.store), k = 0; wellKnownSymbols.length > k;) wksDefine(wellKnownSymbols[k++]);

$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
  // 19.4.2.1 Symbol.for(key)
  'for': function (key) {
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(sym) {
    if (!isSymbol(sym)) throw TypeError(sym + ' is not a symbol!');
    for (var key in SymbolRegistry) if (SymbolRegistry[key] === sym) return key;
  },
  useSetter: function () { setter = true; },
  useSimple: function () { setter = false; }
});

$export($export.S + $export.F * !USE_NATIVE, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function () {
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({ a: S }) != '{}' || _stringify(Object(S)) != '{}';
})), 'JSON', {
  stringify: function stringify(it) {
    var args = [it];
    var i = 1;
    var replacer, $replacer;
    while (arguments.length > i) args.push(arguments[i++]);
    $replacer = replacer = args[1];
    if (!isObject(replacer) && it === undefined || isSymbol(it)) return; // IE8 returns string on undefined
    if (!isArray(replacer)) replacer = function (key, value) {
      if (typeof $replacer == 'function') value = $replacer.call(this, key, value);
      if (!isSymbol(value)) return value;
    };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  }
});

// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
$Symbol[PROTOTYPE][TO_PRIMITIVE] || require('./_hide')($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);

},{"./_an-object":49,"./_descriptors":64,"./_enum-keys":67,"./_export":68,"./_fails":69,"./_global":71,"./_has":72,"./_hide":73,"./_is-array":79,"./_is-object":80,"./_library":87,"./_meta":88,"./_object-create":91,"./_object-dp":92,"./_object-gopd":94,"./_object-gopn":96,"./_object-gopn-ext":95,"./_object-gops":97,"./_object-keys":100,"./_object-pie":101,"./_property-desc":105,"./_redefine":107,"./_set-to-string-tag":112,"./_shared":114,"./_to-iobject":120,"./_to-primitive":123,"./_uid":124,"./_wks":128,"./_wks-define":126,"./_wks-ext":127}],145:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-map.from
require('./_set-collection-from')('Map');

},{"./_set-collection-from":108}],146:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-map.of
require('./_set-collection-of')('Map');

},{"./_set-collection-of":109}],147:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export = require('./_export');

$export($export.P + $export.R, 'Map', { toJSON: require('./_collection-to-json')('Map') });

},{"./_collection-to-json":58,"./_export":68}],148:[function(require,module,exports){
// https://github.com/tc39/proposal-promise-finally
'use strict';
var $export = require('./_export');
var core = require('./_core');
var global = require('./_global');
var speciesConstructor = require('./_species-constructor');
var promiseResolve = require('./_promise-resolve');

$export($export.P + $export.R, 'Promise', { 'finally': function (onFinally) {
  var C = speciesConstructor(this, core.Promise || global.Promise);
  var isFunction = typeof onFinally == 'function';
  return this.then(
    isFunction ? function (x) {
      return promiseResolve(C, onFinally()).then(function () { return x; });
    } : onFinally,
    isFunction ? function (e) {
      return promiseResolve(C, onFinally()).then(function () { throw e; });
    } : onFinally
  );
} });

},{"./_core":60,"./_export":68,"./_global":71,"./_promise-resolve":104,"./_species-constructor":115}],149:[function(require,module,exports){
'use strict';
// https://github.com/tc39/proposal-promise-try
var $export = require('./_export');
var newPromiseCapability = require('./_new-promise-capability');
var perform = require('./_perform');

$export($export.S, 'Promise', { 'try': function (callbackfn) {
  var promiseCapability = newPromiseCapability.f(this);
  var result = perform(callbackfn);
  (result.e ? promiseCapability.reject : promiseCapability.resolve)(result.v);
  return promiseCapability.promise;
} });

},{"./_export":68,"./_new-promise-capability":90,"./_perform":103}],150:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-set.from
require('./_set-collection-from')('Set');

},{"./_set-collection-from":108}],151:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-set.of
require('./_set-collection-of')('Set');

},{"./_set-collection-of":109}],152:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export = require('./_export');

$export($export.P + $export.R, 'Set', { toJSON: require('./_collection-to-json')('Set') });

},{"./_collection-to-json":58,"./_export":68}],153:[function(require,module,exports){
require('./_wks-define')('asyncIterator');

},{"./_wks-define":126}],154:[function(require,module,exports){
require('./_wks-define')('observable');

},{"./_wks-define":126}],155:[function(require,module,exports){
require('./es6.array.iterator');
var global = require('./_global');
var hide = require('./_hide');
var Iterators = require('./_iterators');
var TO_STRING_TAG = require('./_wks')('toStringTag');

var DOMIterables = ('CSSRuleList,CSSStyleDeclaration,CSSValueList,ClientRectList,DOMRectList,DOMStringList,' +
  'DOMTokenList,DataTransferItemList,FileList,HTMLAllCollection,HTMLCollection,HTMLFormElement,HTMLSelectElement,' +
  'MediaList,MimeTypeArray,NamedNodeMap,NodeList,PaintRequestList,Plugin,PluginArray,SVGLengthList,SVGNumberList,' +
  'SVGPathSegList,SVGPointList,SVGStringList,SVGTransformList,SourceBufferList,StyleSheetList,TextTrackCueList,' +
  'TextTrackList,TouchList').split(',');

for (var i = 0; i < DOMIterables.length; i++) {
  var NAME = DOMIterables[i];
  var Collection = global[NAME];
  var proto = Collection && Collection.prototype;
  if (proto && !proto[TO_STRING_TAG]) hide(proto, TO_STRING_TAG, NAME);
  Iterators[NAME] = Iterators.Array;
}

},{"./_global":71,"./_hide":73,"./_iterators":86,"./_wks":128,"./es6.array.iterator":133}],156:[function(require,module,exports){
(function (process){
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  '#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
  '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
  '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
  '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
  '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
  '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
  '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
  '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
  '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
  '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
  '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // Internet Explorer and Edge do not support colors.
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    return false;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))
},{"./debug":157,"_process":160}],157:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * Active `debug` instances.
 */
exports.instances = [];

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  var prevTime;

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);
  debug.destroy = destroy;

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  exports.instances.push(debug);

  return debug;
}

function destroy () {
  var index = exports.instances.indexOf(this);
  if (index !== -1) {
    exports.instances.splice(index, 1);
    return true;
  } else {
    return false;
  }
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var i;
  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }

  for (i = 0; i < exports.instances.length; i++) {
    var instance = exports.instances[i];
    instance.enabled = exports.enabled(instance.namespace);
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  if (name[name.length - 1] === '*') {
    return true;
  }
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":159}],158:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],159:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],160:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],161:[function(require,module,exports){
'use strict';

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = require('./logger')('Message');
var utils = require('./utils');

var Message = function () {
	function Message() {
		(0, _classCallCheck3.default)(this, Message);
	}

	(0, _createClass3.default)(Message, null, [{
		key: 'parse',
		value: function parse(raw) {
			var object = void 0;
			var message = {};

			try {
				object = JSON.parse(raw);
			} catch (error) {
				logger.error('parse() | invalid JSON: %s', error);

				return;
			}

			if ((typeof object === 'undefined' ? 'undefined' : (0, _typeof3.default)(object)) !== 'object' || Array.isArray(object)) {
				logger.error('parse() | not an object');

				return;
			}

			if (typeof object.id !== 'number') {
				logger.error('parse() | missing/invalid id field');

				return;
			}

			message.id = object.id;

			// Request.
			if (object.request) {
				message.request = true;

				if (typeof object.method !== 'string') {
					logger.error('parse() | missing/invalid method field');

					return;
				}

				message.method = object.method;
				message.data = object.data || {};
			}
			// Response.
			else if (object.response) {
					message.response = true;

					// Success.
					if (object.ok) {
						message.ok = true;
						message.data = object.data || {};
					}
					// Error.
					else {
							message.errorCode = object.errorCode;
							message.errorReason = object.errorReason;
						}
				}
				// Invalid.
				else {
						logger.error('parse() | missing request/response field');

						return;
					}

			return message;
		}
	}, {
		key: 'requestFactory',
		value: function requestFactory(method, data) {
			var request = {
				request: true,
				id: utils.randomNumber(),
				method: method,
				data: data || {}
			};

			return request;
		}
	}, {
		key: 'successResponseFactory',
		value: function successResponseFactory(request, data) {
			var response = {
				response: true,
				id: request.id,
				ok: true,
				data: data || {}
			};

			return response;
		}
	}, {
		key: 'errorResponseFactory',
		value: function errorResponseFactory(request, errorCode, errorReason) {
			var response = {
				response: true,
				id: request.id,
				codeCode: errorCode,
				errorReason: errorReason
			};

			return response;
		}
	}]);
	return Message;
}();

module.exports = Message;

},{"./logger":164,"./utils":167,"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/createClass":26,"babel-runtime/helpers/typeof":30}],162:[function(require,module,exports){
'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EventEmitter = require('events').EventEmitter;
var logger = require('./logger')('Peer');
var Message = require('./Message');

// Max time waiting for a response.
var REQUEST_TIMEOUT = 20000;

var Peer = function (_EventEmitter) {
	(0, _inherits3.default)(Peer, _EventEmitter);

	function Peer(transport) {
		(0, _classCallCheck3.default)(this, Peer);

		logger.debug('constructor()');

		var _this = (0, _possibleConstructorReturn3.default)(this, (Peer.__proto__ || (0, _getPrototypeOf2.default)(Peer)).call(this));

		_this.setMaxListeners(Infinity);

		// Transport.
		_this._transport = transport;

		// Closed flag.
		_this._closed = false;

		// Custom data object.
		_this._data = {};

		// Map of sent requests' handlers indexed by request.id.
		_this._requestHandlers = new _map2.default();

		// Handle transport.
		_this._handleTransport();
		return _this;
	}

	(0, _createClass3.default)(Peer, [{
		key: 'send',
		value: function send(method, data) {
			var _this2 = this;

			var request = Message.requestFactory(method, data);

			return this._transport.send(request).then(function () {
				return new _promise2.default(function (pResolve, pReject) {
					var handler = {
						resolve: function resolve(data2) {
							if (!_this2._requestHandlers.delete(request.id)) return;

							clearTimeout(handler.timer);
							pResolve(data2);
						},

						reject: function reject(error) {
							if (!_this2._requestHandlers.delete(request.id)) return;

							clearTimeout(handler.timer);
							pReject(error);
						},

						timer: setTimeout(function () {
							if (!_this2._requestHandlers.delete(request.id)) return;

							pReject(new Error('request timeout'));
						}, REQUEST_TIMEOUT),

						close: function close() {
							clearTimeout(handler.timer);
							pReject(new Error('peer closed'));
						}
					};

					// Add handler stuff to the Map.
					_this2._requestHandlers.set(request.id, handler);
				});
			});
		}
	}, {
		key: 'close',
		value: function close() {
			logger.debug('close()');

			if (this._closed) return;

			this._closed = true;

			// Close transport.
			this._transport.close();

			// Close every pending request handler.
			this._requestHandlers.forEach(function (handler) {
				return handler.close();
			});

			// Emit 'close' event.
			this.emit('close');
		}
	}, {
		key: '_handleTransport',
		value: function _handleTransport() {
			var _this3 = this;

			if (this._transport.closed) {
				this._closed = true;
				setTimeout(function () {
					return _this3.emit('close');
				});

				return;
			}

			this._transport.on('connecting', function (currentAttempt) {
				_this3.emit('connecting', currentAttempt);
			});

			this._transport.on('open', function () {
				if (_this3._closed) return;

				// Emit 'open' event.
				_this3.emit('open');
			});

			this._transport.on('disconnected', function () {
				_this3.emit('disconnected');
			});

			this._transport.on('failed', function (currentAttempt) {
				_this3.emit('failed', currentAttempt);
			});

			this._transport.on('close', function () {
				if (_this3._closed) return;

				_this3._closed = true;

				// Emit 'close' event.
				_this3.emit('close');
			});

			this._transport.on('message', function (message) {
				if (message.response) {
					_this3._handleResponse(message);
				} else if (message.request) {
					_this3._handleRequest(message);
				}
			});
		}
	}, {
		key: '_handleResponse',
		value: function _handleResponse(response) {
			var handler = this._requestHandlers.get(response.id);

			if (!handler) {
				logger.error('received response does not match any sent request');

				return;
			}

			if (response.ok) {
				handler.resolve(response.data);
			} else {
				var error = new Error(response.errorReason);

				error.code = response.errorCode;
				handler.reject(error);
			}
		}
	}, {
		key: '_handleRequest',
		value: function _handleRequest(request) {
			var _this4 = this;

			this.emit('request',
			// Request.
			request,
			// accept() function.
			function (data) {
				var response = Message.successResponseFactory(request, data);

				_this4._transport.send(response).catch(function (error) {
					logger.warn('accept() failed, response could not be sent: %o', error);
				});
			},
			// reject() function.
			function (errorCode, errorReason) {
				if (errorCode instanceof Error) {
					errorReason = errorCode.toString();
					errorCode = 500;
				} else if (typeof errorCode === 'number' && errorReason instanceof Error) {
					errorReason = errorReason.toString();
				}

				var response = Message.errorResponseFactory(request, errorCode, errorReason);

				_this4._transport.send(response).catch(function (error) {
					logger.warn('reject() failed, response could not be sent: %o', error);
				});
			});
		}
	}, {
		key: 'data',
		get: function get() {
			return this._data;
		},
		set: function set(obj) {
			this._data = obj || {};
		}
	}, {
		key: 'closed',
		get: function get() {
			return this._closed;
		}
	}]);
	return Peer;
}(EventEmitter);

module.exports = Peer;

},{"./Message":161,"./logger":164,"babel-runtime/core-js/map":15,"babel-runtime/core-js/object/get-prototype-of":18,"babel-runtime/core-js/promise":21,"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/createClass":26,"babel-runtime/helpers/inherits":27,"babel-runtime/helpers/possibleConstructorReturn":28,"events":158}],163:[function(require,module,exports){
'use strict';

var Peer = require('./Peer');
var transports = require('./transports');

module.exports = {
	/**
  * Expose Peer.
  */
	Peer: Peer,

	/**
  * Expose the built-in WebSocketTransport.
  */
	WebSocketTransport: transports.WebSocketTransport
};

},{"./Peer":162,"./transports":166}],164:[function(require,module,exports){
'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug');

var APP_NAME = 'protoo-client';

var Logger = function () {
	function Logger(prefix) {
		(0, _classCallCheck3.default)(this, Logger);

		if (prefix) {
			this._debug = debug(APP_NAME + ':' + prefix);
			this._warn = debug(APP_NAME + ':WARN:' + prefix);
			this._error = debug(APP_NAME + ':ERROR:' + prefix);
		} else {
			this._debug = debug(APP_NAME);
			this._warn = debug(APP_NAME + ':WARN');
			this._error = debug(APP_NAME + ':ERROR');
		}

		/* eslint-disable no-console */
		this._debug.log = console.info.bind(console);
		this._warn.log = console.warn.bind(console);
		this._error.log = console.error.bind(console);
		/* eslint-enable no-console */
	}

	(0, _createClass3.default)(Logger, [{
		key: 'debug',
		get: function get() {
			return this._debug;
		}
	}, {
		key: 'warn',
		get: function get() {
			return this._warn;
		}
	}, {
		key: 'error',
		get: function get() {
			return this._error;
		}
	}]);
	return Logger;
}();

module.exports = function (prefix) {
	return new Logger(prefix);
};

},{"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/createClass":26,"debug":156}],165:[function(require,module,exports){
'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EventEmitter = require('events').EventEmitter;
var W3CWebSocket = require('websocket').w3cwebsocket;
var retry = require('retry');
var logger = require('../logger')('WebSocketTransport');
var Message = require('../Message');

var WS_SUBPROTOCOL = 'protoo';
var DEFAULT_RETRY_OPTIONS = {
	retries: 10,
	factor: 2,
	minTimeout: 1 * 1000,
	maxTimeout: 8 * 1000
};

var WebSocketTransport = function (_EventEmitter) {
	(0, _inherits3.default)(WebSocketTransport, _EventEmitter);

	function WebSocketTransport(url, options) {
		(0, _classCallCheck3.default)(this, WebSocketTransport);

		logger.debug('constructor() [url:"%s", options:%o]', url, options);

		var _this = (0, _possibleConstructorReturn3.default)(this, (WebSocketTransport.__proto__ || (0, _getPrototypeOf2.default)(WebSocketTransport)).call(this));

		_this.setMaxListeners(Infinity);

		// Save URL and options.
		_this._url = url;
		_this._options = options || {};

		// WebSocket instance.
		_this._ws = null;

		// Closed flag.
		_this._closed = false;

		// Set WebSocket
		_this._setWebSocket();
		return _this;
	}

	(0, _createClass3.default)(WebSocketTransport, [{
		key: 'send',
		value: function send(message) {
			if (this._closed) return _promise2.default.reject(new Error('transport closed'));

			try {
				this._ws.send((0, _stringify2.default)(message));

				return _promise2.default.resolve();
			} catch (error) {
				logger.error('send() | error sending message: %o', error);

				return _promise2.default.reject(error);
			}
		}
	}, {
		key: 'close',
		value: function close() {
			logger.debug('close()');

			if (this._closed) return;

			// Don't wait for the WebSocket 'close' event, do it now.
			this._closed = true;
			this.emit('close');

			try {
				this._ws.onopen = null;
				this._ws.onclose = null;
				this._ws.onerror = null;
				this._ws.onmessage = null;
				this._ws.close();
			} catch (error) {
				logger.error('close() | error closing the WebSocket: %o', error);
			}
		}
	}, {
		key: '_setWebSocket',
		value: function _setWebSocket() {
			var _this2 = this;

			var options = this._options;
			var operation = retry.operation(this._options.retry || DEFAULT_RETRY_OPTIONS);
			var wasConnected = false;

			operation.attempt(function (currentAttempt) {
				if (_this2._closed) {
					operation.stop();

					return;
				}

				logger.debug('_setWebSocket() [currentAttempt:%s]', currentAttempt);

				_this2._ws = new W3CWebSocket(_this2._url, WS_SUBPROTOCOL, options.origin, options.headers, options.requestOptions, options.clientConfig);

				_this2.emit('connecting', currentAttempt);

				_this2._ws.onopen = function () {
					if (_this2._closed) return;

					wasConnected = true;

					// Emit 'open' event.
					_this2.emit('open');
				};

				_this2._ws.onclose = function (event) {
					if (_this2._closed) return;

					logger.warn('WebSocket "close" event [wasClean:%s, code:%s, reason:"%s"]', event.wasClean, event.code, event.reason);

					// Don't retry if code is 4000 (closed by the server).
					if (event.code !== 4000) {
						// If it was not connected, try again.
						if (!wasConnected) {
							_this2.emit('failed', currentAttempt);

							if (operation.retry(true)) return;
						}
						// If it was connected, start from scratch.
						else {
								operation.stop();

								_this2.emit('disconnected');
								_this2._setWebSocket();

								return;
							}
					}

					_this2._closed = true;

					// Emit 'close' event.
					_this2.emit('close');
				};

				_this2._ws.onerror = function () {
					if (_this2._closed) return;

					logger.error('WebSocket "error" event');
				};

				_this2._ws.onmessage = function (event) {
					if (_this2._closed) return;

					var message = Message.parse(event.data);

					if (!message) return;

					if (_this2.listenerCount('message') === 0) {
						logger.error('no listeners for WebSocket "message" event, ignoring received message');

						return;
					}

					// Emit 'message' event.
					_this2.emit('message', message);
				};
			});
		}
	}, {
		key: 'closed',
		get: function get() {
			return this._closed;
		}
	}]);
	return WebSocketTransport;
}(EventEmitter);

module.exports = WebSocketTransport;

},{"../Message":161,"../logger":164,"babel-runtime/core-js/json/stringify":14,"babel-runtime/core-js/object/get-prototype-of":18,"babel-runtime/core-js/promise":21,"babel-runtime/helpers/classCallCheck":25,"babel-runtime/helpers/createClass":26,"babel-runtime/helpers/inherits":27,"babel-runtime/helpers/possibleConstructorReturn":28,"events":158,"retry":172,"websocket":180}],166:[function(require,module,exports){
'use strict';

var WebSocketTransport = require('./WebSocketTransport');

module.exports = {
	WebSocketTransport: WebSocketTransport
};

},{"./WebSocketTransport":165}],167:[function(require,module,exports){
'use strict';

var randomNumber = require('random-number');

var randomNumberGenerator = randomNumber.generator({
	min: 1000000,
	max: 9999999,
	integer: true
});

module.exports = {
	randomNumber: randomNumberGenerator
};

},{"random-number":169}],168:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

/**
 * Decode a URI encoded string.
 *
 * @param {String} input The URI encoded string.
 * @returns {String} The decoded string.
 * @api private
 */
function decode(input) {
  return decodeURIComponent(input.replace(/\+/g, ' '));
}

/**
 * Simple query string parser.
 *
 * @param {String} query The query string that needs to be parsed.
 * @returns {Object}
 * @api public
 */
function querystring(query) {
  var parser = /([^=?&]+)=?([^&]*)/g
    , result = {}
    , part;

  //
  // Little nifty parsing hack, leverage the fact that RegExp.exec increments
  // the lastIndex property so we can continue executing this loop until we've
  // parsed all results.
  //
  for (;
    part = parser.exec(query);
    result[decode(part[1])] = decode(part[2])
  );

  return result;
}

/**
 * Transform a query string to an object.
 *
 * @param {Object} obj Object that should be transformed.
 * @param {String} prefix Optional prefix.
 * @returns {String}
 * @api public
 */
function querystringify(obj, prefix) {
  prefix = prefix || '';

  var pairs = [];

  //
  // Optionally prefix with a '?' if needed
  //
  if ('string' !== typeof prefix) prefix = '?';

  for (var key in obj) {
    if (has.call(obj, key)) {
      pairs.push(encodeURIComponent(key) +'='+ encodeURIComponent(obj[key]));
    }
  }

  return pairs.length ? prefix + pairs.join('&') : '';
}

//
// Expose the module.
//
exports.stringify = querystringify;
exports.parse = querystring;

},{}],169:[function(require,module,exports){
void function(root){

  function defaults(options){
    var options = options || {}
    var min = options.min
    var max = options.max
    var integer = options.integer || false
    if ( min == null && max == null ) {
      min = 0
      max = 1
    } else if ( min == null ) {
      min = max - 1
    } else if ( max == null ) {
      max = min + 1
    }
    if ( max < min ) throw new Error('invalid options, max must be >= min')
    return {
      min:     min
    , max:     max
    , integer: integer
    }
  }

  function random(options){
    options = defaults(options)
    if ( options.max === options.min ) return options.min
    var r = Math.random() * (options.max - options.min + Number(!!options.integer)) + options.min
    return options.integer ? Math.floor(r) : r
  }

  function generator(options){
    options = defaults(options)
    return function(min, max, integer){
      options.min     = min != null ? min : options.min
      options.max     = max != null ? max : options.max
      options.integer = integer != null ? integer : options.integer
      return random(options)
    }
  }

  module.exports =  random
  module.exports.generator = generator
  module.exports.defaults = defaults
}(this)

},{}],170:[function(require,module,exports){
/*
 * random-string
 * https://github.com/valiton/node-random-string
 *
 * Copyright (c) 2013 Valiton GmbH, Bastian 'hereandnow' Behrens
 * Licensed under the MIT license.
 */

'use strict';

var numbers = '0123456789',
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    specials = '!$%^&*()_+|~-=`{}[]:;<>?,./';


function _defaults (opts) {
  opts || (opts = {});
  return {
    length: opts.length || 8,
    numeric: typeof opts.numeric === 'boolean' ? opts.numeric : true,
    letters: typeof opts.letters === 'boolean' ? opts.letters : true,
    special: typeof opts.special === 'boolean' ? opts.special : false,
    exclude: Array.isArray(opts.exclude)       ? opts.exclude : []
  };
}

function _buildChars (opts) {
  var chars = '';
  if (opts.numeric) { chars += numbers; }
  if (opts.letters) { chars += letters; }
  if (opts.special) { chars += specials; }
  for (var i = 0; i <= opts.exclude.length; i++){
    chars = chars.replace(opts.exclude[i], "");
  }
  return chars;
}

module.exports = function randomString(opts) {
  opts = _defaults(opts);
  var i, rn,
      rnd = '',
      len = opts.length,
      exclude = opts.exclude,
      randomChars = _buildChars(opts);
  for (i = 1; i <= len; i++) {
    rnd += randomChars.substring(rn = Math.floor(Math.random() * randomChars.length), rn + 1);
  }
  return rnd;
};


},{}],171:[function(require,module,exports){
'use strict';

/**
 * Check if we're required to add a port number.
 *
 * @see https://url.spec.whatwg.org/#default-port
 * @param {Number|String} port Port number we need to check
 * @param {String} protocol Protocol we need to check against.
 * @returns {Boolean} Is it a default port for the given protocol
 * @api private
 */
module.exports = function required(port, protocol) {
  protocol = protocol.split(':')[0];
  port = +port;

  if (!port) return false;

  switch (protocol) {
    case 'http':
    case 'ws':
    return port !== 80;

    case 'https':
    case 'wss':
    return port !== 443;

    case 'ftp':
    return port !== 21;

    case 'gopher':
    return port !== 70;

    case 'file':
    return false;
  }

  return port !== 0;
};

},{}],172:[function(require,module,exports){
module.exports = require('./lib/retry');
},{"./lib/retry":173}],173:[function(require,module,exports){
var RetryOperation = require('./retry_operation');

exports.operation = function(options) {
  var timeouts = exports.timeouts(options);
  return new RetryOperation(timeouts, {
      forever: options && options.forever,
      unref: options && options.unref
  });
};

exports.timeouts = function(options) {
  if (options instanceof Array) {
    return [].concat(options);
  }

  var opts = {
    retries: 10,
    factor: 2,
    minTimeout: 1 * 1000,
    maxTimeout: Infinity,
    randomize: false
  };
  for (var key in options) {
    opts[key] = options[key];
  }

  if (opts.minTimeout > opts.maxTimeout) {
    throw new Error('minTimeout is greater than maxTimeout');
  }

  var timeouts = [];
  for (var i = 0; i < opts.retries; i++) {
    timeouts.push(this.createTimeout(i, opts));
  }

  if (options && options.forever && !timeouts.length) {
    timeouts.push(this.createTimeout(i, opts));
  }

  // sort the array numerically ascending
  timeouts.sort(function(a,b) {
    return a - b;
  });

  return timeouts;
};

exports.createTimeout = function(attempt, opts) {
  var random = (opts.randomize)
    ? (Math.random() + 1)
    : 1;

  var timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
  timeout = Math.min(timeout, opts.maxTimeout);

  return timeout;
};

exports.wrap = function(obj, options, methods) {
  if (options instanceof Array) {
    methods = options;
    options = null;
  }

  if (!methods) {
    methods = [];
    for (var key in obj) {
      if (typeof obj[key] === 'function') {
        methods.push(key);
      }
    }
  }

  for (var i = 0; i < methods.length; i++) {
    var method   = methods[i];
    var original = obj[method];

    obj[method] = function retryWrapper() {
      var op       = exports.operation(options);
      var args     = Array.prototype.slice.call(arguments);
      var callback = args.pop();

      args.push(function(err) {
        if (op.retry(err)) {
          return;
        }
        if (err) {
          arguments[0] = op.mainError();
        }
        callback.apply(this, arguments);
      });

      op.attempt(function() {
        original.apply(obj, args);
      });
    };
    obj[method].options = options;
  }
};

},{"./retry_operation":174}],174:[function(require,module,exports){
function RetryOperation(timeouts, options) {
  // Compatibility for the old (timeouts, retryForever) signature
  if (typeof options === 'boolean') {
    options = { forever: options };
  }

  this._timeouts = timeouts;
  this._options = options || {};
  this._fn = null;
  this._errors = [];
  this._attempts = 1;
  this._operationTimeout = null;
  this._operationTimeoutCb = null;
  this._timeout = null;

  if (this._options.forever) {
    this._cachedTimeouts = this._timeouts.slice(0);
  }
}
module.exports = RetryOperation;

RetryOperation.prototype.stop = function() {
  if (this._timeout) {
    clearTimeout(this._timeout);
  }

  this._timeouts       = [];
  this._cachedTimeouts = null;
};

RetryOperation.prototype.retry = function(err) {
  if (this._timeout) {
    clearTimeout(this._timeout);
  }

  if (!err) {
    return false;
  }

  this._errors.push(err);

  var timeout = this._timeouts.shift();
  if (timeout === undefined) {
    if (this._cachedTimeouts) {
      // retry forever, only keep last error
      this._errors.splice(this._errors.length - 1, this._errors.length);
      this._timeouts = this._cachedTimeouts.slice(0);
      timeout = this._timeouts.shift();
    } else {
      return false;
    }
  }

  var self = this;
  var timer = setTimeout(function() {
    self._attempts++;

    if (self._operationTimeoutCb) {
      self._timeout = setTimeout(function() {
        self._operationTimeoutCb(self._attempts);
      }, self._operationTimeout);

      if (this._options.unref) {
          self._timeout.unref();
      }
    }

    self._fn(self._attempts);
  }, timeout);

  if (this._options.unref) {
      timer.unref();
  }

  return true;
};

RetryOperation.prototype.attempt = function(fn, timeoutOps) {
  this._fn = fn;

  if (timeoutOps) {
    if (timeoutOps.timeout) {
      this._operationTimeout = timeoutOps.timeout;
    }
    if (timeoutOps.cb) {
      this._operationTimeoutCb = timeoutOps.cb;
    }
  }

  var self = this;
  if (this._operationTimeoutCb) {
    this._timeout = setTimeout(function() {
      self._operationTimeoutCb();
    }, self._operationTimeout);
  }

  this._fn(this._attempts);
};

RetryOperation.prototype.try = function(fn) {
  console.log('Using RetryOperation.try() is deprecated');
  this.attempt(fn);
};

RetryOperation.prototype.start = function(fn) {
  console.log('Using RetryOperation.start() is deprecated');
  this.attempt(fn);
};

RetryOperation.prototype.start = RetryOperation.prototype.try;

RetryOperation.prototype.errors = function() {
  return this._errors;
};

RetryOperation.prototype.attempts = function() {
  return this._attempts;
};

RetryOperation.prototype.mainError = function() {
  if (this._errors.length === 0) {
    return null;
  }

  var counts = {};
  var mainError = null;
  var mainErrorCount = 0;

  for (var i = 0; i < this._errors.length; i++) {
    var error = this._errors[i];
    var message = error.message;
    var count = (counts[message] || 0) + 1;

    counts[message] = count;

    if (count >= mainErrorCount) {
      mainError = error;
      mainErrorCount = count;
    }
  }

  return mainError;
};

},{}],175:[function(require,module,exports){
var grammar = module.exports = {
  v: [{
    name: 'version',
    reg: /^(\d*)$/
  }],
  o: [{ //o=- 20518 0 IN IP4 203.0.113.1
    // NB: sessionId will be a String in most cases because it is huge
    name: 'origin',
    reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,
    names: ['username', 'sessionId', 'sessionVersion', 'netType', 'ipVer', 'address'],
    format: '%s %s %d %s IP%d %s'
  }],
  // default parsing of these only (though some of these feel outdated)
  s: [{ name: 'name' }],
  i: [{ name: 'description' }],
  u: [{ name: 'uri' }],
  e: [{ name: 'email' }],
  p: [{ name: 'phone' }],
  z: [{ name: 'timezones' }], // TODO: this one can actually be parsed properly..
  r: [{ name: 'repeats' }],   // TODO: this one can also be parsed properly
  //k: [{}], // outdated thing ignored
  t: [{ //t=0 0
    name: 'timing',
    reg: /^(\d*) (\d*)/,
    names: ['start', 'stop'],
    format: '%d %d'
  }],
  c: [{ //c=IN IP4 10.47.197.26
    name: 'connection',
    reg: /^IN IP(\d) (\S*)/,
    names: ['version', 'ip'],
    format: 'IN IP%d %s'
  }],
  b: [{ //b=AS:4000
    push: 'bandwidth',
    reg: /^(TIAS|AS|CT|RR|RS):(\d*)/,
    names: ['type', 'limit'],
    format: '%s:%s'
  }],
  m: [{ //m=video 51744 RTP/AVP 126 97 98 34 31
    // NB: special - pushes to session
    // TODO: rtp/fmtp should be filtered by the payloads found here?
    reg: /^(\w*) (\d*) ([\w\/]*)(?: (.*))?/,
    names: ['type', 'port', 'protocol', 'payloads'],
    format: '%s %d %s %s'
  }],
  a: [
    { //a=rtpmap:110 opus/48000/2
      push: 'rtp',
      reg: /^rtpmap:(\d*) ([\w\-\.]*)(?:\s*\/(\d*)(?:\s*\/(\S*))?)?/,
      names: ['payload', 'codec', 'rate', 'encoding'],
      format: function (o) {
        return (o.encoding) ?
          'rtpmap:%d %s/%s/%s':
          o.rate ?
          'rtpmap:%d %s/%s':
          'rtpmap:%d %s';
      }
    },
    { //a=fmtp:108 profile-level-id=24;object=23;bitrate=64000
      //a=fmtp:111 minptime=10; useinbandfec=1
      push: 'fmtp',
      reg: /^fmtp:(\d*) ([\S| ]*)/,
      names: ['payload', 'config'],
      format: 'fmtp:%d %s'
    },
    { //a=control:streamid=0
      name: 'control',
      reg: /^control:(.*)/,
      format: 'control:%s'
    },
    { //a=rtcp:65179 IN IP4 193.84.77.194
      name: 'rtcp',
      reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,
      names: ['port', 'netType', 'ipVer', 'address'],
      format: function (o) {
        return (o.address != null) ?
          'rtcp:%d %s IP%d %s':
          'rtcp:%d';
      }
    },
    { //a=rtcp-fb:98 trr-int 100
      push: 'rtcpFbTrrInt',
      reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/,
      names: ['payload', 'value'],
      format: 'rtcp-fb:%d trr-int %d'
    },
    { //a=rtcp-fb:98 nack rpsi
      push: 'rtcpFb',
      reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,
      names: ['payload', 'type', 'subtype'],
      format: function (o) {
        return (o.subtype != null) ?
          'rtcp-fb:%s %s %s':
          'rtcp-fb:%s %s';
      }
    },
    { //a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
      //a=extmap:1/recvonly URI-gps-string
      push: 'ext',
      reg: /^extmap:(\d+)(?:\/(\w+))? (\S*)(?: (\S*))?/,
      names: ['value', 'direction', 'uri', 'config'],
      format: function (o) {
        return 'extmap:%d' + (o.direction ? '/%s' : '%v') + ' %s' + (o.config ? ' %s' : '');
      }
    },
    { //a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:PS1uQCVeeCFCanVmcjkpPywjNWhcYD0mXXtxaVBR|2^20|1:32
      push: 'crypto',
      reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,
      names: ['id', 'suite', 'config', 'sessionConfig'],
      format: function (o) {
        return (o.sessionConfig != null) ?
          'crypto:%d %s %s %s':
          'crypto:%d %s %s';
      }
    },
    { //a=setup:actpass
      name: 'setup',
      reg: /^setup:(\w*)/,
      format: 'setup:%s'
    },
    { //a=mid:1
      name: 'mid',
      reg: /^mid:([^\s]*)/,
      format: 'mid:%s'
    },
    { //a=msid:0c8b064d-d807-43b4-b434-f92a889d8587 98178685-d409-46e0-8e16-7ef0db0db64a
      name: 'msid',
      reg: /^msid:(.*)/,
      format: 'msid:%s'
    },
    { //a=ptime:20
      name: 'ptime',
      reg: /^ptime:(\d*)/,
      format: 'ptime:%d'
    },
    { //a=maxptime:60
      name: 'maxptime',
      reg: /^maxptime:(\d*)/,
      format: 'maxptime:%d'
    },
    { //a=sendrecv
      name: 'direction',
      reg: /^(sendrecv|recvonly|sendonly|inactive)/
    },
    { //a=ice-lite
      name: 'icelite',
      reg: /^(ice-lite)/
    },
    { //a=ice-ufrag:F7gI
      name: 'iceUfrag',
      reg: /^ice-ufrag:(\S*)/,
      format: 'ice-ufrag:%s'
    },
    { //a=ice-pwd:x9cml/YzichV2+XlhiMu8g
      name: 'icePwd',
      reg: /^ice-pwd:(\S*)/,
      format: 'ice-pwd:%s'
    },
    { //a=fingerprint:SHA-1 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33
      name: 'fingerprint',
      reg: /^fingerprint:(\S*) (\S*)/,
      names: ['type', 'hash'],
      format: 'fingerprint:%s %s'
    },
    { //a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
      //a=candidate:1162875081 1 udp 2113937151 192.168.34.75 60017 typ host generation 0 network-id 3 network-cost 10
      //a=candidate:3289912957 2 udp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 generation 0 network-id 3 network-cost 10
      //a=candidate:229815620 1 tcp 1518280447 192.168.150.19 60017 typ host tcptype active generation 0 network-id 3 network-cost 10
      //a=candidate:3289912957 2 tcp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 tcptype passive generation 0 network-id 3 network-cost 10
      push:'candidates',
      reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: tcptype (\S*))?(?: generation (\d*))?(?: network-id (\d*))?(?: network-cost (\d*))?/,
      names: ['foundation', 'component', 'transport', 'priority', 'ip', 'port', 'type', 'raddr', 'rport', 'tcptype', 'generation', 'network-id', 'network-cost'],
      format: function (o) {
        var str = 'candidate:%s %d %s %d %s %d typ %s';

        str += (o.raddr != null) ? ' raddr %s rport %d' : '%v%v';

        // NB: candidate has three optional chunks, so %void middles one if it's missing
        str += (o.tcptype != null) ? ' tcptype %s' : '%v';

        if (o.generation != null) {
          str += ' generation %d';
        }

        str += (o['network-id'] != null) ? ' network-id %d' : '%v';
        str += (o['network-cost'] != null) ? ' network-cost %d' : '%v';
        return str;
      }
    },
    { //a=end-of-candidates (keep after the candidates line for readability)
      name: 'endOfCandidates',
      reg: /^(end-of-candidates)/
    },
    { //a=remote-candidates:1 203.0.113.1 54400 2 203.0.113.1 54401 ...
      name: 'remoteCandidates',
      reg: /^remote-candidates:(.*)/,
      format: 'remote-candidates:%s'
    },
    { //a=ice-options:google-ice
      name: 'iceOptions',
      reg: /^ice-options:(\S*)/,
      format: 'ice-options:%s'
    },
    { //a=ssrc:2566107569 cname:t9YU8M1UxTF8Y1A1
      push: 'ssrcs',
      reg: /^ssrc:(\d*) ([\w_]*)(?::(.*))?/,
      names: ['id', 'attribute', 'value'],
      format: function (o) {
        var str = 'ssrc:%d';
        if (o.attribute != null) {
          str += ' %s';
          if (o.value != null) {
            str += ':%s';
          }
        }
        return str;
      }
    },
    { //a=ssrc-group:FEC 1 2
      //a=ssrc-group:FEC-FR 3004364195 1080772241
      push: 'ssrcGroups',
      // token-char = %x21 / %x23-27 / %x2A-2B / %x2D-2E / %x30-39 / %x41-5A / %x5E-7E
      reg: /^ssrc-group:([\x21\x23\x24\x25\x26\x27\x2A\x2B\x2D\x2E\w]*) (.*)/,
      names: ['semantics', 'ssrcs'],
      format: 'ssrc-group:%s %s'
    },
    { //a=msid-semantic: WMS Jvlam5X3SX1OP6pn20zWogvaKJz5Hjf9OnlV
      name: 'msidSemantic',
      reg: /^msid-semantic:\s?(\w*) (\S*)/,
      names: ['semantic', 'token'],
      format: 'msid-semantic: %s %s' // space after ':' is not accidental
    },
    { //a=group:BUNDLE audio video
      push: 'groups',
      reg: /^group:(\w*) (.*)/,
      names: ['type', 'mids'],
      format: 'group:%s %s'
    },
    { //a=rtcp-mux
      name: 'rtcpMux',
      reg: /^(rtcp-mux)/
    },
    { //a=rtcp-rsize
      name: 'rtcpRsize',
      reg: /^(rtcp-rsize)/
    },
    { //a=sctpmap:5000 webrtc-datachannel 1024
      name: 'sctpmap',
      reg: /^sctpmap:([\w_\/]*) (\S*)(?: (\S*))?/,
      names: ['sctpmapNumber', 'app', 'maxMessageSize'],
      format: function (o) {
        return (o.maxMessageSize != null) ?
          'sctpmap:%s %s %s' :
          'sctpmap:%s %s';
      }
    },
    { //a=x-google-flag:conference
      name: 'xGoogleFlag',
      reg: /^x-google-flag:([^\s]*)/,
      format: 'x-google-flag:%s'
    },
    { //a=rid:1 send max-width=1280;max-height=720;max-fps=30;depend=0
      push: 'rids',
      reg: /^rid:([\d\w]+) (\w+)(?: ([\S| ]*))?/,
      names: ['id', 'direction', 'params'],
      format: function (o) {
        return (o.params) ? 'rid:%s %s %s' : 'rid:%s %s';
      }
    },
    { //a=imageattr:97 send [x=800,y=640,sar=1.1,q=0.6] [x=480,y=320] recv [x=330,y=250]
      //a=imageattr:* send [x=800,y=640] recv *
      //a=imageattr:100 recv [x=320,y=240]
      push: 'imageattrs',
      reg: new RegExp(
        //a=imageattr:97
        '^imageattr:(\\d+|\\*)' +
        //send [x=800,y=640,sar=1.1,q=0.6] [x=480,y=320]
        '[\\s\\t]+(send|recv)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*)' +
        //recv [x=330,y=250]
        '(?:[\\s\\t]+(recv|send)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*))?'
      ),
      names: ['pt', 'dir1', 'attrs1', 'dir2', 'attrs2'],
      format: function (o) {
        return 'imageattr:%s %s %s' + (o.dir2 ? ' %s %s' : '');
      }
    },
    { //a=simulcast:send 1,2,3;~4,~5 recv 6;~7,~8
      //a=simulcast:recv 1;4,5 send 6;7
      name: 'simulcast',
      reg: new RegExp(
        //a=simulcast:
        '^simulcast:' +
        //send 1,2,3;~4,~5
        '(send|recv) ([a-zA-Z0-9\\-_~;,]+)' +
        //space + recv 6;~7,~8
        '(?:\\s?(send|recv) ([a-zA-Z0-9\\-_~;,]+))?' +
        //end
        '$'
      ),
      names: ['dir1', 'list1', 'dir2', 'list2'],
      format: function (o) {
        return 'simulcast:%s %s' + (o.dir2 ? ' %s %s' : '');
      }
    },
    { //Old simulcast draft 03 (implemented by Firefox)
      //  https://tools.ietf.org/html/draft-ietf-mmusic-sdp-simulcast-03
      //a=simulcast: recv pt=97;98 send pt=97
      //a=simulcast: send rid=5;6;7 paused=6,7
      name: 'simulcast_03',
      reg: /^simulcast:[\s\t]+([\S+\s\t]+)$/,
      names: ['value'],
      format: 'simulcast: %s'
    },
    {
      //a=framerate:25
      //a=framerate:29.97
      name: 'framerate',
      reg: /^framerate:(\d+(?:$|\.\d+))/,
      format: 'framerate:%s'
    },
    { // any a= that we don't understand is kepts verbatim on media.invalid
      push: 'invalid',
      names: ['value']
    }
  ]
};

// set sensible defaults to avoid polluting the grammar with boring details
Object.keys(grammar).forEach(function (key) {
  var objs = grammar[key];
  objs.forEach(function (obj) {
    if (!obj.reg) {
      obj.reg = /(.*)/;
    }
    if (!obj.format) {
      obj.format = '%s';
    }
  });
});

},{}],176:[function(require,module,exports){
var parser = require('./parser');
var writer = require('./writer');

exports.write = writer;
exports.parse = parser.parse;
exports.parseFmtpConfig = parser.parseFmtpConfig;
exports.parseParams = parser.parseParams;
exports.parsePayloads = parser.parsePayloads;
exports.parseRemoteCandidates = parser.parseRemoteCandidates;
exports.parseImageAttributes = parser.parseImageAttributes;
exports.parseSimulcastStreamList = parser.parseSimulcastStreamList;

},{"./parser":177,"./writer":178}],177:[function(require,module,exports){
var toIntIfInt = function (v) {
  return String(Number(v)) === v ? Number(v) : v;
};

var attachProperties = function (match, location, names, rawName) {
  if (rawName && !names) {
    location[rawName] = toIntIfInt(match[1]);
  }
  else {
    for (var i = 0; i < names.length; i += 1) {
      if (match[i+1] != null) {
        location[names[i]] = toIntIfInt(match[i+1]);
      }
    }
  }
};

var parseReg = function (obj, location, content) {
  var needsBlank = obj.name && obj.names;
  if (obj.push && !location[obj.push]) {
    location[obj.push] = [];
  }
  else if (needsBlank && !location[obj.name]) {
    location[obj.name] = {};
  }
  var keyLocation = obj.push ?
    {} :  // blank object that will be pushed
    needsBlank ? location[obj.name] : location; // otherwise, named location or root

  attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);

  if (obj.push) {
    location[obj.push].push(keyLocation);
  }
};

var grammar = require('./grammar');
var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);

exports.parse = function (sdp) {
  var session = {}
    , media = []
    , location = session; // points at where properties go under (one of the above)

  // parse lines we understand
  sdp.split(/(\r\n|\r|\n)/).filter(validLine).forEach(function (l) {
    var type = l[0];
    var content = l.slice(2);
    if (type === 'm') {
      media.push({rtp: [], fmtp: []});
      location = media[media.length-1]; // point at latest media line
    }

    for (var j = 0; j < (grammar[type] || []).length; j += 1) {
      var obj = grammar[type][j];
      if (obj.reg.test(content)) {
        return parseReg(obj, location, content);
      }
    }
  });

  session.media = media; // link it up
  return session;
};

var paramReducer = function (acc, expr) {
  var s = expr.split(/=(.+)/, 2);
  if (s.length === 2) {
    acc[s[0]] = toIntIfInt(s[1]);
  }
  return acc;
};

exports.parseParams = function (str) {
  return str.split(/\;\s?/).reduce(paramReducer, {});
};

// For backward compatibility - alias will be removed in 3.0.0
exports.parseFmtpConfig = exports.parseParams;

exports.parsePayloads = function (str) {
  return str.split(' ').map(Number);
};

exports.parseRemoteCandidates = function (str) {
  var candidates = [];
  var parts = str.split(' ').map(toIntIfInt);
  for (var i = 0; i < parts.length; i += 3) {
    candidates.push({
      component: parts[i],
      ip: parts[i + 1],
      port: parts[i + 2]
    });
  }
  return candidates;
};

exports.parseImageAttributes = function (str) {
  return str.split(' ').map(function (item) {
    return item.substring(1, item.length-1).split(',').reduce(paramReducer, {});
  });
};

exports.parseSimulcastStreamList = function (str) {
  return str.split(';').map(function (stream) {
    return stream.split(',').map(function (format) {
      var scid, paused = false;

      if (format[0] !== '~') {
        scid = toIntIfInt(format);
      } else {
        scid = toIntIfInt(format.substring(1, format.length));
        paused = true;
      }

      return {
        scid: scid,
        paused: paused
      };
    });
  });
};

},{"./grammar":175}],178:[function(require,module,exports){
var grammar = require('./grammar');

// customized util.format - discards excess arguments and can void middle ones
var formatRegExp = /%[sdv%]/g;
var format = function (formatStr) {
  var i = 1;
  var args = arguments;
  var len = args.length;
  return formatStr.replace(formatRegExp, function (x) {
    if (i >= len) {
      return x; // missing argument
    }
    var arg = args[i];
    i += 1;
    switch (x) {
    case '%%':
      return '%';
    case '%s':
      return String(arg);
    case '%d':
      return Number(arg);
    case '%v':
      return '';
    }
  });
  // NB: we discard excess arguments - they are typically undefined from makeLine
};

var makeLine = function (type, obj, location) {
  var str = obj.format instanceof Function ?
    (obj.format(obj.push ? location : location[obj.name])) :
    obj.format;

  var args = [type + '=' + str];
  if (obj.names) {
    for (var i = 0; i < obj.names.length; i += 1) {
      var n = obj.names[i];
      if (obj.name) {
        args.push(location[obj.name][n]);
      }
      else { // for mLine and push attributes
        args.push(location[obj.names[i]]);
      }
    }
  }
  else {
    args.push(location[obj.name]);
  }
  return format.apply(null, args);
};

// RFC specified order
// TODO: extend this with all the rest
var defaultOuterOrder = [
  'v', 'o', 's', 'i',
  'u', 'e', 'p', 'c',
  'b', 't', 'r', 'z', 'a'
];
var defaultInnerOrder = ['i', 'c', 'b', 'a'];


module.exports = function (session, opts) {
  opts = opts || {};
  // ensure certain properties exist
  if (session.version == null) {
    session.version = 0; // 'v=0' must be there (only defined version atm)
  }
  if (session.name == null) {
    session.name = ' '; // 's= ' must be there if no meaningful name set
  }
  session.media.forEach(function (mLine) {
    if (mLine.payloads == null) {
      mLine.payloads = '';
    }
  });

  var outerOrder = opts.outerOrder || defaultOuterOrder;
  var innerOrder = opts.innerOrder || defaultInnerOrder;
  var sdp = [];

  // loop through outerOrder for matching properties on session
  outerOrder.forEach(function (type) {
    grammar[type].forEach(function (obj) {
      if (obj.name in session && session[obj.name] != null) {
        sdp.push(makeLine(type, obj, session));
      }
      else if (obj.push in session && session[obj.push] != null) {
        session[obj.push].forEach(function (el) {
          sdp.push(makeLine(type, obj, el));
        });
      }
    });
  });

  // then for each media line, follow the innerOrder
  session.media.forEach(function (mLine) {
    sdp.push(makeLine('m', grammar.m[0], mLine));

    innerOrder.forEach(function (type) {
      grammar[type].forEach(function (obj) {
        if (obj.name in mLine && mLine[obj.name] != null) {
          sdp.push(makeLine(type, obj, mLine));
        }
        else if (obj.push in mLine && mLine[obj.push] != null) {
          mLine[obj.push].forEach(function (el) {
            sdp.push(makeLine(type, obj, el));
          });
        }
      });
    });
  });

  return sdp.join('\r\n') + '\r\n';
};

},{"./grammar":175}],179:[function(require,module,exports){
(function (global){
'use strict';

var required = require('requires-port')
  , qs = require('querystringify')
  , protocolre = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\S\s]*)/i
  , slashes = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//;

/**
 * These are the parse rules for the URL parser, it informs the parser
 * about:
 *
 * 0. The char it Needs to parse, if it's a string it should be done using
 *    indexOf, RegExp using exec and NaN means set as current value.
 * 1. The property we should set when parsing this value.
 * 2. Indication if it's backwards or forward parsing, when set as number it's
 *    the value of extra chars that should be split off.
 * 3. Inherit from location if non existing in the parser.
 * 4. `toLowerCase` the resulting value.
 */
var rules = [
  ['#', 'hash'],                        // Extract from the back.
  ['?', 'query'],                       // Extract from the back.
  ['/', 'pathname'],                    // Extract from the back.
  ['@', 'auth', 1],                     // Extract from the front.
  [NaN, 'host', undefined, 1, 1],       // Set left over value.
  [/:(\d+)$/, 'port', undefined, 1],    // RegExp the back.
  [NaN, 'hostname', undefined, 1, 1]    // Set left over.
];

/**
 * These properties should not be copied or inherited from. This is only needed
 * for all non blob URL's as a blob URL does not include a hash, only the
 * origin.
 *
 * @type {Object}
 * @private
 */
var ignore = { hash: 1, query: 1 };

/**
 * The location object differs when your code is loaded through a normal page,
 * Worker or through a worker using a blob. And with the blobble begins the
 * trouble as the location object will contain the URL of the blob, not the
 * location of the page where our code is loaded in. The actual origin is
 * encoded in the `pathname` so we can thankfully generate a good "default"
 * location from it so we can generate proper relative URL's again.
 *
 * @param {Object|String} loc Optional default location object.
 * @returns {Object} lolcation object.
 * @api public
 */
function lolcation(loc) {
  loc = loc || global.location || {};

  var finaldestination = {}
    , type = typeof loc
    , key;

  if ('blob:' === loc.protocol) {
    finaldestination = new URL(unescape(loc.pathname), {});
  } else if ('string' === type) {
    finaldestination = new URL(loc, {});
    for (key in ignore) delete finaldestination[key];
  } else if ('object' === type) {
    for (key in loc) {
      if (key in ignore) continue;
      finaldestination[key] = loc[key];
    }

    if (finaldestination.slashes === undefined) {
      finaldestination.slashes = slashes.test(loc.href);
    }
  }

  return finaldestination;
}

/**
 * @typedef ProtocolExtract
 * @type Object
 * @property {String} protocol Protocol matched in the URL, in lowercase.
 * @property {Boolean} slashes `true` if protocol is followed by "//", else `false`.
 * @property {String} rest Rest of the URL that is not part of the protocol.
 */

/**
 * Extract protocol information from a URL with/without double slash ("//").
 *
 * @param {String} address URL we want to extract from.
 * @return {ProtocolExtract} Extracted information.
 * @api private
 */
function extractProtocol(address) {
  var match = protocolre.exec(address);

  return {
    protocol: match[1] ? match[1].toLowerCase() : '',
    slashes: !!match[2],
    rest: match[3]
  };
}

/**
 * Resolve a relative URL pathname against a base URL pathname.
 *
 * @param {String} relative Pathname of the relative URL.
 * @param {String} base Pathname of the base URL.
 * @return {String} Resolved pathname.
 * @api private
 */
function resolve(relative, base) {
  var path = (base || '/').split('/').slice(0, -1).concat(relative.split('/'))
    , i = path.length
    , last = path[i - 1]
    , unshift = false
    , up = 0;

  while (i--) {
    if (path[i] === '.') {
      path.splice(i, 1);
    } else if (path[i] === '..') {
      path.splice(i, 1);
      up++;
    } else if (up) {
      if (i === 0) unshift = true;
      path.splice(i, 1);
      up--;
    }
  }

  if (unshift) path.unshift('');
  if (last === '.' || last === '..') path.push('');

  return path.join('/');
}

/**
 * The actual URL instance. Instead of returning an object we've opted-in to
 * create an actual constructor as it's much more memory efficient and
 * faster and it pleases my OCD.
 *
 * @constructor
 * @param {String} address URL we want to parse.
 * @param {Object|String} location Location defaults for relative paths.
 * @param {Boolean|Function} parser Parser for the query string.
 * @api public
 */
function URL(address, location, parser) {
  if (!(this instanceof URL)) {
    return new URL(address, location, parser);
  }

  var relative, extracted, parse, instruction, index, key
    , instructions = rules.slice()
    , type = typeof location
    , url = this
    , i = 0;

  //
  // The following if statements allows this module two have compatibility with
  // 2 different API:
  //
  // 1. Node.js's `url.parse` api which accepts a URL, boolean as arguments
  //    where the boolean indicates that the query string should also be parsed.
  //
  // 2. The `URL` interface of the browser which accepts a URL, object as
  //    arguments. The supplied object will be used as default values / fall-back
  //    for relative paths.
  //
  if ('object' !== type && 'string' !== type) {
    parser = location;
    location = null;
  }

  if (parser && 'function' !== typeof parser) parser = qs.parse;

  location = lolcation(location);

  //
  // Extract protocol information before running the instructions.
  //
  extracted = extractProtocol(address || '');
  relative = !extracted.protocol && !extracted.slashes;
  url.slashes = extracted.slashes || relative && location.slashes;
  url.protocol = extracted.protocol || location.protocol || '';
  address = extracted.rest;

  //
  // When the authority component is absent the URL starts with a path
  // component.
  //
  if (!extracted.slashes) instructions[2] = [/(.*)/, 'pathname'];

  for (; i < instructions.length; i++) {
    instruction = instructions[i];
    parse = instruction[0];
    key = instruction[1];

    if (parse !== parse) {
      url[key] = address;
    } else if ('string' === typeof parse) {
      if (~(index = address.indexOf(parse))) {
        if ('number' === typeof instruction[2]) {
          url[key] = address.slice(0, index);
          address = address.slice(index + instruction[2]);
        } else {
          url[key] = address.slice(index);
          address = address.slice(0, index);
        }
      }
    } else if ((index = parse.exec(address))) {
      url[key] = index[1];
      address = address.slice(0, index.index);
    }

    url[key] = url[key] || (
      relative && instruction[3] ? location[key] || '' : ''
    );

    //
    // Hostname, host and protocol should be lowercased so they can be used to
    // create a proper `origin`.
    //
    if (instruction[4]) url[key] = url[key].toLowerCase();
  }

  //
  // Also parse the supplied query string in to an object. If we're supplied
  // with a custom parser as function use that instead of the default build-in
  // parser.
  //
  if (parser) url.query = parser(url.query);

  //
  // If the URL is relative, resolve the pathname against the base URL.
  //
  if (
      relative
    && location.slashes
    && url.pathname.charAt(0) !== '/'
    && (url.pathname !== '' || location.pathname !== '')
  ) {
    url.pathname = resolve(url.pathname, location.pathname);
  }

  //
  // We should not add port numbers if they are already the default port number
  // for a given protocol. As the host also contains the port number we're going
  // override it with the hostname which contains no port number.
  //
  if (!required(url.port, url.protocol)) {
    url.host = url.hostname;
    url.port = '';
  }

  //
  // Parse down the `auth` for the username and password.
  //
  url.username = url.password = '';
  if (url.auth) {
    instruction = url.auth.split(':');
    url.username = instruction[0] || '';
    url.password = instruction[1] || '';
  }

  url.origin = url.protocol && url.host && url.protocol !== 'file:'
    ? url.protocol +'//'+ url.host
    : 'null';

  //
  // The href is just the compiled result.
  //
  url.href = url.toString();
}

/**
 * This is convenience method for changing properties in the URL instance to
 * insure that they all propagate correctly.
 *
 * @param {String} part          Property we need to adjust.
 * @param {Mixed} value          The newly assigned value.
 * @param {Boolean|Function} fn  When setting the query, it will be the function
 *                               used to parse the query.
 *                               When setting the protocol, double slash will be
 *                               removed from the final url if it is true.
 * @returns {URL}
 * @api public
 */
function set(part, value, fn) {
  var url = this;

  switch (part) {
    case 'query':
      if ('string' === typeof value && value.length) {
        value = (fn || qs.parse)(value);
      }

      url[part] = value;
      break;

    case 'port':
      url[part] = value;

      if (!required(value, url.protocol)) {
        url.host = url.hostname;
        url[part] = '';
      } else if (value) {
        url.host = url.hostname +':'+ value;
      }

      break;

    case 'hostname':
      url[part] = value;

      if (url.port) value += ':'+ url.port;
      url.host = value;
      break;

    case 'host':
      url[part] = value;

      if (/:\d+$/.test(value)) {
        value = value.split(':');
        url.port = value.pop();
        url.hostname = value.join(':');
      } else {
        url.hostname = value;
        url.port = '';
      }

      break;

    case 'protocol':
      url.protocol = value.toLowerCase();
      url.slashes = !fn;
      break;

    case 'pathname':
    case 'hash':
      if (value) {
        var char = part === 'pathname' ? '/' : '#';
        url[part] = value.charAt(0) !== char ? char + value : value;
      } else {
        url[part] = value;
      }
      break;

    default:
      url[part] = value;
  }

  for (var i = 0; i < rules.length; i++) {
    var ins = rules[i];

    if (ins[4]) url[ins[1]] = url[ins[1]].toLowerCase();
  }

  url.origin = url.protocol && url.host && url.protocol !== 'file:'
    ? url.protocol +'//'+ url.host
    : 'null';

  url.href = url.toString();

  return url;
}

/**
 * Transform the properties back in to a valid and full URL string.
 *
 * @param {Function} stringify Optional query stringify function.
 * @returns {String}
 * @api public
 */
function toString(stringify) {
  if (!stringify || 'function' !== typeof stringify) stringify = qs.stringify;

  var query
    , url = this
    , protocol = url.protocol;

  if (protocol && protocol.charAt(protocol.length - 1) !== ':') protocol += ':';

  var result = protocol + (url.slashes ? '//' : '');

  if (url.username) {
    result += url.username;
    if (url.password) result += ':'+ url.password;
    result += '@';
  }

  result += url.host + url.pathname;

  query = 'object' === typeof url.query ? stringify(url.query) : url.query;
  if (query) result += '?' !== query.charAt(0) ? '?'+ query : query;

  if (url.hash) result += url.hash;

  return result;
}

URL.prototype = { set: set, toString: toString };

//
// Expose the URL parser and some additional properties that might be useful for
// others or testing.
//
URL.extractProtocol = extractProtocol;
URL.location = lolcation;
URL.qs = qs;

module.exports = URL;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"querystringify":168,"requires-port":171}],180:[function(require,module,exports){
var _global = (function() { return this; })();
var NativeWebSocket = _global.WebSocket || _global.MozWebSocket;
var websocket_version = require('./version');


/**
 * Expose a W3C WebSocket class with just one or two arguments.
 */
function W3CWebSocket(uri, protocols) {
	var native_instance;

	if (protocols) {
		native_instance = new NativeWebSocket(uri, protocols);
	}
	else {
		native_instance = new NativeWebSocket(uri);
	}

	/**
	 * 'native_instance' is an instance of nativeWebSocket (the browser's WebSocket
	 * class). Since it is an Object it will be returned as it is when creating an
	 * instance of W3CWebSocket via 'new W3CWebSocket()'.
	 *
	 * ECMAScript 5: http://bclary.com/2004/11/07/#a-13.2.2
	 */
	return native_instance;
}
if (NativeWebSocket) {
	['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function(prop) {
		Object.defineProperty(W3CWebSocket, prop, {
			get: function() { return NativeWebSocket[prop]; }
		});
	});
}

/**
 * Module exports.
 */
module.exports = {
    'w3cwebsocket' : NativeWebSocket ? W3CWebSocket : null,
    'version'      : websocket_version
};

},{"./version":181}],181:[function(require,module,exports){
module.exports = require('../package.json').version;

},{"../package.json":182}],182:[function(require,module,exports){
module.exports={
  "_args": [
    [
      "websocket@1.0.25",
      "/home/alex/Desktop/JS/easy-mediasoup"
    ]
  ],
  "_from": "websocket@1.0.25",
  "_id": "websocket@1.0.25",
  "_inBundle": false,
  "_integrity": "sha512-M58njvi6ZxVb5k7kpnHh2BvNKuBWiwIYvsToErBzWhvBZYwlEiLcyLrG41T1jRcrY9ettqPYEqduLI7ul54CVQ==",
  "_location": "/websocket",
  "_optional": true,
  "_phantomChildren": {
    "ms": "2.0.0"
  },
  "_requested": {
    "type": "version",
    "registry": true,
    "raw": "websocket@1.0.25",
    "name": "websocket",
    "escapedName": "websocket",
    "rawSpec": "1.0.25",
    "saveSpec": null,
    "fetchSpec": "1.0.25"
  },
  "_requiredBy": [
    "/protoo-client"
  ],
  "_resolved": "https://registry.npmjs.org/websocket/-/websocket-1.0.25.tgz",
  "_spec": "1.0.25",
  "_where": "/home/alex/Desktop/JS/easy-mediasoup",
  "author": {
    "name": "Brian McKelvey",
    "email": "brian@worlize.com",
    "url": "https://www.worlize.com/"
  },
  "browser": "lib/browser.js",
  "bugs": {
    "url": "https://github.com/theturtle32/WebSocket-Node/issues"
  },
  "config": {
    "verbose": false
  },
  "contributors": [
    {
      "name": "Iñaki Baz Castillo",
      "email": "ibc@aliax.net",
      "url": "http://dev.sipdoc.net"
    }
  ],
  "dependencies": {
    "debug": "^2.2.0",
    "nan": "^2.3.3",
    "typedarray-to-buffer": "^3.1.2",
    "yaeti": "^0.0.6"
  },
  "description": "Websocket Client & Server Library implementing the WebSocket protocol as specified in RFC 6455.",
  "devDependencies": {
    "buffer-equal": "^1.0.0",
    "faucet": "^0.0.1",
    "gulp": "git+https://github.com/gulpjs/gulp.git#4.0",
    "gulp-jshint": "^2.0.4",
    "jshint": "^2.0.0",
    "jshint-stylish": "^2.2.1",
    "tape": "^4.0.1"
  },
  "directories": {
    "lib": "./lib"
  },
  "engines": {
    "node": ">=0.10.0"
  },
  "homepage": "https://github.com/theturtle32/WebSocket-Node",
  "keywords": [
    "websocket",
    "websockets",
    "socket",
    "networking",
    "comet",
    "push",
    "RFC-6455",
    "realtime",
    "server",
    "client"
  ],
  "license": "Apache-2.0",
  "main": "index",
  "name": "websocket",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/theturtle32/WebSocket-Node.git"
  },
  "scripts": {
    "gulp": "gulp",
    "install": "(node-gyp rebuild 2> builderror.log) || (exit 0)",
    "test": "faucet test/unit"
  },
  "version": "1.0.25"
}

},{}],183:[function(require,module,exports){
/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {

});

emitter.on('somenamespace*', function (eventName, payloads) {

});

Please note that callbacks triggered by wildcard registered events also get
the event name as the first argument.
*/

module.exports = WildEmitter;

function WildEmitter() { }

WildEmitter.mixin = function (constructor) {
    var prototype = constructor.prototype || constructor;

    prototype.isWildEmitter= true;

    // Listen on the given `event` with `fn`. Store a group name if present.
    prototype.on = function (event, groupName, fn) {
        this.callbacks = this.callbacks || {};
        var hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        func._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    };

    // Adds an `event` listener that will be invoked a single
    // time then automatically removed.
    prototype.once = function (event, groupName, fn) {
        var self = this,
            hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        function on() {
            self.off(event, on);
            func.apply(this, arguments);
        }
        this.on(event, group, on);
        return this;
    };

    // Unbinds an entire group
    prototype.releaseGroup = function (groupName) {
        this.callbacks = this.callbacks || {};
        var item, i, len, handlers;
        for (item in this.callbacks) {
            handlers = this.callbacks[item];
            for (i = 0, len = handlers.length; i < len; i++) {
                if (handlers[i]._groupName === groupName) {
                    //console.log('removing');
                    // remove it and shorten the array we're looping through
                    handlers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        return this;
    };

    // Remove the given callback for `event` or all
    // registered callbacks.
    prototype.off = function (event, fn) {
        this.callbacks = this.callbacks || {};
        var callbacks = this.callbacks[event],
            i;

        if (!callbacks) return this;

        // remove all handlers
        if (arguments.length === 1) {
            delete this.callbacks[event];
            return this;
        }

        // remove specific handler
        i = callbacks.indexOf(fn);
        callbacks.splice(i, 1);
        if (callbacks.length === 0) {
            delete this.callbacks[event];
        }
        return this;
    };

    /// Emit `event` with the given args.
    // also calls any `*` handlers
    prototype.emit = function (event) {
        this.callbacks = this.callbacks || {};
        var args = [].slice.call(arguments, 1),
            callbacks = this.callbacks[event],
            specialCallbacks = this.getWildcardCallbacks(event),
            i,
            len,
            item,
            listeners;

        if (callbacks) {
            listeners = callbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, args);
            }
        }

        if (specialCallbacks) {
            len = specialCallbacks.length;
            listeners = specialCallbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, [event].concat(args));
            }
        }

        return this;
    };

    // Helper for for finding special wildcard event handlers that match the event
    prototype.getWildcardCallbacks = function (eventName) {
        this.callbacks = this.callbacks || {};
        var item,
            split,
            result = [];

        for (item in this.callbacks) {
            split = item.split('*');
            if (item === '*' || (split.length === 2 && eventName.slice(0, split[0].length) === split[0])) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    };

};

WildEmitter.mixin(WildEmitter);

},{}],184:[function(require,module,exports){
module.exports = {
	EventTarget : require('./lib/EventTarget'),
	Event       : require('./lib/Event')
};

},{"./lib/Event":185,"./lib/EventTarget":186}],185:[function(require,module,exports){
(function (global){
/**
 * In browsers export the native Event interface.
 */

module.exports = global.Event;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],186:[function(require,module,exports){
/**
 * Expose the _EventTarget class.
 */
module.exports = _EventTarget;

function _EventTarget() {
	// Do nothing if called for a native EventTarget object..
	if (typeof this.addEventListener === 'function') {
		return;
	}

	this._listeners = {};

	this.addEventListener = _addEventListener;
	this.removeEventListener = _removeEventListener;
	this.dispatchEvent = _dispatchEvent;
}

Object.defineProperties(_EventTarget.prototype, {
	listeners: {
		get: function () {
			return this._listeners;
		}
	}
});

function _addEventListener(type, newListener) {
	var
		listenersType,
		i, listener;

	if (!type || !newListener) {
		return;
	}

	listenersType = this._listeners[type];
	if (listenersType === undefined) {
		this._listeners[type] = listenersType = [];
	}

	for (i = 0; !!(listener = listenersType[i]); i++) {
		if (listener === newListener) {
			return;
		}
	}

	listenersType.push(newListener);
}

function _removeEventListener(type, oldListener) {
	var
		listenersType,
		i, listener;

	if (!type || !oldListener) {
		return;
	}

	listenersType = this._listeners[type];
	if (listenersType === undefined) {
		return;
	}

	for (i = 0; !!(listener = listenersType[i]); i++) {
		if (listener === oldListener) {
			listenersType.splice(i, 1);
			break;
		}
	}

	if (listenersType.length === 0) {
		delete this._listeners[type];
	}
}

function _dispatchEvent(event) {
	var
		type,
		listenersType,
		dummyListener,
		stopImmediatePropagation = false,
		i, listener;

	if (!event || typeof event.type !== 'string') {
		throw new Error('`event` must have a valid `type` property');
	}

	// Do some stuff to emulate DOM Event behavior (just if this is not a
	// DOM Event object)
	if (event._yaeti) {
		event.target = this;
		event.cancelable = true;
	}

	// Attempt to override the stopImmediatePropagation() method
	try {
		event.stopImmediatePropagation = function () {
			stopImmediatePropagation = true;
		};
	} catch (error) {}

	type = event.type;
	listenersType = (this._listeners[type] || []);

	dummyListener = this['on' + type];
	if (typeof dummyListener === 'function') {
		dummyListener.call(this, event);
	}

	for (i = 0; !!(listener = listenersType[i]); i++) {
		if (stopImmediatePropagation) {
			break;
		}

		listener.call(this, event);
	}

	return !event.defaultPrevented;
}

},{}]},{},[8])(8)
});