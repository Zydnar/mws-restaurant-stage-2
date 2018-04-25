import Restaurant from './main';
import Review from "./restaurant_info";
import DBHelper from "./dbhelper";

(function () {
    const neighborhoodsSelect = document.getElementById('neighborhoods-select');
    const cuisinesSelect = document.getElementById('cuisines-select');
    /**
     * Parses current route
     * @return {RegExpMatchArray | null | string[]}
     */
    const routeChecker = () => {
        const patt = /([\w_.]+)/g;
        return location.pathname.match(patt) || ['/'];
    };
    /**
     *
     * @param {ServiceWorker} worker
     * @return {void}
     */
    const sw_update_ready = function (worker) {
        if (confirm('Update is ready. Refresh now?')) {
            worker.postMessage(
                {
                    action: 'skipWaiting'
                }
            );
        }
    };
    /**
     *
     * @param {ServiceWorker} worker
     */
    const track_installing = (worker) => {
        return worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
                return sw_update_ready(worker);
            }
        });
    };
    /**
     * Registration of ServiceWorker
     * @return {*}
     */
    const initSW = () => {
        if (navigator.serviceWorker) {
            navigator.serviceWorker.register('/sw.js').then((reg) => {
                if (!navigator.serviceWorker.controller) {
                    return;
                } else if (reg.installing) {
                    console.log('Service worker installing');
                    track_installing(reg.installing);
                } else if (reg.waiting) {
                    console.log('Service worker installed');
                } else if (reg.active) {
                    console.log(`Service worker active at scope: ${reg.scope}`);
                }
                return reg.addEventListener('updatefound', () => {
                    return track_installing(reg.installing);
                });
            }).catch(function (err) {
                return console.error('ServiceWorker registration failed with error: ' + err);
            });
        }

    };
    /**
     * Initialize Google map, called from HTML.
     * @param {Object} context
     * @param {String} type
     * @return {function}
     */
    const setInitMap = (context, type) => {
        switch (type) {
            case '/':
                return self.initMap = () => {
                    let loc = {
                        lat: 40.722216,
                        lng: -73.987501
                    };
                    context.setState(
                        {
                            map: new google.maps.Map(
                                document.getElementById('map'),
                                {
                                    zoom: 12,
                                    center: loc,
                                    scrollwheel: false
                                }
                            )
                        }
                    )
                };
            case 'review':
                return self.initMap = () => context.fetchRestaurantFromURL(
                    (error, restaurant) => {
                        if (error) { // Got an error!
                            console.error(error);
                        } else {
                            context.setState(
                                {
                                    map: new google.maps.Map(
                                        document.getElementById('map'),
                                        {
                                            zoom: 16,
                                            center: restaurant.latlng,
                                            scrollwheel: false
                                        }
                                    )
                                }
                            );
                            context.fillBreadcrumb();
                            DBHelper.mapMarkerForRestaurant(context.state.restaurant, context.state.map);
                        }
                    });
        }
    };


    switch (routeChecker()[0]) {
        case '/':
            const R = new Restaurant();
            window.R =R;
            setInitMap(R, '/');
            /**
             * Fetch neighborhoods and cuisines as soon as the page is loaded.
             */
            document.addEventListener('DOMContentLoaded', () => {
                R.fetchNeighborhoods();
                R.fetchCuisines();
            });

            cuisinesSelect.addEventListener('change', () => {
                R.updateRestaurants();
            });
            neighborhoodsSelect.addEventListener('change', () => {
                R.updateRestaurants();
            });
            break;
        case 'review':
            const Rv = new Review();
            window.Rv = Rv;
            setInitMap(Rv, 'review');
            break;
    }

    initSW(); //init service worker

}).call(this); //ensure application runs in right context
