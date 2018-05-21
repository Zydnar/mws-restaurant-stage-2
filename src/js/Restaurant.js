import DBHelper from './dbhelper';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import 'rxjs/add/operator/map';

/**
 * @class Restaurant
 */
class Restaurant {

    state = {
        restaurants: null,
        neighborhoods: [],
        cuisines: [],
        map: null,
        markers: [],
        indexedDB: null,
        images: [],
    };
    /**
     * Sets state of Restaurant class
     * @param {Object} patch - Patch object
     * @return {Object} Patched state
     */
    setState = (patch) => {
        return this.state = {
            ...this.state,
            ...patch,
        }
    };

    /**
     * Fetch all neighborhoods and set their HTML.
     * @return {Subscription}
     */
    fetchNeighborhoods = () => {
        const fetchN = (r) => {
            this.state.neighborhoods = [];
            return DBHelper
                .fetchNeighborhoods(r)
                .subscribe(
                    (neighborhoods) => {
                        this.state.neighborhoods.push(neighborhoods);
                        this.fillNeighborhoodsHTML(neighborhoods);
                    },
                    (error) => console.error(error)
                );
        };

        if (this.state.restaurants && this.state.restaurants.length !== 0) {
            fetchN(this.state.restaurants);
        } else {
            fetchN(this.setRestaurants());
        }
    };

    /**
     * Set neighborhoods HTML.
     * @param {String} neighborhood
     * @return {HTMLOptionElement}
     */
    fillNeighborhoodsHTML = (neighborhood) => {
        const select = document.getElementById('neighborhoods-select');

        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        try {
            select.append(option)
        } catch (e) {
            select.innerHTML += option.outerHTML;
        }
        return option;
    };

    /**
     * Fetch all cuisines and set their HTML.
     * @return {void}
     */
    fetchCuisines = () => {
        this.state.cuisines = [];
        DBHelper.fetchCuisines(this.state.restaurants)
            .subscribe(
                (cuisine) => {
                    this.state.cuisines.push(cuisine);
                    this.fillCuisinesHTML(cuisine);
                },
                (error) => console.error(error)
            );
    };

    /**
     * Set cuisines HTML.
     * @param {String} cuisine
     * @return {HTMLOptionElement}
     */
    fillCuisinesHTML = (cuisine) => {
        const select = document.getElementById('cuisines-select');

        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        try {
            select.append(option)
        } catch (e) {
            select.innerHTML += option.outerHTML;
        }
        return option;
    };

    /**
     * When fetched or update restaurants this sets state.restaurants to collection of restaurants
     * @return {Observable}
     */
    setRestaurants = () => {
        this.state.restaurants = new Subject();
        const DB = DBHelper.createIndexedDB(DBHelper.DATABASE_NAME);
        DBHelper.createIndexedStores(DB, {restaurants: 'id++,name,neighborhood,cuisine_type'});
        this.resetRestaurants();
        this.setState({indexedDB: DB});
        return DBHelper.fetchRestaurants(DB)
            .map(
                (restaurant) => {
                    this.fillRestaurantsHTML(restaurant);
                    this.state.restaurants.next(restaurant);
                    DB[DBHelper.DATABASE_NAME].put(restaurant)
                        .catch(console.error);
                    return restaurant;
                },
                (error) => console.error(error)
            );

    };

    /**
     * Update page and map for current restaurants.
     * @return {void}
     */
    updateRestaurants = () => {
        const cSelect = document.getElementById('cuisines-select');
        const nSelect = document.getElementById('neighborhoods-select');

        const cIndex = cSelect.selectedIndex;
        const nIndex = nSelect.selectedIndex;

        const cuisine = cSelect[cIndex].value;
        const neighborhood = nSelect[nIndex].value;
        const DB = this.state.indexedDB;
        // Remove all restaurants
        this.resetRestaurants();
        DBHelper
            .fetchRestaurantByCuisineAndNeighborhood(DBHelper.fetchRestaurants(DB), cuisine, neighborhood)
            .subscribe(
                (r) => {
                    this.fillRestaurantsHTML(r);
                },
                (error) => console.error(error)
            );
    };

    /**
     * Clear current restaurants, their HTML and remove their map markers.
     * @return {void}
     */
    resetRestaurants = () => {
        const ul = document.getElementById('restaurants-list');
        ul.innerHTML = '';
        // Remove all map markers
        this.state.markers = this.state.markers ? this.state.markers : [];
        this.state.markers.forEach(m => m.setMap(null));
    };

    /**
     * Create all restaurants HTML and add them to the webpage.
     * @return {void}
     */
    fillRestaurantsHTML = (restaurant) => {
        const ul = document.getElementById('restaurants-list');

        try {
            ul.append(this.createRestaurantHTML(restaurant));
        } catch (e) {
            ul.innerHTML += this.createRestaurantHTML(restaurant).outerHTML; // support for MS Edge
        }

        this.addMarkersToMap(restaurant);
    };

    /**
     * Generates responsive image HTML
     * @param url {string}
     * @param alt {string}
     * @return {string}
     */
    static createResponsiveImg = (url, alt) => {
        const parsedURL = url.split('.');
        const urlWithoutExt = parsedURL[parsedURL.length - 1];
        return `<picture class="restaurant-img">
  <source media="(max-width: 719px)"
    srcset=".${urlWithoutExt}-100-1x.jpg 1x, .${urlWithoutExt}-100-2x.jpg 2x, .${urlWithoutExt}-100-3x.jpg 3x">
  <source  media="(min-width: 720px)"
    srcset=".${url}.jpg 1x">
  <img class="restaurant-img" src=".${url}.jpg" alt="${alt}">
</picture>`;

    };

    /**
     * Create restaurant HTML.
     * @param restaurant {Object}
     * @return {Node}
     */
    createRestaurantHTML = (restaurant) => {
        const container = document.createElement('div');
        const randomId = 'n' + String(Math.random()).split('.')[1];
        container.innerHTML = `<li role="banner" aria-labelledby="${randomId}">
<div id="${randomId}">
${Restaurant.createResponsiveImg(DBHelper.imageUrlForRestaurant(restaurant), `Image of ${restaurant.name} restaurant`)}
<h2 role="heading">${restaurant.name}</h2>
<p>${restaurant.neighborhood}</p>
<p>${restaurant.address}</p>
</div>
<a role="link" href="${DBHelper.urlForRestaurant(restaurant)}">View Details</a></li>`
            .replace(/>\s+</, '><'); //just in case browser will render unwanted space
        return container.firstChild;
    };

    /**
     * Add markers for current restaurants to the map.
     * @param {Object} restaurant
     * @return {Function}
     */
    addMarkersToMap = (restaurant) => {
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, this.state.map);
        google.maps.event.addListener(marker, 'click', () => {
            window.location.href = marker.url
        });
        this.state.markers.push(marker);
    };

}

export default Restaurant;
export const createResponsiveImg = Restaurant.createResponsiveImg;
