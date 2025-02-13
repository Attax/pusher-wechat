class Channel {
  constructor(connection, channel_name) {
    this.subscribed = false;
    this.dispatcher = new Dispatcher();
    this.connection = connection;
    this.channelName = channel_name;
    this.subscribeCb = null;
    this.queue = [];
    __extends(this, this.dispatcher);
    var properies = ["on", "off", "emit"];
    for (var i in properies) {
      this[properies[i]] = this.dispatcher[properies[i]];
    }
  }


  processSubscribe  () {
    if (this.connection.state !== "connected") {
      return;
    }
    this.subscribeCb();
  };
  
  processQueue  () {
    if (this.connection.state !== "connected" || !this.subscribed) {
      return;
    }
    for (var i in this.queue) {
      this.queue[i]();
    }
    this.queue = [];
  };
  
  trigger  (event, data) {
    if (event.indexOf("client-") !== 0) {
      throw new Error("Event '" + event + "' should start with 'client-'");
    }
    var _this = this;
    this.queue.push(function () {
      _this.connection.send(
        JSON.stringify({ event: event, data: data, channel: _this.channelName })
      );
    });
    this.processQueue();
  };

}


export default Channel;