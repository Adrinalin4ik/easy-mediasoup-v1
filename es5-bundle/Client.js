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