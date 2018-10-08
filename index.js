/**
 * Koa unless middleware. Attach to any middleware and configure it to prevent/permit the
 * middleware in question to be executed.
 *
 * @module koa-unless
 */

'use strict';
var url = require('url');

/** Creates a wrapper middleware that verifies if the original middleware should be skipped. */
module.exports = function (options) {
  var originalMiddleware = this;

  // If a custom function was passed directly, creates a new object literal that holds it as a property called custom.
  var opts = typeof options === 'function' ? { custom: options } : options;
  opts.useOriginalUrl = (typeof opts.useOriginalUrl === 'undefined') ? true : opts.useOriginalUrl;

  // Returns the middleware that wraps the original one.
  return function (ctx, next) {
    var requestedUrl = url.parse((opts.useOriginalUrl ? ctx.originalUrl : ctx.url) || '', true);

    // any match means 'skip original middleware'
    if (matchesCustom(ctx, requestedUrl, opts) || matchesPathRecursive(ctx, requestedUrl, opts) ||
      matchesExtension(ctx, requestedUrl, opts) || matchesMethod(ctx, requestedUrl, opts)) {
      return next();
    }

    return originalMiddleware(ctx, next);
  };
};

/**
 * Returns boolean indicating whether the custom function returns true.
 *
 * @param ctx - Koa context
 * @param requestedUrl - url requested by user
 * @param opts - unless configuration
 * @returns {boolean}
 */
function matchesCustom(ctx, requestedUrl, opts) {
  if (opts.custom) {
    return opts.custom(ctx);
  }
  return false;
}

/**
 * Returns boolean indicating whether the requestUrl matches against the paths configured.
 *
 * @deprecated
 * @param ctx - Koa context
 * @param requestedUrl - url requested by user
 * @param opts - unless configuration
 * @returns {boolean}
 */
function matchesPath(ctx, requestedUrl, opts) {
  var paths = !opts.path || Array.isArray(opts.path) ?
    opts.path : [opts.path];

  if (paths) {
    return paths.some(function (p) {
        return (typeof p === 'string' && p === requestedUrl.pathname) ||
          (p instanceof RegExp && !!p.exec(requestedUrl.pathname));
      });
  }

  return false;
}

/**
 * Returns boolean indicating whether the requestUrl ends with the configured extensions.
 *
 * @param ctx - Koa context
 * @param requestedUrl - url requested by user
 * @param opts - unless configuration
 * @returns {boolean}
 */
function matchesExtension(ctx, requestedUrl, opts) {
  var exts = !opts.ext || Array.isArray(opts.ext) ?
    opts.ext : [opts.ext];

  if (exts) {
    return exts.some(function(ext) {
      return requestedUrl.pathname.substr(ext.length * -1) === ext;
    });
  }
}

/**
 * Returns boolean indicating whether the request method matches the configured methods.
 *
 * @param ctx - Koa context
 * @param requestedUrl - url requested by user
 * @param opts - unless configuration
 * @returns {boolean}
 */
function matchesMethod(ctx, requestedUrl, opts) {
  // console.log(JSON.stringify(opts), ctx.method);
  var methods = !opts.method || Array.isArray(opts.method) ?
    opts.method : [opts.method];

  if (methods) {
    return !!~methods.indexOf(ctx.method);
  }
}

/**
 * Returns boolean indicating whether the requestUrl matches against the paths configured.
 *
 * @param ctx - Koa context
 * @param requestedUrl - url requested by user
 * @param opts - unless configuration
 * @returns {boolean}
 */
function matchesPathRecursive(ctx, requestedUrl, opts) {
  // console.log(JSON.stringify(opts), ctx.method);
  var paths = !opts.path || Array.isArray(opts.path) ?
    opts.path : [opts.path];

  if (paths) {
    return paths.some(function (p) {
      if (Object.prototype.toString.call(p) === '[object Object]') { // check is object
        var subOpts = Object.assign({}, opts, p);
        // check only method and path in sub path options
        return matchesPathRecursive(ctx, requestedUrl, subOpts) && matchesMethod(ctx, requestedUrl, subOpts)
      }

      return (typeof p === 'string' && p === requestedUrl.pathname) ||
        (p instanceof RegExp && !!p.exec(requestedUrl.pathname));
    });
  }

  return false;
}
