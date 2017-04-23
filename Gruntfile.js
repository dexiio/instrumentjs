module.exports = function(grunt) {

    process.on('uncaughtException',function(e) {
        grunt.log.error('Caught unhandled exception: ' + e.toString());
        grunt.log.error(e.stack);
    });

    grunt.initConfig({
        jshint: {
            all: ['Gruntfile.js', '*.js', 'test/**/*.js']
        },
        jasmine_nodejs: {
            tests: {
                specs: ['test/**/*Spec.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jasmine-nodejs');

    grunt.registerTask('default', [
        'jshint','jasmine_nodejs'
    ]);
};
