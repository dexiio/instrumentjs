# instrumentjs
Simple NodeJS instrumentation framework

```Javascript
var InstrumentJS = require('instrumentjs');

//Instrument function
InstrumentJS.instrumentFunction('myFunction', function() {});


//Instrument specific method on object
var myObject = {
  myMethod: function() {}
};

InstrumentJS.instrumentMethod(myObject, 'myMethod', 'myObject');


//Instrument all functions on object
function MyType() {

}

MyType.prototype.myMethod = function() {};

InstrumentJS.instrumentObject(MyType.prototype, 'MyType');

```

Then just call the functions and methods like you would normally. 

Also supports retaining call stack when using setTimeout, setInterval and process.nextTick to properly trace how a certain piece of code was invoked.
