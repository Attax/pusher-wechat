import Connection from './connection';
import Channel from './channel';

// 引入帮助函数
import {
    __ajax,
    formatParams,
    __extends,
    prefix,
} from './helper'


// PUSH实例的集合
instances = []


class Push {
    
  constructor(options) {
    this.doNotConnect = 0;
    // 设定兜底的默认值
    options = options || {};
    options.heartbeat = options.heartbeat || 25000;
    options.pingTimeout = options.pingTimeout || 10000;
    // 当前push实例的配置
    this.config = options;
    this.uid = 0;
    this.channels = {};
    this.connection = null;
    this.pingTimeoutTimer = 0;
    instances.push(this);
    this.createConnection();
  }


  checkoutPing() {
    var _this = this;
    // 清除定时器
    _this.checkoutPingTimer && clearTimeout(_this.checkoutPingTimer);

    // 开启定时器
    _this.checkoutPingTimer = setTimeout(function () {
        _this.checkoutPingTimer = 0;
        if (_this.connection.state === 'connected') {
            _this.connection.send('{"event":"pusher:ping","data":{}}');
            if (_this.pingTimeoutTimer) {
                clearTimeout(_this.pingTimeoutTimer);
                _this.pingTimeoutTimer = 0;
            }
            _this.pingTimeoutTimer = setTimeout(function () {
                _this.connection.closeAndClean();
                if (!_this.connection.doNotConnect) {
                    _this.connection.waitReconnect();
                }
            }, _this.config.pingTimeout);
        }
    }, this.config.heartbeat);
}

channel  (name) {
    return this.channels.find(name);
}

allChannels() {
    return this.channels.all();
}

// 创建连接
createConnection () {
    // 如果连接存在，抛出异常
    if (this.connection) {
        throw Error('Connection already exist');
    }
    var _this = this;
    var url = this.config.url;
    function updateSubscribed () {
        for (var i in _this.channels) {
            _this.channels[i].subscribed = false;
        }
    }

    // 创建连接
    this.connection = new Connection({
        url: url,
        app_key: this.config.app_key,
        onOpen: function () {
            _this.connection.state  = 'connecting';
            _this.checkoutPing();
        },
        onMessage: function(params) {
            if(_this.pingTimeoutTimer) {
                clearTimeout(_this.pingTimeoutTimer);
                _this.pingTimeoutTimer = 0;
            }

            params = JSON.parse(params.data);
            var event = params.event;
            var channel_name = params.channel;

            if (event === 'pusher:pong') {
                _this.checkoutPing();
                return;
            }
            if (event === 'pusher:error') {
                throw Error(params.data.message);
            }
            var data = JSON.parse(params.data), channel;
            if (event === 'pusher_internal:subscription_succeeded') {
                channel = _this.channels[channel_name];
                channel.subscribed = true;
                channel.processQueue();
                channel.emit('pusher:subscription_succeeded');
                return;
            }
            if (event === 'pusher:connection_established') {
                _this.connection.socket_id = data.socket_id;
                _this.connection.updateNetworkState('connected');
                _this.subscribeAll();
            }
            if (event.indexOf('pusher_internal') !== -1) {
                console.log("Event '"+event+"' not implement");
                return;
            }
            channel = _this.channels[channel_name];
            if (channel) {
                channel.emit(event, data);
            }
        },
        onClose: function () {
            updateSubscribed();
        },
        onError: function () {
            updateSubscribed();
        }
    });
}
// 断开连接
disconnect  () {
    this.connection.doNotConnect = 1;
    this.connection.close();
};

// 订阅全部频道
subscribeAll () {
    if (this.connection.state !== 'connected') {
        return;
    }
    for (var channel_name in this.channels) {
        //this.connection.send(JSON.stringify({event:"pusher:subscribe", data:{channel:channel_name}}));
        this.channels[channel_name].processSubscribe();
    }
}

// 取消订阅
unsubscribe  (channel_name) {
    if (this.channels[channel_name]) {
        delete this.channels[channel_name];
        if (this.connection.state === 'connected') {
            this.connection.send(JSON.stringify({event:"pusher:unsubscribe", data:{channel:channel_name}}));
        }
    }
}

// 取消全部订阅
unsubscribeAll() {
    var channels = Object.keys(this.channels);
    if (channels.length) {
        if (this.connection.state === 'connected') {
            for (var channel_name in this.channels) {
                this.unsubscribe(channel_name);
            }
        }
    }
    this.channels = {};
}

// 订阅平道
subscribe (channel_name) {
    // 如果频道已存在，直接返回
    if (this.channels[channel_name]) {
        return this.channels[channel_name];
    }
    // 如果频道是私有频道，创建私有频道
    if (channel_name.indexOf('private-') === 0) {
        return createPrivateChannel(channel_name, this);
    }

    if (channel_name.indexOf('presence-') === 0) {
        return createPresenceChannel(channel_name, this);
    }
    return createChannel(channel_name, this);
}

}

// 创建频道
function createChannel(channel_name, push) {
    var channel = new Channel(push.connection, channel_name);
    push.channels[channel_name] = channel;

    // 订阅频道的回调函数
    channel.subscribeCb = function () {
        push.connection.send(JSON.stringify({ event: "pusher:subscribe", data: { channel: channel_name } }));
    }
    channel.processSubscribe();
    return channel;
}


// 创建私有频道
function createPrivateChannel(channel_name, push) {
    var channel = new Channel(push.connection, channel_name);
    push.channels[channel_name] = channel;
    // 订阅频道的回调函数
    channel.subscribeCb = function () {
        // 发送ajax请求，进行频道认证
        __ajax({
            url: push.config.auth,
            type: 'POST',
            data: { channel_name: channel_name, socket_id: push.connection.socket_id },
            success: function (data) {
                data = JSON.parse(data);
                data.channel = channel_name;
                push.connection.send(JSON.stringify({ event: "pusher:subscribe", data: data }));
            },
            error: function (e) {
                throw Error(e);
            }
        });
    };
    channel.processSubscribe();
    return channel;
}

function createPresenceChannel(channel_name, push) {
    return createPrivateChannel(channel_name, push);
}


export default Push;