class CallbackRegistry {
    constructor() {
        this._callbacks = {};
    }

    get  (name) {
        return this._callbacks[prefix(name)];
    }
    add  (name, callback, context) {
        var prefixedEventName = prefix(name);
        this._callbacks[prefixedEventName] = this._callbacks[prefixedEventName] || [];
        this._callbacks[prefixedEventName].push({
            fn: callback,
            context: context
        });
    }
    remove  (name, callback, context) {
        if (!name && !callback && !context) {
            this._callbacks = {};
            return;
        }
        var names = name ? [prefix(name)] : Collections.keys(this._callbacks);
        if (callback || context) {
            this.removeCallback(names, callback, context);
        }
        else {
            this.removeAllCallbacks(names);
        }
    }
    removeCallback  (names, callback, context) {
        Collections.apply(names, function (name) {
            this._callbacks[name] = Collections.filter(this._callbacks[name] || [], function (oning) {
                return (callback && callback !== oning.fn) ||
                    (context && context !== oning.context);
            });
            if (this._callbacks[name].length === 0) {
                delete this._callbacks[name];
            }
        }, this);
    }
    removeAllCallbacks  (names) {
        Collections.apply(names, function (name) {
            delete this._callbacks[name];
        }, this);
    }

}

export default CallbackRegistry;