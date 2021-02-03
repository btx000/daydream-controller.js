/**
 * @author mrdoob / http://mrdoob.com/
 */

function DaydreamController () {

	var state = {};

	function connect () {

		return navigator.bluetooth.requestDevice({
			filters: [{
				name: 'mojing-motion'
			}],
			optionalServices: ['622f5b2a-60da-4484-929a-69e3a9140258']
		})
			.then(function (device) {
				return device.gatt.connect();
			})
			.then(function (server) {
				return server.getPrimaryService('622f5b2a-60da-4484-929a-69e3a9140258');
			})
			.then(function (service) {
				return service.getCharacteristic('ffb4a651-c224-420b-a134-13d3aba313fb');
			})
			.then(function (characteristic) {
				characteristic.addEventListener('characteristicvaluechanged', handleData);
				return characteristic.startNotifications();
			})

	}

	function parseInt (original, valid_bit_length) {
		var result = (original << (32 - valid_bit_length)) >> (32 - valid_bit_length)
		return result
	}

	function getOrigentation (paramInt) {
		return paramInt / Math.sqrt(2.0) / 8191.0;
	}

	function getGravity (paramInt) {
		return 9.8 * 8.0 * paramInt / 4095.0;
	}

	function getGyro (paramInt) {
		return 2048.0 * Math.PI * paramInt / 4095.0 / 180;
	}

	var lastTimestamp = 0;
	var F = 0;


	function handleData (event) {

		var data = event.target.value;

		var info = {};
		var state = {};
		info.timestamp = ((data.getUint8(0) & 0xFF) << 1) | ((data.getUint8(1) & 0x80) >> 7);

		info.idx = (data.getUint8(1) & 0x60) >> 5;

		info.orientation1 = ((data.getUint8(1) & 0x31) << 9) | ((data.getUint8(2) & 0xff) << 1) | ((data.getUint8(3) & 0x80) >> 7);
		info.orientation1 = parseInt(info.orientation1, 14);

		info.orientation2 = ((data.getUint8(3) & 0x7f) << 7) | ((data.getUint8(4) & 0xfe) >> 1);
		info.orientation2 = parseInt(info.orientation2, 14);

		info.orientation3 = ((data.getUint8(4) & 0x01) << 13) | ((data.getUint8(5) & 0xff) << 5) | ((data.getUint8(6) & 0xf8) >> 3);
		info.orientation3 = parseInt(info.orientation3, 14);

		info.accel1 = ((data.getUint8(6) & 0x07) << 10) | ((data.getUint8(7) & 0xff) << 2) | ((data.getUint8(8) & 0xc0) >> 6);
		info.accel1 = parseInt(info.accel1, 13);

		info.accel2 = ((data.getUint8(8) & 0x3F) << 7) | ((data.getUint8(9) & 0xFE) >> 1);
		info.accel2 = parseInt(info.accel2, 13);

		info.accel3 = ((data.getUint8(9) & 0x01) << 12) | ((data.getUint8(10) & 0xFF) << 4) | ((data.getUint8(11) & 0xF0) >> 4);
		info.accel3 = parseInt(info.accel3, 13);

		info.gyro1 = ((data.getUint8(11) & 0x0F) << 9 | (data.getUint8(12) & 0xFF) << 1 | (data.getUint8(13) & 0x80) >> 7);
		info.gyro1 = parseInt(info.gyro1, 13);

		info.gyro2 = ((data.getUint8(13) & 0x7F) << 6 | (data.getUint8(14) & 0xFC) >> 2);
		info.gyro2 = parseInt(info.gyro2, 13);

		info.gyro3 = ((data.getUint8(14) & 0x03) << 11 | (data.getUint8(15) & 0xFF) << 3 | (data.getUint8(16) & 0xE0) >> 5);
		info.gyro3 = parseInt(info.gyro3, 13);

		info.touchpadX = ((data.getUint8(16) & 0x1F) << 3 | (data.getUint8(17) & 0xE0) >> 5)
		info.touchpadY = ((data.getUint8(17) & 0x1F) << 3 | (data.getUint8(18) & 0xE0) >> 5)

		info.keyState = (data.getUint8(18) & 0x1f) | (data.getUint8(19) & 0x80) >> 2;

		var f1 = getOrigentation(info.orientation1);
		var f2 = getOrigentation(info.orientation2);
		var f3 = getOrigentation(info.orientation3);
		var f4 = Math.sqrt(1.0 - f1 * f1 - f2 * f2 - f3 * f3);

		switch (info.idx) {
			case 0:
				state.xOri = f4;
				state.yOri = f1;
				state.zOri = f2;
				state.wOri = f3;
				break;
			case 1:
				state.xOri = f1;
				state.yOri = f4;
				state.zOri = f2;
				state.wOri = f3;
				break;
			case 2:
				state.xOri = f1;
				state.yOri = f2;
				state.zOri = f4;
				state.wOri = f3;
				break;
			case 3:
				state.xOri = f1;
				state.yOri = f2;
				state.zOri = f3;
				state.wOri = f4;
				break;
		}
		state.xAcc = getGravity(info.accel1);
		state.yAcc = getGravity(info.accel2);
		state.zAcc = getGravity(info.accel3);
		state.xGyro = getGyro(info.gyro1)
		state.yGyro = getGyro(info.gyro2)
		state.zGyro = getGyro(info.gyro3)

		if (info.touchpadX != 0 || info.touchpadY != 0) {
			state.isTouched = true;
		} else {
			state.isTouched = false;
		}

		state.xTouch = info.touchpadX / 255.0;
		state.yTouch = info.touchpadY / 255.0;

		state.isClickDown = (info.keyState & 0x1) > 0;
		state.isAppDown = (info.keyState & 0x4) > 0;
		state.isHomeDown = (info.keyState & 0x2) > 0;
		state.isVolPlusDown = (info.keyState & 0x10) > 0;
		state.isVolMinusDown = (info.keyState & 0x8) > 0;
		state.isClickBack = (info.keyState & 0x20) > 0;

		if (info.timestamp <= lastTimestamp)
			F = 512 + F;
		lastTimestamp = info.timestamp;
		state.timeStamp = 1000000.0 * (F + info.timestamp);

		onStateChangeCallback(state);

	}

	function onStateChangeCallback () { }

	//

	return {
		connect: connect,
		onStateChange: function (callback) {
			onStateChangeCallback = callback;
		}
	}

}
