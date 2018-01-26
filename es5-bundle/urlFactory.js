'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.getProtooUrl = getProtooUrl;
function getProtooUrl(media_server_wss, peerId, roomId) {
	var url = media_server_wss + '/?peer-id=' + peerId + '&room-id=' + roomId;

	return url;
}