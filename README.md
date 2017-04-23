# instrumentjs
Simple NodeJS instrumentation framework

```Javascript
var InstrumentJS = require('instrumentjs');

//Listen for invocations: 
InstrumentJS.addListener('before-invocation', function(meta) {
  //meta.name: function name
  //meta.args: function arguments - toStringed
  //meta.start: start time
  //meta.stack: call stack
});

InstrumentJS.addListener('after-invocation', function(meta) {
  //meta.name: function name
  //meta.args: function arguments - toStringed
  //meta.start: start time
  //meta.end: end time
  //meta.timeTaken: total time for method to run
  //meta.stack: call stack
  //meta.error: toStringed exception if method threw an exception.
});

//Instrument function
var myFunction = InstrumentJS.instrumentFunction('myFunction', function() {});
myFunction();


//Instrument specific method on object
var myObject = {
  myMethod: function() {}
};

InstrumentJS.instrumentMethod(myObject, 'myMethod', 'myObject');

myObject.myMethod();

//Instrument all functions on object
function MyType() {

}

MyType.prototype.myMethod = function() {};

InstrumentJS.instrumentObject(MyType.prototype, 'MyType');

var instance = new MyType();
instance.myMethod();

```

Then just call the functions and methods like you would normally. 

Also supports retaining call stack when using setTimeout, setInterval and process.nextTick to properly trace how a certain piece of code was called.
