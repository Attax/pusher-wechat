import { __extends } from "./helper";
import Dispatcher from "./dispatcher";

class Connection {
  constructor(options) {
    this.dispatcher = new Dispatcher();
    __extends(this, this.dispatcher);
    var properies = ["on", "off", "emit"];
    for (var i in properies) {
      this[properies[i]] = this.dispatcher[properies[i]];
    }
    this.options = options;
    //initialized connecting connected disconnected
    this.state = "initialized";
    this.doNotConnect = 0;
    this.reconnectInterval = 1;
    this.connection = null;
    this.reconnectTimer = 0;
    this.connect();
  }

  updateNetworkState(state) {
    var old_state = this.state;
    this.state = state;
    if (old_state !== state) {
      this.emit("state_change", { previous: old_state, current: state });
    }
  }

  connect() {
    this.doNotConnect = 0;
    if (
      this.networkState == "connecting" ||
      this.networkState == "established"
    ) {
      console.log(
        "networkState is " + this.networkState + " and do not need connect"
      );
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = 0;
    }

    this.closeAndClean();

    var options = this.options;
    var _this = this;
    _this.updateNetworkState("connecting");
    var cb = function () {
      uni.onSocketOpen(function (res) {
        _this.reconnectInterval = 1;
        if (_this.doNotConnect) {
          _this.updateNetworkState("closing");
          uni.closeSocket();
          return;
        }
        _this.updateNetworkState("established");
        if (options.onOpen) {
          options.onOpen(res);
        }
      });

      if (options.onMessage) {
        uni.onSocketMessage(options.onMessage);
      }

      uni.onSocketClose(function (res) {
        _this.updateNetworkState("disconnected");
        if (!_this.doNotConnect) {
          _this.waitReconnect();
        }
        if (options.onClose) {
          options.onClose(res);
        }
      });

      uni.onSocketError(function (res) {
        _this.close();
        if (!_this.doNotConnect) {
          _this.waitReconnect();
        }
        if (options.onError) {
          options.onError(res);
        }
      });
    };
    uni.connectSocket({
      url: options.url,
      fail: function (res) {
        console.log("uni.connectSocket fail");
        console.log(res);
        _this.updateNetworkState("disconnected");
        _this.waitReconnect();
      },
      success: function () {},
    });
    cb();
  }

  connect() {
    this.doNotConnect = 0;
    if (this.state === "connected") {
      console.log(
        'networkState is "' + this.state + '" and do not need connect'
      );
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = 0;
    }

    this.closeAndClean();

    var options = this.options;

    this.updateNetworkState("connecting");

    var _this = this;
    var cb = function () {
      uni.onSocketOpen(function (res) {
        _this.reconnectInterval = 1;
        if (_this.doNotConnect) {
          _this.updateNetworkState("disconnected");
          uni.closeSocket();
          return;
        }
        if (options.onOpen) {
          options.onOpen(res);
        }
      });

      if (options.onMessage) {
        uni.onSocketMessage(options.onMessage);
      }

      uni.onSocketClose(function (res) {
        _this.updateNetworkState("disconnected");
        if (!_this.doNotConnect) {
          _this.waitReconnect();
        }
        if (options.onClose) {
          options.onClose(res);
        }
      });

      uni.onSocketError(function (res) {
        _this.close();
        if (!_this.doNotConnect) {
          _this.waitReconnect();
        }
        if (options.onError) {
          options.onError(res);
        }
      });
    };
    uni.connectSocket({
      url: options.url + "/app/" + options.app_key,
      fail: function (res) {
        console.log("uni.connectSocket fail");
        console.log(res);
        _this.updateNetworkState("disconnected");
        _this.waitReconnect();
      },
      success: function () {},
    });
    cb();
  }

  closeAndClean() {
    if (this.state === "connected") {
      uni.closeSocket();
    }
    this.updateNetworkState("disconnected");
  }

  waitReconnect() {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }
    if (!this.doNotConnect) {
      this.updateNetworkState("connecting");
      var _this = this;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(function () {
        _this.connect();
      }, this.reconnectInterval);
      if (this.reconnectInterval < 1000) {
        this.reconnectInterval = 1000;
      } else {
        // 每次重连间隔增大一倍
        this.reconnectInterval = this.reconnectInterval * 2;
      }
      // 有网络的状态下，重连间隔最大2秒
      if (this.reconnectInterval > 2000) {
        uni.getNetworkType({
          success: function (res) {
            if (res.networkType != "none") {
              _this.reconnectInterval = 1000;
            }
          },
        });
      }
    }
  }

  send(data) {
    if (this.state !== "connected") {
      console.trace(
        'networkState is "' + this.state + '", can not send ' + data
      );
      return;
    }
    uni.sendSocketMessage({
      data: data,
    });
  }

  close() {
    this.updateNetworkState("disconnected");
    uni.closeSocket();
  }
}

export default Connection;
