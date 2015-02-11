(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function (Http, $http) {
  Http.prototype._request = function (options, callback) {
    options.data = options.data || options.form;
    
    // Add any special xhr fields
    angular.extend(options, this.options.context.options.api._xhr);
    
    $http(options)
      .success(function (data) {
        var body = data.self || data;
        callback(null, body, body);
      }).error(function (err) {
        callback(err);
      });
  };
};
},{}],2:[function(require,module,exports){
module.exports = function (Http, $rootScope, $q) {
  Http.prototype._promiseWrap = function (callback) {
    var d = $q.defer();
    
    callback(function (data) {
      $rootScope.narratorApply(function () {
        d.resolve(data);
      });
    }, function (err) {
      $rootScope.narratorApply(function () {
        d.reject(err);
      });
    });
    
    return d.promise;
  };
};
},{}],3:[function(require,module,exports){
angular.module('narrator', [])
  .provider('narrator', function () {
    
    var Narrator = require('../narrator');
    var Http = require('../http');
    var asQ = require('./asQ');
    var asHttp = require('./asHttp');
    
    return {
      _options: {},
      
      configure: function (options) {
        this._options = options;
      },
      
      $get: function ($rootScope, $q, $http) {
        $rootScope.narratorApply = function(fn) {
          var phase = this.$root.$$phase;
          if(phase == '$apply' || phase == '$digest') {
            if(fn && (typeof(fn) === 'function')) {
              fn();
            }
          } else {
            this.$apply(fn);
          }
        };
        
        asQ(Http, $rootScope, $q);
        asHttp(Http, $http);
        return new Narrator(this._options);
      }
    };
  });
},{"../http":7,"../narrator":8,"./asHttp":1,"./asQ":2}],4:[function(require,module,exports){
var defaults = require('./helpers/defaults');
var extend = require('extend');
var urljoin = require('url-join');
var Http = require('./http');

var Endpoint = module.exports = function (options) {
  this.hooks = {
    pre: function (next) { next(); }
  };
  
  this.options = {
    host: '',
    path: '',
    headers: {},
    _endpoints: {}
  };
  
  if(!options) {
    options = {};
  }
  
  if (!options.userDefined) {
    options.userDefined = {};
  }
  
  defaults(options.userDefined.hooks, this.hooks);
  extend(this.options, options);
  extend(this, options.userDefined);
  
  this.http = new Http({
    context: this,
    headers: this.options.headers,
    hooks: this.hooks
  });
};

// Placed here because of circular dependency stuff
var Entity = require('./entity');

// TODO: make this endpoint work too
// Placed here because of circular dependency stuff
// var Narrator = require('./narrator');

// Endpoint.prototype.endpoint = function (path, customMethods) {
//     var api = new Narrator({
//       host: this.url(),
//       headers: this.options.headers,
//       _endpoints: this.options._endpoints
//     });
    
//     return api.endpoint(path, customMethods);
// };

Endpoint.prototype.url = function () {
  return urljoin(this.options.host, this.options.path);
};

Endpoint.prototype.one = function (id, userDefined) {
  var entity = new Entity({
    _endpoints: this.options._endpoints,
    host: this.options.host,
    path: urljoin('/', this.options.path),
    headers: this.options.headers,
    userDefined: userDefined || {},
    id: id,
    api: this.options.api
  });
  
  return entity;
};

Endpoint.prototype.list = function (callback) {
  return this.http.request(this.url(), 'GET', function (err, response, list) {
    if (callback) callback(err, list);
  });
};

Endpoint.prototype.create = function (payload, callback) {
  var requestBody = {
    form: payload
  };
  
  return this.http.request(this.url(), 'POST', requestBody, function (err, response, body) {
    if (callback) callback(err, body);
  });
};

Endpoint.prototype.getEndpoint = function (path, id) {
  var pathKey = (id) ? path + id : path;
  return this.options._endpoints[pathKey];
};

},{"./entity":5,"./helpers/defaults":6,"./http":7,"extend":11,"url-join":13}],5:[function(require,module,exports){
var Http = require('./http');
var urljoin = require('url-join');
var defaults = require('./helpers/defaults');
var extend = require('extend');

var Entity = module.exports = function (options) {
  this.hooks = {
    pre: function (next) { next(); }
  };
  
  this.options = {
    host: '',
    path: '',
    headers: {},
    id: 0,
    _endpoints: {}
  };
  
  if(!options) {
    options = {};
  }
  
  if (!options.userDefined) {
    options.userDefined = {};
  }
  
  defaults(options.userDefined.hooks, this.hooks);
  
  extend(this.options, options);
  extend(this, options.userDefined);
  
  this.http = new Http({
    context: this,
    headers: this.options.headers,
    hooks: this.hooks
  });
};

// Placed here because of circular dependency stuff
var Narrator = require('./narrator');

Entity.prototype.endpoint = function (path, customMethods) {
  var api = new Narrator({
    id: this.options.id,
    host: this.url(),
    headers: this.options.headers,
    _endpoints: this.options._endpoints
  });
  return api.endpoint(path, customMethods);
};

Entity.prototype.url = function () {
  return urljoin(this.options.host, this.options.path, this.options.id);
};

Entity.prototype.get = function (callback) {
  return this.http.request(this.url(), 'GET', function (err, response, data) {
    if (callback) callback(err, data);
  });
};

Entity.prototype.update = function (payload, callback) {
  var requestBody = {
    form: payload
  };
  
  return this.http.request(this.url(), 'PUT', requestBody, function (err, response, body) {
    if (callback) callback(err, body);
  });
};

Entity.prototype.remove = function (callback) {
  return this.http.request(this.url(), 'DELETE', function (err, response, body) {
    if (callback) callback(err, body);
  });
};

Entity.prototype.getEndpoint = function (path, id) {
  var pathKey = (id) ? path + id : path;
  return this.options._endpoints[pathKey];
};

},{"./helpers/defaults":6,"./http":7,"./narrator":8,"extend":11,"url-join":13}],6:[function(require,module,exports){
module.exports = function(options, defaults) {
  options = options || {};

  Object.keys(defaults).forEach(function(key) {
    if (typeof options[key] === 'undefined') {
      options[key] = defaults[key];
    }
  });

  return options;
};
},{}],7:[function(require,module,exports){
(function (process){
var extend = require('extend');
var defaults = require('./helpers/defaults');
var request = require('request');
var Promise = require('promise');

var Http = module.exports = function (options) {
  this.options = {
    headers: {},
    hooks: {},
    context: {}
  };
  
  extend(this.options, options);
  
  // Be sure we have a promise
  if (hasPromise(this)) {
    this.promise = this.options.context.options.api.promise;
  }
  else {
    this.promise = function (callback) {
      return new Promise(callback);
    };
  }
  
  function hasPromise (obj) {
    return obj.options.context.options && obj.options.context.options.api && obj.options.context.options.api.promise;
  }
};

Http.prototype.setHeaders = function (headers) {
  this.options.headers = headers;
};

Http.prototype.setHeader = function (key, value) {
  this.options.headers[key] = value;
};

Http.prototype.removeHeader = function (key) {
  delete this.options.headers[key];
};

Http.prototype._parseJSON = function (data) {
  try {
    data = JSON.parse(data);
  }
  catch (e) {}
  finally {
    return data;
  }
};

Http.prototype._promiseWrap = function (callback) {
  return new Promise(callback);
};

Http.prototype._request = request;

Http.prototype._http = function (path, method, options, callback) {
  var self = this;
  
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (typeof callback === 'undefined') {
    callback = function () {};
  }
  
  var requestOptions = {
    url: path,
    method: method
  };
  
  requestOptions = defaults(options, requestOptions);
  return this._promiseWrap(function (resolve, reject) {
    self._request(requestOptions, function (err, response, body) {
      var responseBody = self._parseJSON(body);
      var api;
      
      // Access to api
      if (self.options.context && self.options.context.options.api) {
        api = self.options.context.options.api;
      }
      
      if (api) {
        api.emit('response', {
          error: err,
          response: response
        });
      }
      
      if (err || response.statusCode >= 400) {
        api.emit('response:error', err || response)
        reject(err);
      }
      else{
        api.emit('response:success', response);
        resolve(responseBody);
      }
      
      callback(err, response, responseBody);
    });
  });
};

Http.prototype.request = function (path, method, options, callback) {
  var self = this;
  
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  var httpOptions = {};
  var httpRequest = {};
  
  extend(httpOptions, {
    headers: this.options.headers
  }, options);
  
  extend(httpRequest, httpOptions, {
    path: path,
    method: method
  });
  
  return this._promiseWrap(function (resolve, reject) {
    // TODO: pass current api context (api, users, etc)
    process.nextTick(function () {
      var preHook = (self.options.hooks && self.options.hooks.pre) ? self.options.hooks.pre : function (next) { next(); };
      
      preHook.call(self.options.context, function () {
        self._http(path, method, httpOptions, callback).then(resolve, reject);
      });
    });
  });
};
}).call(this,require('_process'))
},{"./helpers/defaults":6,"_process":10,"extend":11,"promise":9,"request":9}],8:[function(require,module,exports){
var extend = require('extend');
var urljoin = require('url-join');
var Promise = require('promise');
var Emitter = require('tiny-emitter');

var Narrator = module.exports = function (options) {
  options = options || {};
  
  this._endpoints = {};
  this.host = '/';
  
  extend(this, new Emitter(), options);
  
  // FIXME: This is a hacky to expose some features
  var http = this.endpoint('').http;
  this._request = http._http;
  this.createPromise = http._promiseWrap;
};

Narrator.Http = require('./http');

// Placed here because of circular dependency stuff
var Endpoint = require('./endpoint');

Narrator.prototype.endpoint = function (path, userDefined) {
  var pathKey = (this.id) ? path + this.id : path;
  
  if(!(pathKey in this._endpoints)) {
    var endpoint = new Endpoint({
      host: this.host,
      path: urljoin('/', path),
      headers: this.headers,
      userDefined: userDefined || {},
      _endpoints: this._endpoints,
      api: this
    });
    
    this._endpoints[pathKey] = endpoint;
  }
  
  return this._endpoints[pathKey];
};

// Add support for special xhr cases
Narrator.prototype._xhr = {};

Narrator.prototype.withCredentials = function (_withCreds) {
  this.xhr('withCredentials', _withCreds);
  return this;
};

Narrator.prototype.xhr = function (key, value) {
  this._xhr[key] = value;
  return this;
};
},{"./endpoint":4,"./http":7,"extend":11,"promise":9,"tiny-emitter":12,"url-join":13}],9:[function(require,module,exports){

},{}],10:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],11:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toString.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],12:[function(require,module,exports){
function E () {
	// Keep this empty so it's easier to inherit from
  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
}

E.prototype = {
	on: function (name, callback, ctx) {
    var e = this.e || (this.e = {});
    
    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx
    });
    
    return this;
  },

  once: function (name, callback, ctx) {
    var self = this;
    var fn = function () {
      self.off(name, fn);
      callback.apply(ctx, arguments);
    };
    
    return this.on(name, fn, ctx);
  },

  emit: function (name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;
    
    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }
    
    return this;
  },

  off: function (name, callback) {
    var e = this.e || (this.e = {});
    var evts = e[name];
    var liveEvents = [];
    
    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback) liveEvents.push(evts[i]);
      }
    }
    
    // Remove event from queue to prevent memory leak
    // Suggested by https://github.com/lazd
    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

    (liveEvents.length) 
      ? e[name] = liveEvents
      : delete e[name];
    
    return this;
  }
};

module.exports = E;

},{}],13:[function(require,module,exports){
function normalize (str) {
  return str
          .replace(/[\/]+/g, '/')
          .replace(/\/\?/g, '?')
          .replace(/\/\#/g, '#')
          .replace(/\:\//g, '://');
}

module.exports = function () {
  var joined = [].slice.call(arguments, 0).join('/');
  return normalize(joined);
};
},{}]},{},[3]);
