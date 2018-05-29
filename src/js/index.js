import Restaurant from './Restaurant';
import Review from "./restaurant_info";
import DBHelper from "./dbhelper";


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
 * Shows confirm message if new changed SW is ready
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
 * Checks if new sw is being installed
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
                );
                context.fetchNeighborhoods();
                context.fetchCuisines();
                google.maps.event.addListenerOnce(context.state.map, 'idle', function () {
                    setTimeout(function () {
                        const m = document.getElementById('maincontent');
                        const o = document.getElementById('overlay');
                        m.style.visibility = 'visible';
                        o.style.display = 'none';
                    }, 100);
                });
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

                    google.maps.event.addListenerOnce(context.state.map, 'tilesloaded', function () {
                        setTimeout(function () {
                            const m = document.getElementById('maincontent');
                            const o = document.getElementById('overlay');
                            m.style.visibility = 'visible';
                            o.style.display = 'none';
                        }, 100);
                    });
                });
    }
};

// App router
switch (routeChecker()[0]) {
    case '/':
        const R = new Restaurant();
        const toggleMapButton = document.getElementById('toggle-map');
        setInitMap(R, '/');

        cuisinesSelect.addEventListener('change', () => {
            R.updateRestaurants();
        });
        neighborhoodsSelect.addEventListener('change', () => {
            R.updateRestaurants();
        });
        toggleMapButton.addEventListener('click', () => {
            const map = document.getElementById('map');
            if (map.style.display === 'none') {
                map.style.display = 'block';
            } else {
                map.style.display = 'none';
            }
        });
        break;
    case 'review':
        const Rv = new Review();
        setInitMap(Rv, 'review');
        break;
}
//init service worker
initSW();
