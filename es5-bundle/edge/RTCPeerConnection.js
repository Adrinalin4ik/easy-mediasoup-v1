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