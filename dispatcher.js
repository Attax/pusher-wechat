class Dispatcher {
    constructor(failThrough) {
        this.callbacks = new CallbackRegistry();
        this.global_callbacks = [];
        this.failThrough = failThrough;
    }

   on  (eventName, callback, context) {
        this.callbacks.add(eventName, callback, context);
        return this;
    };
   on_global  (callback) {
        this.global_callbacks.push(callback);
        return this;
    };
   off  (eventName, callback, context) {
        this.callbacks.remove(eventName, callback, context);
        return this;
    };
   emit  (eventName, data) {
        var i;
        for (i = 0; i < this.global_callbacks.length; i++) {
            this.global_callbacks[i](eventName, data);
        }
        var callbacks = this.callbacks.get(eventName);
        if (callbacks && callbacks.length > 0) {
            for (i = 0; i < callbacks.length; i++) {
                callbacks[i].fn.call(callbacks[i].context || (window), data);
            }
        }
        else if (this.failThrough) {
            this.failThrough(eventName, data);
        }
        return this;
    };


}

export default Dispatcher