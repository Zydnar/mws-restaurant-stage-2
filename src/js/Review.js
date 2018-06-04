import DBHelper from "./DBHelper";
import {createResponsiveImg} from './Restaurant';

class Review {
  state = {
    restaurant: null,
    map: null,
  };

  setState = (obj) => {
    return this.state = {
      ...this.state,
      ...obj,
    }
  };
  /**
   * Get current restaurant from page URL.
   * @param callback {function}
   */
  fetchRestaurantFromURL = (callback) => {
    if (this.state.restaurant) { // restaurant already fetched!
      callback(null, this.state.restaurant);
      return;
    }
    const id = this.getParameterByName();
    if (!id) { // no id found in URL
      const error = 'No restaurant id in URL';
      callback(error, null);
    } else {
      const DB = DBHelper.createIndexedDB(DBHelper.DATABASE_NAME);
      DBHelper.createIndexedStores(DB, {restaurants: 'id++,name,neighborhood,cuisine_type'});
      DBHelper.fetchRestaurantById(id, DB, (error, restaurant) => {
          this.state.restaurant = restaurant;
          DB[DBHelper.DATABASE_NAME].put(restaurant)
              .catch(console.error);
          if (!restaurant) {
              console.error(error);
              return;
        }
        this.fillRestaurantHTML();
        callback(null, restaurant)
      });
    }
  };

  /**
   * Create restaurant HTML and add it to the webpage
   * @param restaurant {Object}
   */
  fillRestaurantHTML = (restaurant = this.state.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');
    image.outerHTML = createResponsiveImg(DBHelper.imageUrlForRestaurant(restaurant), `Image of ${restaurant.name} restaurant`, './../..');
    const img = document.getElementsByClassName('restaurant-img')[1];
    img.id = 'restaurant-img';

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;
    // fill operating hours
    if (restaurant.operating_hours) {
      this.fillRestaurantHoursHTML();
    }
    // fill reviews
    this.fillReviewsHTML();
  };

  /**
   * Create restaurant operating hours HTML table and add it to the webpage.
   * @param operatingHours {Object}
   */
  fillRestaurantHoursHTML = (operatingHours = this.state.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
      const row = document.createElement('tr');

      const day = document.createElement('td');
      day.innerHTML = key;
      row.appendChild(day);

      const time = document.createElement('td');
      time.innerHTML = operatingHours[key];
      row.appendChild(time);

      hours.appendChild(row);
    }
  };

  /**
   * Create all reviews HTML and add them to the webpage.
   * @param reviews {array}
   */
  fillReviewsHTML = (reviews = this.state.restaurant.reviews) => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(this.createReviewHTML(review));
    });
    container.appendChild(ul);
  };

  /**
   * Create review HTML and add it to the webpage.
   * @param review {Object}
   */
  createReviewHTML = (review) => {
    const container = document.createElement('div');
    container.innerHTML = `<li><p>${review.name}</p>
<p>${review.date}</p>
<p class="review-rating">Rating: ${review.rating}</p>
<p>${review.comments}</p></li>`
      .replace(/>\s+</, '><');

    return container.firstChild;
  };

  /**
   * Add restaurant name to the breadcrumb navigation menu
   * @param restaurant {Object}
   */
  fillBreadcrumb = (restaurant = this.state.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = ` ${restaurant.name}`;
    breadcrumb.appendChild(li);
  };

  /**
   * Get a parameter by name from page URL.
   * @param url {String=}
   */
  getParameterByName = (url=window.location.pathname) => {
    const results = url.split('/');
    if (!results) {
      return null;
    }
    if (!results[2]) {
      return '';
    }
    return results[2];
  };

}

export default Review;
