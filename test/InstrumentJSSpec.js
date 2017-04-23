var InstrumentJS = require('../index');

describe('InstrumentJS', function() {

    var beforeInvocations = [],
        actualInvocations = 0,
        afterInvocation = [];

    InstrumentJS.addListener('before-invocation', function(meta) {
        beforeInvocations.push(meta);
    });

    InstrumentJS.addListener('after-invocation', function(meta) {
        afterInvocation.push(meta);
    });

    var noop = function() {
        actualInvocations++;
        return 'ABC';
    };

    beforeEach(function() {
        beforeInvocations = [];
        afterInvocation = [];
        actualInvocations = 0;
        InstrumentJS.reset();
        InstrumentJS.enable();
    });

    it('can instrument a function and emit when it is called', function() {
        var testFunction = InstrumentJS.instrumentFunction('testFunction', noop);

        testFunction('a','b','c');

        expect(beforeInvocations.length).toBe(1);
        expect(afterInvocation.length).toBe(1);
        expect(actualInvocations).toBe(1);

        expect(beforeInvocations[0].name).toBe('testFunction');
        expect(afterInvocation[0].name).toBe('testFunction');

        expect(beforeInvocations[0].args).toEqual(['a','b','c']);


    });

    it('can instrument an object method and emit when it is called', function() {
        var testObject = {
            doSomething: noop
        };

        InstrumentJS.instrumentMethod(testObject, 'doSomething', 'testObject');

        testObject.doSomething('a','b','c');

        expect(beforeInvocations.length).toBe(1);
        expect(afterInvocation.length).toBe(1);
        expect(actualInvocations).toBe(1);

        expect(beforeInvocations[0].name).toBe('testObject.doSomething');
        expect(afterInvocation[0].name).toBe('testObject.doSomething');

        expect(beforeInvocations[0].args).toEqual(['a','b','c']);

    });

    it('can instrument all methods of an object and emit when they are called', function() {

        var testObject = InstrumentJS.instrumentObject({
            doSomething: noop,
            doThis: noop
        }, 'testObject');

        testObject.doSomething('a','b','c');
        testObject.doThis(1, 2, 3);

        expect(beforeInvocations.length).toBe(2);
        expect(afterInvocation.length).toBe(2);
        expect(actualInvocations).toBe(2);

        expect(beforeInvocations[0].name).toBe('testObject.doSomething');
        expect(afterInvocation[0].name).toBe('testObject.doSomething');

        expect(beforeInvocations[1].name).toBe('testObject.doThis');
        expect(afterInvocation[1].name).toBe('testObject.doThis');

        expect(beforeInvocations[0].args).toEqual(['a','b','c']);
        expect(beforeInvocations[1].args).toEqual(['1', '2', '3']);
    });

    it('can instrument constructor and all methods  and emit when they are called', function() {

        var MyType = function(val) {
            this.test = val;
        };

        MyType.prototype.doSomething = function() {

        };

        MyType.prototype.doThis = function() {
            return this.test;
        };

        MyType = InstrumentJS.instrumentType(MyType, 'MyType');

        var myInstance = new MyType('A');

        expect(beforeInvocations.length).toBe(1);
        expect(afterInvocation.length).toBe(1);
        expect(beforeInvocations[0].name).toBe('MyType');
        expect(beforeInvocations[0].args).toEqual(['A']);

        myInstance.doSomething(1);
        expect(myInstance.doThis(2)).toBe('A');

        expect(beforeInvocations.length).toBe(3);
        expect(afterInvocation.length).toBe(3);

        expect(beforeInvocations[1].name).toBe('MyType.doSomething');
        expect(beforeInvocations[1].args).toEqual(['1']);

        expect(beforeInvocations[2].name).toBe('MyType.doThis');
        expect(beforeInvocations[2].args).toEqual(['2']);
    });

    it('does not record when disabled', function() {
        InstrumentJS.disable();

        var testFunction = InstrumentJS.instrumentFunction('testFunction', noop);

        testFunction('a','b','c');

        expect(beforeInvocations.length).toBe(0);
        expect(afterInvocation.length).toBe(0);
        expect(actualInvocations).toBe(1);

    });

    it('contains a stack trace for each method invocation', function() {
        var parentObject = InstrumentJS.instrumentObject({
            doSomething: function() {
                return childObject.doSomething('B');
            }
        }, 'parentObject');

        var childObject = InstrumentJS.instrumentObject({
            doSomething: noop
        }, 'childObject');

        parentObject.doSomething('A');

        expect(beforeInvocations.length).toBe(2);
        expect(afterInvocation.length).toBe(2);
        expect(actualInvocations).toBe(1);

        expect(beforeInvocations[0].name).toBe('parentObject.doSomething');
        expect(beforeInvocations[1].name).toBe('childObject.doSomething');

        //After invocations are in reverse order since the child will finish before the parent
        expect(afterInvocation[0].name).toBe('childObject.doSomething');
        expect(afterInvocation[1].name).toBe('parentObject.doSomething');

        expect(beforeInvocations[0].args).toEqual(['A']);
        expect(beforeInvocations[1].args).toEqual(['B']);

        expect(beforeInvocations[1].stack).toEqual([
            'parentObject.doSomething( "A" )'
        ]);

    });

    it('contains exceptions thrown in invocation', function() {
        var testFunction = InstrumentJS.instrumentFunction('testFunction', function() {
            actualInvocations++;
            throw new Error('THIS FAILED!');
        });

        var didThrow = false;
        try {
            testFunction('A','B');
        } catch(e) {
            didThrow = true;
        }

        expect(didThrow).toBe(true);

        expect(beforeInvocations.length).toBe(1);
        expect(afterInvocation.length).toBe(1);
        expect(actualInvocations).toBe(1);

        expect(beforeInvocations[0].name).toBe('testFunction');
        expect(afterInvocation[0].name).toBe('testFunction');

        expect(beforeInvocations[0].args).toEqual(['A','B']);
        expect(beforeInvocations[0].error).toEqual('Error: THIS FAILED!');
    });

    it('can get the current stack trace', function() {
        var testFunction = InstrumentJS.instrumentFunction('testFunction', function() {
            actualInvocations++;

            expect(InstrumentJS.getCallStack()).toEqual([
                'testFunction( "A" )'
            ]);

        });

        testFunction('A');

        expect(beforeInvocations.length).toBe(1);
        expect(afterInvocation.length).toBe(1);
        expect(actualInvocations).toBe(1);
    });

    describe('detects deferred operations and retains a proper stack trace', function() {

        it('for setTimeout', function(done) {

            var callbackFunction = InstrumentJS.instrumentFunction('callbackFunction', function() {
                actualInvocations++;

                expect(InstrumentJS.getCallStack()).toEqual([
                    'startFunction( "A" )',
                    'setTimeout( "function(){}", "10" )',
                    'callbackFunction( "" )'
                ]);

                done();
            });


            var startFunction = InstrumentJS.instrumentFunction('startFunction', function() {
                setTimeout(callbackFunction, 10);
            });

            startFunction('A');

        });

        it('for setInterval', function(done) {
            var interval;

            var callbackFunction = InstrumentJS.instrumentFunction('callbackFunction', function() {
                actualInvocations++;

                expect(InstrumentJS.getCallStack()).toEqual([
                    'startFunction( "A" )',
                    'setInterval( "function(){}", "10" )',
                    'callbackFunction( "" )'
                ]);

                done();

                clearInterval(interval);
            });




            var startFunction = InstrumentJS.instrumentFunction('startFunction', function() {
                interval = setInterval(callbackFunction, 10);
            });

            startFunction('A');

        });

        it('for process.nextTick', function(done) {

            var callbackFunction = InstrumentJS.instrumentFunction('callbackFunction', function() {
                actualInvocations++;

                expect(InstrumentJS.getCallStack()).toEqual([
                    'startFunction( "A" )',
                    'process.nextTick( "function(){}" )',
                    'callbackFunction( "" )'
                ]);

                done();
            });


            var startFunction = InstrumentJS.instrumentFunction('startFunction', function() {
                process.nextTick(callbackFunction);
            });

            startFunction('A');
        });

        it('for Q library', function(done) {
            var callbackFunction = InstrumentJS.instrumentFunction('callbackFunction', function() {
                actualInvocations++;

                expect(InstrumentJS.getCallStack()).toEqual([
                    'startFunction( "A" )',
                    'process.nextTick( "flush(){}" )',
                    'callbackFunction( "" )'
                ]);

                done();
            });


            var startFunction = InstrumentJS.instrumentFunction('startFunction', function() {
                require('q').fcall(callbackFunction);
            });

            startFunction('A');
        });

    });

});