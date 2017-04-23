var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

function wrapFunction(obj, name, wrapper, objName) {
    var oldFunction = obj[name];

    if (!oldFunction) {
        throw new Error('Function not found on object: ' + name + ' @ ' + obj);
    }

    var methodName = objName ? objName + '.' + name : name;

    obj[name] = InstrumentJS.instrumentFunction(methodName, function() {
        return wrapper.call(this, oldFunction, _.toArray(arguments));
    });

    obj[name].original = oldFunction.bind(obj);
}

/**
 * This wrapper wraps setTimeout, setInterval, process.nextTick, setImmediate, requestAnimationFrame
 * @param deferringFunction
 * @param args
 * @returns {*}
 */
function deferredWrapper(deferringFunction, args) {

    if (typeof args[0] !== 'function') {
        return deferringFunction.apply(this, args);
    }

    var oldCallback = args[0];
    var oldCallStack = [].concat(InstrumentJS._callStack);


    args[0] = function() {
        if (!InstrumentJS._enabled) {
            return oldCallback.apply(this, arguments);
        }

        //Save the current callstack to be able to restore it later
        var currentCallStack = [].concat(InstrumentJS._callStack);

        //Restore the callstack from when the deferred operation was initiated
        InstrumentJS._callStack = oldCallStack;

        try {
            //Call the callback now that the callstack is as it should be
            return oldCallback.apply(this, arguments);
        } finally {
            //Restore the original callstack
            InstrumentJS._callStack = currentCallStack;
        }
    };



    return deferringFunction.apply(this, args);
}

var InstrumentJS = new EventEmitter();

_.extend(InstrumentJS, {
    _enabled: false,
    _callStack: [],
    reset: function() {
        this._callStack = [];
        this.emit('reset');
    },
    enable: function() {
        this._enabled = true;
    },
    disable: function() {
        this._enabled = false;
    },
    _pushStack: function(meta) {
        this._callStack.push(meta);
    },
    _popStack: function() {
        this._callStack.pop();
    },
    getCallStack: function() {
        return this._callStack.map(function(meta) {
            return meta.name + '( "' + meta.args.join('", "') + '" )';
        });
    },
    instrumentObject: function(obj, objName) {
        return _.mapValues(obj, function(value, propertyId) {
                if (typeof value === 'function') {
                var functionName = objName ? objName + '.' + propertyId : propertyId;
                return InstrumentJS.instrumentFunction(functionName, value);
            }
            
            return value;
        });
    },
    instrumentMethod: function(obj, functionName, objectName) {
        var methodName = objectName ? objectName + '.' + functionName : functionName;

        obj[functionName] = InstrumentJS.instrumentFunction(methodName, obj[functionName]);
    },
    instrumentFunction: function(functionName, func) {
        return function() {
            if (!InstrumentJS._enabled) {
                //Quick exit
                return func.apply(this, arguments);
            }

            var args = _.toArray(arguments).map(function(arg) {
                if (typeof arg === 'function') {
                    return (arg.name ? arg.name : 'function' ) + '(){}';
                }

                return arg + '';
            });


            var meta = {
                name: functionName,
                args: args,
                start: Date.now(),
                error: null,
                end: null,
                timeTaken: null,
                stack: InstrumentJS.getCallStack()
            };

            InstrumentJS._pushStack(meta);
            InstrumentJS.emit('before-invocation',meta);

            try {
                return func.apply(this, arguments);
            } catch(e) {
                meta.error = e + '';
                throw e;
            } finally {
                meta.end = Date.now();
                meta.timeTaken = meta.end - meta.start;

                InstrumentJS.emit('after-invocation',meta);

                InstrumentJS._popStack();
            }
        };
    }
});

wrapFunction(global, 'setTimeout', deferredWrapper);
wrapFunction(global, 'setInterval', deferredWrapper);
wrapFunction(process, 'nextTick', deferredWrapper, 'process');

module.exports = InstrumentJS;