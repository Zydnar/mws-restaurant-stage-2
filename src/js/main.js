import DBHelper from './dbhelper';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';

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
        inexedDB: false,
    };
    setState = (obj) => {
        return this.state = {
            ...this.state,
            ...obj,
        }
    };
    /**
     * Fetch all neighborhoods and set their HTML.
     * @return {Subscription}
     */
    fetchNeighborhoods = () => {
        this.state.neighborhoods = [];
        const fetchN = (r)=> DBHelper.fetchNeighborhoods(r,
                                                         (error, neighborhoods) => {
                                                             if (error) { // Got an error
                                                                 console.error(error);
                                                             } else {
                                                                 this.state.neighborhoods.push(neighborhoods);
                                                                 this.fillNeighborhoodsHTML();
                                                             }
                                                         }
        );
        if (this.state.restaurants && this.state.restaurants.length !== 0) {
            console.log('foo');
            fetchN(this.state.restaurants);
        } else {
            console.log('bar');
            this.setRestaurants().then(()=>fetchN(this.state.restaurants))
        }
    };

    /**
     * Set neighborhoods HTML.
     * @return {void}
     */
    fillNeighborhoodsHTML = () => {
        const select = document.getElementById('neighborhoods-select');
        this.state.neighborhoods
            .map(neighborhood => {
                const option = document.createElement('option');
                option.innerHTML = neighborhood;
                option.value = neighborhood;
                try {
                    select.append(option)
                } catch (e) {
                    select.innerHTML += option.outerHTML;
                }
            });
    };

    /**
     * Fetch all cuisines and set their HTML.
     * @return {void}
     */
    fetchCuisines = () => {
        this.state.cuisines = [];
        DBHelper.fetchCuisines(this.state.restaurants, (error, cuisines) => {
            if (error) { // Got an error!
                console.error(error);
            } else {
                this.state.cuisines.push(cuisines);
                this.fillCuisinesHTML();
            }
        });
    };

    /**
     * Set cuisines HTML.
     * @return {void}
     */
    fillCuisinesHTML = () => {
        const select = document.getElementById('cuisines-select');

        this.state.cuisines
            .map(cuisine => {
                const option = document.createElement('option');
                option.innerHTML = cuisine;
                option.value = cuisine;
                try {
                    select.append(option)
                } catch (e) {
                    select.innerHTML += option.outerHTML;
                }
            });
    };
    /**
     * When fetched or update restaurants
     * @return {Promise}
     */
    setRestaurants = () => {
        this.state.restaurants = new Subject();
        const DB = DBHelper.createIndexedDB(DBHelper.DATABASE_NAME);
        DBHelper.createIndexedStores(DB, {restaurants: 'id++,name,neighborhood,cuisine_type'});

        return DBHelper.initIndexedDB(DB).then(() => {
                return DBHelper.fetchRestaurants()
                               .subscribe(
                                   (restaurant) => {
                                       this.resetRestaurants(restaurant);
                                       this.fillRestaurantsHTML(restaurant);
                                       this.state.restaurants.next(restaurant);
                                       DB[DBHelper.DATABASE_NAME].put(restaurant)
                                                                 .then(()=>{this.state.inexedDB=true})
                                                                 .catch(console.log);
                                   },
                                   (error) => console.log(error)
                               );
        });

    };

    /**
     * Update page and map for current restaurants.
     * @return {void}
     */
    updateRestaurants = () => {
        const cSelect = document.getElementById('cuisines-select');
        const nSelect = document.getElementById('neighborhoods-select');
        const restaurants$ = this.state.restaurants;
        console.log(restaurants$, this.state);

        const cIndex = cSelect.selectedIndex;
        const nIndex = nSelect.selectedIndex;

        const cuisine = cSelect[cIndex].value;
        const neighborhood = nSelect[nIndex].value;

        // Remove all restaurants
        const ul = document.getElementById('restaurants-list');
        ul.innerHTML = '';
        DBHelper.fetchRestaurantByCuisineAndNeighborhood(restaurants$, cuisine, neighborhood)
                .subscribe(
                    (r) => {
                        this.resetRestaurants(r);
                        this.fillRestaurantsHTML(r);
                    },
                    (error) => console.log(error)
                );
    };

    /**
     * Clear current restaurants, their HTML and remove their map markers.
     * @param restaurants {Object}
     * @return {void}
     */
    resetRestaurants = (restaurants) => {

        // Remove all map markers
        this.state.markers = this.state.markers ? this.state.markers : [];
        this.state.markers.forEach(m => m.setMap(null));
        //this.state.restaurants = restaurants;
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

        this.addMarkersToMap();
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
     * @return {Function}
     */
    addMarkersToMap = () => this.state.restaurants
                                      .subscribe(restaurant => {
                                          // Add marker to the map
                                          const marker = DBHelper.mapMarkerForRestaurant(restaurant, this.state.map);
                                          google.maps.event.addListener(marker, 'click', () => {
                                              window.location.href = marker.url
                                          });
                                          this.state.markers.push(marker);
                                      });

}

export default Restaurant;
export const createResponsiveImg = Restaurant.createResponsiveImg;
