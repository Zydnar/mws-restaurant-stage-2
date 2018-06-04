const Twig = require('twig');
const fs = require('fs');
const DB = JSON.parse(fs.readFileSync('./.tmp/localDiskDb.db', {encoding: 'utf-8'}));

/**
 * RestaurantsController
 *
 * @description :: Server-side logic for managing restaurants
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
    home: function (req, res, next) {
        Twig.renderFile('./views/home.html.twig',
            {
                assetsPrefix: './'
            }, function (err, html) {
                if (err) throw err;
                const nospace = html.replace(/>\s+</g, '><');
                return res.send(nospace);
            })
    },
    review: function (req, res, next) {
        Twig.renderFile(
            './views/restaurant.html.twig',
            {
                restaurant: DB.data.restaurants[req.params.restaurant].name + ' restaurant',
                assetsPrefix: './../../'
            }, function (err, html) {
                if (err) throw err;
                const nospace = html.replace(/>\s+</g, '><');
                return res.send(nospace);
            }
        )
    }
};

