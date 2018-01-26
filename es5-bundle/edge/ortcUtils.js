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