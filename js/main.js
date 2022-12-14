/*
Copyright 2016 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var idbApp = (function() {
  'use strict';

  // TODO 2 - check for support
  if (!('indexedDB' in window)) {
    console.log('This browser doesn\'t support IndexedDB');
    return;
  }

  // create db
  // idb.open takes a database name, version number, and optional callback function for performing database updates
  // object stores and indexes can only be created during database upgrades
  // they are created inside the upgrade callback function in idb.open
  // executes only if the version number (in this case it's 2) is greater than the existing version in the browser, or if the database doesn't exist
  var dbPromise = idb.open('couches-n-things', 4, function(upgradeDb) {
    // create the object stores
    switch (upgradeDb.oldVersion) {
      case 0:
        // a placeholder case so that the switch block will 
        // execute when the database is first created
        // (oldVersion is 0)
      case 1:
        console.log('Creating the products object store');
        upgradeDb.createObjectStore('products', {keyPath: 'id'});
  
      // TODO 4.1 - create 'name' index
      case 2:
        console.log('Creating a name index');
        var store = upgradeDb.transaction.objectStore('products');
        // create an index on the name property, allowing us to search and retrieve objects from the store by their name
        store.createIndex('name', 'name', {unique: true});
  
      // TODO 4.2 - create 'price' and 'description' indexes
      case 3:
        console.log('Creating a price and description index');
        var store = upgradeDb.transaction.objectStore('products');
        store.createIndex('price', 'price');
        store.createIndex('description', 'description');

      // TODO 5.1 - create an 'orders' object store
  
    }
  });

  function addProducts() {

    // TODO 3.3 - add objects to the products store
    dbPromise.then(function(db) {
      // All database operations must be carried out within a transaction
      // Specify the transaction mode as readwrite when making changes to the database
      var tx = db.transaction('products', 'readwrite');
      var store = tx.objectStore('products');
      var items = [
        {
          name: 'Couch',
          id: 'cch-blk-ma',
          price: 499.99,
          color: 'black',
          material: 'mahogany',
          description: 'A very comfy couch',
          quantity: 3
        },
        {
          name: 'Armchair',
          id: 'ac-gr-pin',
          price: 299.99,
          color: 'grey',
          material: 'pine',
          description: 'A plush recliner armchair',
          quantity: 7
        },
        {
          name: 'Stool',
          id: 'st-re-pin',
          price: 59.99,
          color: 'red',
          material: 'pine',
          description: 'A light, high-stool',
          quantity: 3
        },
        {
          name: 'Chair',
          id: 'ch-blu-pin',
          price: 49.99,
          color: 'blue',
          material: 'pine',
          description: 'A plain chair for the kitchen table',
          quantity: 1
        },
        {
          name: 'Dresser',
          id: 'dr-wht-ply',
          price: 399.99,
          color: 'white',
          material: 'plywood',
          description: 'A plain dresser with five drawers',
          quantity: 4
        },
        {
          name: 'Cabinet',
          id: 'ca-brn-ma',
          price: 799.99,
          color: 'brown',
          material: 'mahogany',
          description: 'An intricately-designed, antique cabinet',
          quantity: 11
        }
      ];
      // add each object to the store inside a Promise.all
      return Promise.all(items.map(function(item) {
          console.log('Adding item: ', item);
          return store.add(item);
        })
      ).catch(function(e) {
        tx.abort();
        console.log(e);
      }).then(function() {
        console.log('All items added successfully!');
      });
    });

  }

  function getByName(key) {

    // TODO 4.3 - use the get method to get an object by name
    // The Search button calls the displayByName function
    // which passes the user input string to the getByName function
    return dbPromise.then(function(db) {
      var tx = db.transaction('products', 'readonly');
      var store = tx.objectStore('products');
      var index = store.index('name');
      return index.get(key);
    });

  }

  function displayByName() {
    var key = document.getElementById('name').value;
    if (key === '') {return;}
    var s = '';
    getByName(key).then(function(object) {
      if (!object) {return;}

      s += '<h2>' + object.name + '</h2><p>';
      for (var field in object) {
        s += field + ' = ' + object[field] + '<br/>';
      }
      s += '</p>';

    }).then(function() {
      if (s === '') {s = '<p>No results.</p>';}
      document.getElementById('results').innerHTML = s;
    });
  }

  function getByPrice() {

    // TODO 4.4a - use a cursor to get objects by price
    var lower = document.getElementById('priceLower').value;
    var upper = document.getElementById('priceUpper').value;
    var lowerNum = Number(document.getElementById('priceLower').value);
    var upperNum = Number(document.getElementById('priceUpper').value);

    // determine which method to call on IDBKeyRange to limit the cursor
    if (lower === '' && upper === '') {return;}
    var range;
    if (lower !== '' && upper !== '') {
      range = IDBKeyRange.bound(lowerNum, upperNum);
    } else if (lower === '') {
      range = IDBKeyRange.upperBound(upperNum);
    } else {
      range = IDBKeyRange.lowerBound(lowerNum);
    }
    var s = '';
    // open the cursor on the price index 
    dbPromise.then(function(db) {
      var tx = db.transaction('products', 'readonly');
      var store = tx.objectStore('products');
      var index = store.index('price');
      return index.openCursor(range);
      // pass the cursor object to the showRange function
    }).then(function showRange(cursor) {
      // the cursor object is undefined and if (!cursor) {return;} breaks the loop
      if (!cursor) {return;}
      console.log('Cursored at:', cursor.value.name);
      // adds the current object to the html string
      s += '<h2>Price - ' + cursor.value.price + '</h2><p>';
      for (var field in cursor.value) {
        s += field + '=' + cursor.value[field] + '<br/>';
      }
      s += '</p>';
      // moves on to the next object with cursor.continue(), and calls itself, passing in the cursor object
      //showRange loops through each object in the object store until it reaches the end of the range
      return cursor.continue().then(showRange);
    }).then(function() {
      if (s === '') {s = '<p>No results.</p>';}
      document.getElementById('results').innerHTML = s;
    });

  }

  function getByDesc() {
    var key = document.getElementById('desc').value;
    if (key === '') {return;}
    // Creates a new key range containing a single value
    var range = IDBKeyRange.only(key);
    console.log(range);
    var s = '';
    dbPromise.then(function(db) {
      var tx = db.transaction('products', 'readonly');
      var store = tx.objectStore('products');
      var index = store.index('description');
      return index.openCursor(range);
    }).then(function showRange(cursor) {
      if (!cursor) {return;}
      console.log('Cursored at:', cursor.value.name);
      s += '<h2>Price - ' + cursor.value.price + '</h2><p>';
      for (var field in cursor.value) {
        s += field + '=' + cursor.value[field] + '<br/>';
      }
      s += '</p>';
      return cursor.continue().then(showRange);
    }).then(function() {
      if (s === '') {s = '<p>No results.</p>';}
      document.getElementById('results').innerHTML = s;
    });
  }

  function addOrders() {

    // TODO 5.2 - add items to the 'orders' object store

  }

  function showOrders() {
    var s = '';
    dbPromise.then(function(db) {

      // TODO 5.3 - use a cursor to display the orders on the page

    }).then(function() {
      if (s === '') {s = '<p>No results.</p>';}
      document.getElementById('orders').innerHTML = s;
    });
  }

  function getOrders() {

    // TODO 5.4 - get all objects from 'orders' object store

  }

  function fulfillOrders() {
    getOrders().then(function(orders) {
      return processOrders(orders);
    }).then(function(updatedProducts) {
      updateProductsStore(updatedProducts);
    });
  }

  function processOrders(orders) {

    // TODO 5.5 - get items in the 'products' store matching the orders

  }

  function decrementQuantity(product, order) {

    // TODO 5.6 - check the quantity of remaining products

  }

  function updateProductsStore(products) {
    dbPromise.then(function(db) {

      // TODO 5.7 - update the items in the 'products' object store

    }).then(function() {
      console.log('Orders processed successfully!');
      document.getElementById('receipt').innerHTML =
      '<h3>Order processed successfully!</h3>';
    });
  }

  return {
    dbPromise: (dbPromise),
    addProducts: (addProducts),
    getByName: (getByName),
    displayByName: (displayByName),
    getByPrice: (getByPrice),
    getByDesc: (getByDesc),
    addOrders: (addOrders),
    showOrders: (showOrders),
    getOrders: (getOrders),
    fulfillOrders: (fulfillOrders),
    processOrders: (processOrders),
    decrementQuantity: (decrementQuantity),
    updateProductsStore: (updateProductsStore)
  };
})();
