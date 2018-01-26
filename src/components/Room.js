'use strict';

import browser from 'bowser';
// import LocalVideo from './LocalVideo';
// import RemoteVideo from './RemoteVideo';
// import Stats from './Stats';
import Logger from '../Logger';
import * as utils from '../utils';
import Client from '../Client';

const logger = new Logger('Room');
const STATS_INTERVAL = 1000;

export default class Room
{
	constructor(config)
	{
		this.config = config
		this.state =
		{
			peers                : {},
			localStream          : null,
			localVideoResolution : null, // qvga / vga / hd / fullhd.
			multipleWebcams      : false,
			webcamType           : null,
			connectionState      : null,
			remoteStreams        : {},
			showStats            : false,
			stats                : null,
			activeSpeakerId      : null
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


	handleLocalMute(value)
	{
		logger.debug('handleLocalMute() [value:%s]', value);

		let micTrack = this.state.localStream.getAudioTracks()[0];

		if (!micTrack)
			return Promise.reject(new Error('no audio track'));

		micTrack.enabled = !value;

		return Promise.resolve();
	}

	handleLocalWebcamToggle(value)
	{
		logger.debug('handleLocalWebcamToggle() [value:%s]', value);

		return Promise.resolve()
			.then(() => {
				if (value)
					return this._client.addVideo();
				else
					return this._client.removeVideo();
			})
			.then(() => {
				let localStream = this.state.localStream;
				// this.setState({ localStream });
			});
	}

	handleLocalWebcamChange()
	{
		logger.debug('handleLocalWebcamChange()');

		this._client.changeWebcam();
	}

	handleLocalResolutionChange()
	{
		logger.debug('handleLocalResolutionChange()');

		if (!utils.canChangeResolution())
		{
			logger.warn('changing local resolution not implemented for this browser');

			return;
		}

		this._client.changeVideoResolution();
	}

	handleStatsClose()
	{
		logger.debug('handleStatsClose()');

		// this.setState({ showStats: false });
		this.state.showStats = false
		this._stopStats();
	}

	handleClickShowStats()
	{
		logger.debug('handleClickShowStats()');

		// this.setState({ showStats: true });
		this.state.showStats = true
		this._startStats();
	}

	handleDisableRemoteVideo(msid)
	{
		logger.debug('handleDisableRemoteVideo() [msid:"%s"]', msid);

		return this._client.disableRemoteVideo(msid);
	}

	handleEnableRemoteVideo(msid)
	{
		logger.debug('handleEnableRemoteVideo() [msid:"%s"]', msid);

		return this._client.enableRemoteVideo(msid);
	}

	_runClient()
	{
		let peerId = this.config.peerId;
		let roomId = this.config.roomId;

		logger.debug('_runClient() [peerId:"%s", roomId:"%s"]', peerId, roomId);

		this._client = new Client(this.config);

		this._client.on('localstream', (stream, resolution) => {
		// 	this.setState(
		// 		{
		// 			localStream          : stream,
		// 			localVideoResolution : resolution
		// 		});
			this.state.localStream = stream
			this.state.localVideoResolution = resolution
			global.emitter.emit("localstream", stream)
		});

		this._client.on('join', () => {
			// Clear remote streams (for reconnections).
			// this.setState({ remoteStreams: {} });
			this.state.remoteStreams = {}
			// Start retrieving WebRTC stats (unless mobile or Edge).
			if (utils.isDesktop() && !browser.msedge)
			{
				// this.setState({ showStats: true });
				this.state.showStats = true
				setTimeout(() => {
					this._startStats();
				}, STATS_INTERVAL / 2);

				global.emitter.emit("join", null)
			}
		});

		this._client.on('close', (error) =>
		{
			// Clear remote streams (for reconnections) and more stuff.
			// this.setState(
			// 	{
			// 		remoteStreams   : {},
			// 		activeSpeakerId : null
			// 	});
			this.state.remoteStreams = {}
			this.state.activeSpeakerId = null
			if (error)
			{
				// this.config.onNotify(
				// 	{
				// 		level   : 'error',
				// 		title   : 'Error',
				// 		message : error.message
				// 	});
			}

			// Stop retrieving WebRTC stats.
			this._stopStats();
			global.emitter.emit("close", error)
		});

		this._client.on('disconnected', () =>
		{
			// Clear remote streams (for reconnections).
			// this.setState({ remoteStreams: {} });
			this.state.remoteStreams = {}
			// this.config.onNotify(
			// 	{
			// 		level   : 'error',
			// 		title   : 'Warning',
			// 		message : 'app disconnected'
			// 	});

			// Stop retrieving WebRTC stats.
			this._stopStats();
			global.emitter.emit("disconnected", null)
		});

		this._client.on('numwebcams', (num) => {
			this.state.multipleWebcams = (num > 1 ? true : false)
			// this.setState(
			// 	{
			// 		multipleWebcams : (num > 1 ? true : false)
			// 	});
			global.emitter.emit("numwebcams", num)
		});

		this._client.on('webcamtype', (type) =>
		{
			this.state.webcamType = type
			// this.setState({ webcamType: type });
			global.emitter.emit("webcamtype", type)
		});

		this._client.on('peers', (peers) =>
		{
			let peersObject = {};

			for (let peer of peers)
			{
				peersObject[peer.id] = peer;
			}
			
			this.state.peers = peersObject
			// this.setState({ peers: peersObject });

			global.emitter.emit("peers", peers)
		});

		this._client.on('addpeer', (peer) =>
		{
			// this.config.onNotify(
			// 	{
			// 		level   : 'success',
			// 		message : `${peer.id} joined the room`
			// 	});

			let peers = this.state.peers;

			peers[peer.id] = peer;
			
			this.state.peers = peers
			// this.setState({ peers });

			global.emitter.emit("addpeer", peer.id)
		});

		this._client.on('updatepeer', (peer) =>
		{
			let peers = this.state.peers;

			peers[peer.id] = peer;
			
			this.state.peers = peers
			// this.setState({ peers });
			global.emitter.emit("updatepeer", peer)
		});

		this._client.on('removepeer', (peer) =>
		{
			// this.config.onNotify(
			// 	{
			// 		level   : 'info',
			// 		message : `${peer.id} left the room`
			// 	});

			let peers = this.state.peers;

			peer = peers[peer.id];
			if (!peer)
				return;

			delete peers[peer.id];

			// NOTE: This shouldn't be needed but Safari 11 does not fire pc "removestream"
			// nor stream "removetrack" nor track "ended", so we need to cleanup remote
			// streams when a peer leaves.
			let remoteStreams = this.state.remoteStreams;

			for (let msid of peer.msids)
			{
				delete remoteStreams[msid];
			}
			
			this.state.peers = peers
			this.state.remoteStreams = remoteStreams
			// this.setState({ peers, remoteStreams });

			global.emitter.emit("removepeer", peer)
		});

		this._client.on('connectionstate', (state) =>
		{
			// this.setState({ connectionState: state });
			this.state.connectionState = state
			global.emitter.emit("connectionstate", state)
		});

		this._client.on('addstream', (stream) =>
		{
			let remoteStreams = this.state.remoteStreams;
			let streamId = stream.jitsiRemoteId || stream.id;

			remoteStreams[streamId] = stream;
			
			this.state.remoteStreams = remoteStreams
			// this.setState({ remoteStreams });
			global.emitter.emit("addstream", stream)
		});

		this._client.on('removestream', (stream) =>
		{
			let remoteStreams = this.state.remoteStreams;
			let streamId = stream.jitsiRemoteId || stream.id;

			delete remoteStreams[streamId];
			// this.setState({ remoteStreams });
			
			this.state.remoteStreams = remoteStreams

			global.emitter.emit("removestream", stream)
		});

		this._client.on('addtrack', () =>
		{
			let remoteStreams = this.state.remoteStreams;
			this.state.remoteStreams = remoteStreams
			// this.setState({ remoteStreams });
			global.emitter.emit("addtrack", null)
		});

		this._client.on('removetrack', () =>
		{
			let remoteStreams = this.state.remoteStreams;
			this.state.remoteStreams = remoteStreams
			// this.setState({ remoteStreams });
			global.emitter.emit("removetrack", null)
		});

		this._client.on('forcestreamsupdate', () =>
		{
			// Just firef for Firefox due to bug:
			// https://bugzilla.mozilla.org/show_bug.cgi?id=1347578
			// this.forceUpdate();
			global.emitter.emit("forcestreamsupdate", null)
		});

		this._client.on('activespeaker', (peer) =>
		{
			this.state.activeSpeakerId = peer ? peer.id : null
			// this.setState(
			// 	{
			// 		activeSpeakerId : (peer ? peer.id : null)
			// 	});
			global.emitter.emit("activespeaker", peer)
		});
	}

	_startStats()
	{
		logger.debug('_startStats()');

		getStats.call(this);

		function getStats()
		{
			this._client.getStats()
				.then((stats) =>
				{
					// if (!this._mounted)
					// 	return;
					this.state.stats = stats
					// this.setState({ stats });

					this._statsTimer = setTimeout(() =>
					{
						getStats.call(this);
					}, STATS_INTERVAL);
				})
				.catch((error) =>
				{
					logger.error('getStats() failed: %o', error);
					this.state.stats = null
					// this.setState({ stats: null });

					// this._statsTimer = setTimeout(() =>
					// {
					// 	getStats.call(this);
					// }, STATS_INTERVAL);
				});
		}
	}

	_stopStats()
	{
		logger.debug('_stopStats()');
		this.state.stats = null
		// this.setState({ stats: null });

		clearTimeout(this._statsTimer);
	}
}
