const SERVER_PORT = '8080';
const gulp = require('gulp');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const browserify = require("gulp-browserify");
const watch = require('gulp-watch');
const browserSync = require('browser-sync');
const compass = require('gulp-compass');
const csso =  require('gulp-csso');
const responsive = require('gulp-responsive-images');
const isProduction = process.env.NODE_ENV === 'production';
const noop = require('gulp-noop');
const sourcemaps = require('gulp-sourcemaps');

gulp.task('compass', function () {
    return gulp.src('./assets/scss/styles.scss')
        .pipe(
            compass(
                {
                    config_file: './config.rb',
                    sass: './assets/scss',
                    css: './assets/css'
                }
            )
        )
        .pipe(csso({sourceMap: !isProduction}))
        .pipe(gulp.dest('./assets/css'));
});
gulp.task('build', function () {
    return gulp.src('./src/js/index.js')
        .pipe(isProduction?sourcemaps.init():noop())
        .pipe(
            browserify(
                {
                    transform: ['babelify']
                }
            )
        )
        .pipe(uglify())
        .pipe(rename('main.js'))
        .pipe(isProduction?sourcemaps.write('./assets/js'):noop())
        .pipe(gulp.dest('./assets/js'));
});
gulp.task('js-watch', ['build'], browserSync.reload);
gulp.task('watch', function () {
    browserSync(
        {
            proxy: `localhost:${SERVER_PORT}`
        }
    );
    watch('assets/src/**', ['js-watch']);
});
gulp.task('responsive-images', function () {
    return gulp.src('./assets/img/*.jpg')
        .pipe(responsive({
                             '*.jpg': [{
                                 width: 266,
                                 suffix: '-100-1x',
                                 quality: 100
                             }, {
                                 width: 266 * 2,
                                 suffix: '-100-2x',
                                 quality: 10
                             }, {
                                 width: 266 * 3,
                                 suffix: '-100-3x',
                                 quality: 10
                             }]
                         }))
        .pipe(gulp.dest('./assets/img'));
});
