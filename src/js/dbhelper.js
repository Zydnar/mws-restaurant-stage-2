import {Observable} from 'rxjs/Observable';
import {AjaxObservable} from 'rxjs/observable/dom/AjaxObservable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/distinct';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/fromPromise';
import Dexie from 'dexie';

/**
 * Common database helper functions.
 */
class DBHelper {

    /**
     * Database URL.
     * @description restaurants.json file location on your server.
     * @static
     * @return {String}
     */
    static get API_URL() {
        return '/restaurants/';
    }

    /**
     * Database Name.
     * @description Indexed database name
     * @static
     * @return {String}
     */
    static get DATABASE_NAME() {
        return 'restaurants';
    }

    /**
     * Returns current database number set by developer
     * @static
     * @return {number}
     */
    static get DATABASE_VERSION() {
        return 1;
    }

    /**
     * Returns indexedDB managed by Dexie
     * @param name
     * @static
     * @return {Dexie}
     */
    static createIndexedDB(name) {
        return new Dexie(name)
    }

    /**
     * Creates indexedDB table
     * @param {Dexie} DB Database
     * @param {Object} stores Stores and object
     * @static
     * @return {Dexie.Version<Number>} database
     */
    static createIndexedStores(DB, stores) {

        return DB.version(DBHelper.DATABASE_VERSION).stores(stores);
    }

    /**
     * Deletes an indexed database
     * @param {Dexie} DB
     * @static
     * @return {Promise<void>}
     */
    static deleteIndexedDB(DB) {
        return DB.delete();
    }

    /**
     * Executes indexedDB settings and if set, Dexie.on watcher
     * @param {Dexie} DB
     * @static
     * @return {Promise<Dexie>}
     */
    static initIndexedDB(DB) {
        return DB.open();
    }

    /**
     * Registers listener for an indexedDB event
     * @param {Dexie} DB
     * @param {String} type
     * @param {Function} fn
     * @static
     * @return {void}
     */
    static addIDBEventListener(DB, type, fn) {
        DB.on(type, fn);
    }

    /**
     * Executes function if indexedDB is not empty
     * @param {Dexie} DB
     * @static
     * @param {String} storeName
     */
    static ifIndexedDBEmpty(DB, storeName) {
        return new Promise((resolve, reject) => {
                               DBHelper.addIDBEventListener(DB, 'ready', () => DB[storeName].count((count) => {
                                                                if (count === 0) {
                                                                    return resolve();
                                                                } else {
                                                                    return reject('DB not empty');
                                                                }
                                                            })
                               )
                           }
        );
    }

    /**
     * Executes an callback when having access to indexed table records
     * @param {Dexie} DB
     * @param {Function} callback
     * @static
     * @return {Dexie.Promise}
     */
    static indexedTableOpen(DB, callback) {
        return DB.transaction('rw', DBHelper.DATABASE_NAME, () => {
            return callback();
        })
    }

    /**
     * Fetch all restaurants.
     * @static
     * @return {Observable}
     */
    static fetchRestaurants() {
        return AjaxObservable.create
                             .getJSON(DBHelper.API_URL)
                             .mergeMap(x => Observable.from(x))
    }

    /**
     *
     * @param {Dexie} DB
     * @param {Array} query arguments for indexedDB query id/
     * @return {Promise<any>}
     */
    static entryExists(DB, query) {
        return new Promise((resolve, reject) => {
            DB.transaction('rw', DBHelper.DATABASE_NAME, () => {
                DB[DBHelper.DATABASE_NAME]
                    .get(...query)
                    .then((result) => resolve(result))
                    .catch((err) => {reject(err)})
            })
        })
    }

    /**
     * Checks if API have changed
     * @return {Promise<void>}
     */
    static needsUpdate() {
        return new Promise((resolve, reject) => {
            let http = new XMLHttpRequest();
            http.open('HEAD', url);
            http.onreadystatechange = function () {
                if (this.readyState === this.DONE) {
                    (this.status !== 304 && this.status !== 404) && resolve();
                } else {
                    reject();
                }
            };
            http.send();
        })
    }

    /**
     * Fetch a restaurant by its ID.
     * @param {Number} id
     * @param {Function} callback
     * @static
     * @return {Subscription}
     */
    static fetchRestaurantById(id, callback) {
        return AjaxObservable.create

                             .getJSON(`${DBHelper.API_URL}${id}`)

                             .subscribe((restaurants) => {
                                 callback(null, restaurants)
                             }, (error) => {
                                 callback(`Got error ${error} fetching restaurant ID: {${id}} from remote`, null);
                             });
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     * @param {Observable} restaurants$
     * @param {String} cuisine
     * @param {Function} callback
     * @static
     * @return {Subscription}
     */
    static fetchRestaurantByCuisine(restaurants$, cuisine, callback) {
        return restaurants$
            .filter(r => r.cuisine_type === cuisine)
            .subscribe(
                (c) => callback(null, c),
                (error) => callback(error, null)
            );
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     * @param {Observable} restaurants$
     * @param {String} neighborhood
     * @param {Function} callback
     * @static
     * @return {Subscription}
     */
    static fetchRestaurantByNeighborhood(restaurants$, neighborhood, callback) {
        return restaurants$
            .filter(r => r.neighborhood === neighborhood)
            .subscribe(
                (n) => callback(null, n),
                (error) => callback(error, null)
            );
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     * @param {Observable} restaurants$
     * @param {String} cuisine
     * @param {String} neighborhood
     * @static
     * @return {Observable}
     */
    static fetchRestaurantByCuisineAndNeighborhood(restaurants$, cuisine, neighborhood) {
        return restaurants$
            .filter((r) => {return (cuisine !== 'all' && r.cuisine_type === cuisine || cuisine === 'all')
                && (neighborhood !== 'all' && r.neighborhood === neighborhood || neighborhood === 'all')}
            );
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     * @param {Observable} restaurants$
     * @static
     * @return {Observable<*>}
     */
    static fetchNeighborhoods(restaurants$) {
        return restaurants$
            .map(r => r.neighborhood)
            .distinct()
    }

    /**
     * Fetch all cuisines with proper error handling.
     * @param {Observable} restaurants$
     * @static
     * @return {Subscription}
     */
    static fetchCuisines(restaurants$) {
        return restaurants$
            .map(r => r.cuisine_type)
            .distinct()
    }

    /**
     * Restaurant page URL.
     * @param {Object} restaurant
     * @static
     * @return {String}
     */
    static urlForRestaurant = (restaurant) => (`./review/${restaurant.id}`);

    /**
     * Restaurant image URL.
     * @param {Object} restaurant
     * @static
     * @return {String}
     */
    static imageUrlForRestaurant = (restaurant) => (`/img/${restaurant.photograph}`);

    /**
     * Map marker for a restaurant.
     * @param {Object} restaurant
     * @param {google.maps.Map} map
     * @static
     * @return {google.maps.Marker}
     */
    static mapMarkerForRestaurant(restaurant, map) {
        return new google.maps.Marker(
            {
                position: restaurant.latlng,
                title: restaurant.name,
                url: DBHelper.urlForRestaurant(restaurant),
                map: map,
                animation: google.maps.Animation.DROP
            }
        );
    }

}

export default DBHelper;
