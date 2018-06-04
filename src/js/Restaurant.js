import DBHelper from './DBHelper';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/filter';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/fromEvent';

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
    /**
     * @type {{HTML: [HTMLDivElement, String], visible: boolean}[]|[]}
     */
    thumbnails: [],
  };

  /**
   * Passes all window.scrollY when it's bottom of page, supports dynamically appended elements
   * @type {Observable<number>}
   */
  SCROLL_BOTTOM$ = Observable
    .fromEvent(window, 'scroll')
    .map(() => window.scrollY)
    .filter(yPos => yPos + window.innerHeight === Math.round(document.body.getBoundingClientRect().height));

  /**
   * Passes thumbnails from state if it's bottom of page and if there left some !visible
   * @type {Observable<object>}
   */
  THUMBNAILS_FOR_LOAD$ = this.SCROLL_BOTTOM$
    //stream only if thumbnails are populated and not empty
    .filter(()=>this.state.thumbnails.length>0)
    .mergeMap(pageY => {
      const thumbnails = this.state.thumbnails;
      const container = document.getElementById('restaurants-list');
      const containerDimensions = container.getBoundingClientRect();
      const thumbnailDimensions = thumbnails[0].HTML[0].getBoundingClientRect();
      const containerWidth = Math.round(containerDimensions.width);
      const containerHeight = Math.round(containerDimensions.height);
      const thumbnailWidth = Math.round(thumbnailDimensions.width);
      const thumbnailHeight = Math.round(thumbnailDimensions.height);
      const nRowsToAppend = Math.floor(containerHeight / thumbnailHeight);
      const nToAppend = Math.floor(containerWidth / thumbnailWidth) * (nRowsToAppend !== 0 ? nRowsToAppend : 1);

      return Observable.from(thumbnails.filter(obj => !obj.visible).slice(0, nToAppend));
    });

  /**
   * Adds thumbnails if THUMBNAILS_FOR_LOAD$ is streaming
   * @type {Subscription}
   */
  THUMBNAILS_SUBSCRIPTION = this.THUMBNAILS_FOR_LOAD$
    .subscribe(/** @param {{HTML: [HTMLDivElement, String], visible: boolean}} obj*/obj => {
      obj.HTML[0].innerHTML = obj.HTML[1] + obj.HTML[0].innerHTML;
      this.fillRestaurantsHTML(obj.HTML[0]);
      //not pure, but easier
      obj.visible = true;
    });

  /**
   * Sets state of Restaurant class
   * @param {Object} patch - Patch object
   * @return {Object} Update patch for state
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
          this.storeThumbnails(restaurant);
          this.addMarkersToMap(restaurant);
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
          this.storeThumbnails(r);
          this.addMarkersToMap(r);
        },
        (error) => console.error(error)
      );
  };

  /**
   * Clear current restaurants, their HTML and remove their map markers.
   * @return {void}
   */
  resetRestaurants = () => {
    /* empty array */
    this.state.thumbnails.length = 0;
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';
    // Remove all map markers
    this.state.markers = this.state.markers ? this.state.markers : [];
    this.state.markers.forEach(/**@param {google.maps.Marker} m */m => m.setMap(null));
  };

  /**
   * Stores thumbnails HTML to release if
   *
   * {{name: String, neighborhood: String, photograph: String, address: String, latlng: Number,
     * cuisine_type: String, operating_hours: String, reviews: Object}} restaurant - Restaurant Object
   */
  storeThumbnails = (restaurant) => {
    this.state.thumbnails.push({
      HTML: this.createRestaurantHTML(restaurant),
      visible: false,
    });
  };

  /**
   * Create all restaurants HTML and store them for lazy loading
   *
   * {HTMLDivElement} restaurantThumbnail - Restaurant thumbnail
   * @return {void}
   */
  fillRestaurantsHTML = (restaurantThumbnail) => {
    const ul = document.getElementById('restaurants-list');

    try {
      ul.append(restaurantThumbnail);
    } catch (e) {
      ul.innerHTML += restaurantThumbnail.outerHTML; // support for MS Edge
    }

  };

  /**
   * Generates responsive image HTML
   * @param url {string}
   * @param alt {string}
   * @param {string} prefix - relative prefix to images eg. ./..
   * @return {string}
   */
  static createResponsiveImg = (url, alt, prefix='.') => {
    const parsedURL = url.split('.');
    const urlWithoutExt = parsedURL[parsedURL.length - 1];
    return `<picture class="restaurant-img">
  <source media="(max-width: 719px)"
    srcset="${prefix+urlWithoutExt}-100-1x.jpg 1x, ${prefix+urlWithoutExt}-100-2x.jpg 2x, ${prefix+urlWithoutExt}-100-3x.jpg 3x">
  <source  media="(min-width: 720px)"
    srcset=".${url}.jpg 1x">
  <img class="restaurant-img" src="${prefix+urlWithoutExt}.jpg" alt="${alt}">
</picture>`;

  };

  /**
   * Create restaurant HTML.
   * @param restaurant {Object}
   * @return {[Node, String]}
   */
  createRestaurantHTML = (restaurant) => {
    const container = document.createElement('div');
    const randomId = 'n' + String(Math.random()).split('.')[1];
    container.innerHTML = `<li role="banner" aria-labelledby="${randomId}">
<div id="${randomId}">
<h2 role="heading">${restaurant.name}</h2>
<p>${restaurant.neighborhood}</p>
<p>${restaurant.address}</p>
</div>
<a role="link" href="${DBHelper.urlForRestaurant(restaurant)}">View Details</a></li>`
      .replace(/>\s+</, '><'); //just in case browser will render unwanted space

    //returning image as string, otherwise it would be fetched before it should be
    return [
      container.firstChild,
      Restaurant.createResponsiveImg(
          DBHelper.imageUrlForRestaurant(restaurant), `Image of ${restaurant.name} restaurant`
        )
    ];
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
