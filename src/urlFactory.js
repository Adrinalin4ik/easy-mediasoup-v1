'use strict';

export function getProtooUrl(media_server_wss, peerId, roomId)
{
	let url = `${media_server_wss}/?peer-id=${peerId}&room-id=${roomId}`;

	return url;
}
