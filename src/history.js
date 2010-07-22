/**
 * @preserve By Filipe Fortes ( www.fortes.com )
 * MIT License
 */
/**
 * @fileoverview
 * Implements HTML5 window history functions for browsers that do not support it
 */

/** @define {boolean} */
var DEBUG = true;

if (DEBUG) {
  if (!window.console) {
    // Make sure we can log things during debug
    var console = {};
  }

  if (!console.log) {
    console.log = function () { };
  }

  if (!console.error) {
    console.error = console.log;
  }

  if (!console.info) {
    console.info = console.log;
  }
}

window.history_js = window.history_js || { hashInterval: 100 };

(function (history_js, window, location) {
  // Check if the browser already has a native implementation
  if ('pushState' in window.history) {
    if (DEBUG) {
      console.info('pushState: history.pushState already implemented, skipping');
    }

    // TODO: Must redirect if there's a hash, due to legacy

    // Native implementation present, we are done here
    return;
  }

  var IE8inIE7 = document.documentMode && document.documentMode <= 7,
      useLocalStorage = 'sessionStorage' in window && window.JSON && !IE8inIE7;

  // Storage API
  if (useLocalStorage) {
    if (DEBUG) {
      console.info('Using persistent storage');
      history_js.persist = true;
    }

    history_js.setStorage = function setStorage(name, value) {
      window.sessionStorage[name] = JSON.stringify(value);
    };

    history_js.getStorage = function getStorage(name) {
      return JSON.parse(window.sessionStorage[name]);
    }
  }
  else {
    if (DEBUG) {
      console.info('Using non-persistent storage');
      history_js.persist = false;
    }

    // TODO: Implement real persistence
    history_js.fake_storage = {};
    history_js.setStorage = function setStorage(name, value) {
      history_js.fake_storage[name] = value;
    };

    history_js.getStorage = function getStorage(name) {
      return history_js.fake_storage[name];
    }
  }

  /**
   * @private
   * @param {?Object} data
   * @param {?string} title
   * @param {!string} url
   * @param {boolean} replace
   */
  function changeState (data, title, url, replace) {
    // Store data using url
    history_js.setStorage(url, { state: data, title: title });

    // HTML5 implementation only calls popstate as a result of a user action,
    // store the hash so we don't trigger a false event
    history_js.hash = url;

    // Use the URL as a hash
    if (replace) {
      location.replace('#' + url);
    }
    else {
      // TODO: IE 6 & 7 need to use iFrame for back button support

      // Place the hash normally
      location.hash = '#' + url;
    }
  }

  /**
   * @param {?Object} data
   * @param {?string} title
   * @param {!string} url
   */
  window.history.pushState = function (data, title, url) {
    changeState(data, title, url, false);
  };

  /**
   * @param {?Object} data
   * @param {?string} title
   * @param {!string} url
   */
  window.history.replaceState = function (data, title, url) {
    changeState(data, title, url, true);
  };

  /**
   * @private
   * @return {string} Hash value, minus any leading '#'
   */
  history_js.normalized_hash = function () {
    return location.hash[0] === '#' ?  location.hash.substring(1) : location.hash;
  }

  /**
   * Receive the hashChanged event (native or manual) and fire the onpopstate
   * event
   * @private
   */
  history_js.hashchange = function() {
    var new_hash = history_js.normalized_hash(),
        data;

    // False alarm, ignore
    if (new_hash === history_js.hash) {
      return;
    }

    history_js.hash = new_hash;
    data = history_js.hash ? history_js.getStorage(history_js.hash) : {};

    if (DEBUG) {
      console.info('New hash: ', history_js.hash);
    }

    // Now, fire onpopstate with the state object
    if ('onpopstate' in window && typeof window.onpopstate === 'function') {
      window.onpopstate.apply(window, [{ 'state': data ? data.state : null }]);
    }
    else {
      if (DEBUG) {
        console.info('State changed, but no handler!');
      }
    }
  };

  // IE8 in IE7 mode defines onhashchange, but never fires it
  if ('onhashchange' in window && !IE8inIE7) {
    if (DEBUG) {
      console.info('Browser has native onHashChange');
    }

    window.onhashchange = history_js.hashchange;
  }
  else {
    // TODO:
    // IE6 & 7 don't create history items if the hash doesn't match an element's ID,
    // so we need to create an iframe which we'll use 

    if (DEBUG) {
      console.info('Using manualy hash change detection');
    }

    // Need to check hash state manually
    history_js.hashInterval = setInterval(function () {
      var hash = history_js.normalized_hash();
      if (hash !== history_js.hash) {
        history_js.hashchange();
      }
    }, history_js.hashInterval);
  }

  // Fire event manually right now, if we loaded with a hash
  if (history_js.normalized_hash()) {
    history_js.hashchange();
  }
}(window.history_js, window, document.location));
