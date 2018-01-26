'use strict';

import browser from 'bowser';

import UrlParse from 'url-parse';
import randomString from 'random-string';
import Logger from './Logger';
import * as utils from './utils';
import edgeRTCPeerConnection from './edge/RTCPeerConnection';
import edgeRTCSessionDescription from './edge/RTCSessionDescription';
import Room from './components/Room';
import * as emitter from  "wildemitter"

export class Init{
	constructor(config){
		global.emitter = this.emitter = new emitter.default()
		const REGEXP_FRAGMENT_ROOM_ID = new RegExp('^#room-id=([0-9a-zA-Z_-]+)$');
		const logger = new Logger();

		logger.debug('detected browser [name:"%s", version:%s]', browser.name, browser.version);

		// If Edge, use the Jitsi RTCPeerConnection shim.
		if (browser.msedge)
		{
			logger.debug('Edge detected, overriding RTCPeerConnection and RTCSessionDescription');

			window.RTCPeerConnection = edgeRTCPeerConnection;
			window.RTCSessionDescription = edgeRTCSessionDescription;
		}
		// Otherwise, do almost anything.
		else
		{
			window.RTCPeerConnection =
				window.webkitRTCPeerConnection ||
				window.mozRTCPeerConnection ||
				window.RTCPeerConnection;
		}


		logger.debug('run() [environment:%s]', process.env.NODE_ENV);

		let urlParser = new UrlParse(window.location.href, true);
		let match = urlParser.hash.match(REGEXP_FRAGMENT_ROOM_ID);
		let peerId = randomString({ length: 8 }).toLowerCase();
		let roomId;

		if (match)
		{
			roomId = match[1];
		}
		else
		{
			roomId = randomString({ length: 8 }).toLowerCase();
			// window.location = `#room-id=${roomId}`;
		}
		console.log(config)
		let room = this.client = new Room(config)

		// ReactDOM.render(<App peerId={peerId} roomId={roomId}/>, container);

	}
}