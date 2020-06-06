"use strict";
/**
 * ft-websocket的简单实现
 * 
 */
function futu() {
    var self = this;

    this.wsuri = "";
	this.pburl = "./pb/"; //proto文件web访问路径
	this.debug = true;
    this.ftWebsocketSection = 0; //包序列,递增的数字
    this.ftWebsocketHeadLength = 44; //响应包的头长度
    this.ftWebsocketHeadSign = "ft-v1.0"; //请求包起始串
	this.callback = {}; //回调函数
    this.ftCmdID = {
        1: 'InitWebSocket',
		1001:'GetGlobalState',
		1002:'GetGlobalState',
		1003:'Notify',
		1004:'KeepAlive',
		1005:'GetUserInfo',
		1007:'GetDelayStatistics',
		3001:'Qot_Sub',
		3002:'Qot_RegQotPush',
		3003:'Qot_GetSubInfo',
		3004:'Qot_GetBasicQot',
		3005:'Qot_UpdateBasicQot',
		3006:'Qot_GetKL',
		3007:'Qot_UpdateKL',
		3008:'Qot_GetRT',
		3009:'Qot_UpdateRT',
		3010:'Qot_GetTicker',
		3011:'Qot_UpdateTicker',
		3012:'Qot_GetOrderBook',
		3013:'Qot_UpdateOrderBook',
		3014:'Qot_GetBroker',
		3015:'Qot_UpdateBroker',
		3016:'Qot_GetOrderDetail',
		3017:'Qot_UpdateOrderDetail',
		3019:'Qot_UpdatePriceReminder',
		3100:'Qot_GetHistoryKL',
		3101:'Qot_GetHistoryKLPoints',
		3102:'Qot_GetRehab',
		3103:'Qot_RequestHistoryKL',
		3104:'Qot_RequestHistoryKLQuota',
		3105:'Qot_RequestRehab',
		3200:'Qot_GetTradeDate',
		3201:'Qot_GetSuspend',
		3202:'Qot_GetStaticInfo',
		3203:'Qot_GetSecuritySnapshot',
		3204:'Qot_GetPlateSet',
		3205:'Qot_GetPlateSecurity',
		3206:'Qot_GetReference',
		3207:'Qot_GetOwnerPlate',
		3208:'Qot_GetHoldingChangeList',
		3209:'Qot_GetOptionChain',
		3210:'Qot_GetWarrant',
		3211:'Qot_GetCapitalFlow',
		3212:'Qot_GetCapitalDistribution',
		3213:'Qot_GetUserSecurity',
		3214:'Qot_ModifyUserSecurity',
		3215:'Qot_StockFilter',
		3216:'Qot_GetCodeChange',
		3217:'Qot_GetIpoList',
		3218:'Qot_GetFutureInfo',
		3219:'Qot_RequestTradeDate',
		3220:'Qot_SetPriceReminder',
		3221:'Qot_GetPriceReminder',
		3222:'Qot_GetUserSecurityGroup',
		2001:'Trd_GetAccList',
		2005:'Trd_UnlockTrade',
		2008:'Trd_SubAccPush',
		2101:'Trd_GetFunds',
		2102:'Trd_GetPositionList',
		2111:'Trd_GetMaxTrdQtys',
		2201:'Trd_GetOrderList',
		2202:'Trd_PlaceOrder',
		2205:'Trd_ModifyOrder',
		2208:'Trd_UpdateOrder',
		2211:'Trd_GetOrderFillList',
		2218:'Trd_UpdateOrderFill',
		2221:'Trd_GetHistoryOrderList',
		2222:'Trd_GetHistoryOrderFillList'
    };

    /**
     * https://github.com/google/closure-library/blob/master/closure/goog/crypt/crypt.js
     */
    this.stringToUtf8ByteArray = function(str) {
        var out = [],
            p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            } else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            } else if (
                ((c & 0xFC00) == 0xD800) && (i + 1) < str.length &&
                ((str.charCodeAt(i + 1) & 0xFC00) == 0xDC00)) {
                c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            } else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };
    /**
     * https://github.com/google/closure-library/blob/master/closure/goog/crypt/crypt.js
     */
    this.utf8ByteArrayToString = function(bytes) {
        var out = [],
            pos = 0,
            c = 0;
        while (pos < bytes.length) {
            var c1 = bytes[pos++];
            if (c1 < 128) {
                out[c++] = String.fromCharCode(c1);
            } else if (c1 > 191 && c1 < 224) {
                var c2 = bytes[pos++];
                out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
            } else if (c1 > 239 && c1 < 365) {
                var c2 = bytes[pos++];
                var c3 = bytes[pos++];
                var c4 = bytes[pos++];
                var u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) -
                    0x10000;
                out[c++] = String.fromCharCode(0xD800 + (u >> 10));
                out[c++] = String.fromCharCode(0xDC00 + (u & 1023));
            } else {
                var c2 = bytes[pos++];
                var c3 = bytes[pos++];
                out[c++] =
                    String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
            }
        }
        return out.join('');
    };

    this.packBuff = function(cmd, section, buff) {
		if(! (buff instanceof Uint8Array)){
			return false;
		}
        var buffer = new ArrayBuffer(20+buff.byteLength);
        var view = new DataView(buffer);

        var bytes = self.stringToUtf8ByteArray(self.ftWebsocketHeadSign);
        for (var i in bytes) {
            view.setUint8(i, bytes[i]);
        }
        for (var i = parseInt(i) + 1; i <= 7; i++) {
            view.setUint8(i, 0);
        }

        view.setUint32(8, cmd, false);

        view.setBigUint64(12, BigInt(section), false); //BigInt有浏览器兼容性问题
		
		for(var i=0; i<buff.byteLength; i++){
			view.setUint8(20+i, buff[i]);
		}
		
        return buffer;
    };

    this.unpackBuff = function(buffer) {
        if (! (buffer instanceof ArrayBuffer)) {
            return {};
        }
		var result = {};
		
        var view = new DataView(buffer);

        result.sign = new Array();
        for (var i = 0; i <= 7; i++) {
            result.sign[i] = view.getUint8(i);
        }
        result.sign = self.utf8ByteArrayToString(result.sign).replace(/\0/g, '');

        result.cmd = view.getUint32(8, false);

        result.section = view.getBigUint64(12, false);
        result.section = Number(result.section)

        result.error = view.getUint32(20, false);

        result.errmsg = new Array();
        for (var i = 0; i <= 19; i++) {
            result.errmsg[i] = view.getUint8(i + 24);
        }
        result.errmsg = self.utf8ByteArrayToString(result.errmsg).replace(/\0/g, '');

        var buffer = new Uint8Array(buffer, self.ftWebsocketHeadLength);
        if (buffer.byteLength == 0) {
            return result;
        }
        var pb = self.ftCmdID[result.cmd];
		if(pb === undefined){
			return result;
		}
        protobuf.load(self.pburl + pb + ".proto", function(error, root) {
            if (error) {
				self.log(['protobuf.load', error]);
            }
            var AwesomeMessage = root.lookupType(pb + ".Response");

            result.ret = AwesomeMessage.decode(buffer);
			
			if(typeof(self.callback) == 'function'){
				self.callback(result);
			}
        });
    };
    /**
	 * @param String ip ft-websocket所在的ip或主机名
	 * @param int port 端口
	 * @param bool ssl 是否启用了SSL,如果是在https下,必须启用;配置FutuOpenD.xml中的(websocket_private_key+websocket_cert)与WEB服务器一致
	 * @param String websocketKey 对应FutuOpenD.xml中配置的websocketKey
	 */
    this.start = function(ip, port, ssl, websocketKey) {
        if (ssl) {
            this.wsuri = "wss://" + ip + ":" + port;
        } else {
            this.wsuri = "ws://" + ip + ":" + port;
        }

        self.websocket = new WebSocket(this.wsuri);
        self.websocket.binaryType = "arraybuffer";
        self.websocket.addEventListener('open', function(e) {
			var payload = {};
			payload.clientID = 'JavaScript';
			if(websocketKey && (websocketKey.length == 32)){
				payload.websocketKey = websocketKey;
			}
            self.send(1, payload);
        });
        self.websocket.addEventListener('message', function(e) {
            self.unpackBuff(e.data);
        });
        self.websocket.addEventListener('close', function(e) {
			self.log(["websocket", "close"]);
        });
        self.websocket.addEventListener('error', function(e) {
			self.log(["websocket", "error"]);
        });
    };
	/**
	 * @param int cmd 协议号,每个协议号对应一个proto文档
	 * @param Object payload proto中c2s的部分
	 * @return false/int 返回此次请求的序列号
	 */
    this.send = function(cmd, payload) {
        var pb = self.ftCmdID[cmd];
		if(pb === undefined){
			return false;
		}
		
		self.ftWebsocketSection++;
		
        protobuf.load(self.pburl + pb + ".proto", function(error, root) {
            if (error) {
				self.log(["protobuf.load", error]);
            }
            var AwesomeMessage = root.lookupType(pb + ".Request");
			
			payload = {'c2s':payload};
			
            var errMsg = AwesomeMessage.verify(payload);
            if (errMsg) {
				self.log(["protobuf.verify", errMsg]);
            }
            var message = AwesomeMessage.create(payload);
            var buffer = AwesomeMessage.encode(message).finish();

            var arrayBuff = self.packBuff(cmd, self.ftWebsocketSection, buffer);
			if(arrayBuff !== false){
				self.websocket.send(arrayBuff);
			}
        });
		
		return self.ftWebsocketSection;
    };
	this.log = function(o){
		if(this.debug){
			console.log(o);
		}
	};
}