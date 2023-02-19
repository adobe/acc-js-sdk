/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
(function() {
"use strict";

const { Util } = require('./util.js');

/**
 * @memberof Utils
 * @class
 * @constructor
 */
class HttpError {
  /* Encapsulates an error from an HTTP call
    * @param {string|number} statusCode - The Http status code
    * @param {string?} statusText - The Http status text corresponding to the error code
    * @param {any?} data - The payload of the HTTP response, which usually contains details about the error
  */
  constructor(statusCode, statusText, data) {
      this.statusCode = statusCode;
      this.statusText = statusText || "";
      this.data = data;
  }

  /**
   * Returns a short description of the error
   * @returns {string} a short descrption of the error
   */
  toString() {
    return `${this.statusCode}${this.statusText ? " " + this.statusText : ""}`;
  }
}

/**********************************************************************************
 *
 * Node implementation
 *
 *********************************************************************************/
/* istanbul ignore else */
if (!Util.isBrowser()) {

  // Transport layer using axios library
  const axios = require('axios');

  /**
   *
   * Request body (options)
   * - headers (kv)
   * - method
   * - url
   * - data
   *
   * Response
   * - data
   * - statusCode
   * - statusText
   * - request
   */

   const request = (options, requestOptions) => {
    requestOptions = requestOptions || {};
    const request = {
      method: options.method || "GET",
      url: options.url,
      headers: options.headers,
      data: options.data,
      timeout: requestOptions.timeout || 5000,
      signal: requestOptions.signal,
    };
    return axios(request)
    .then((response) => {
      // HTTP success (200, 201, etc.) are returned here
      return Promise.resolve(response.data);
    })
    .catch((error) => {
      // Not an HTTP error
      const response = error && error.response;
      if (!response)
        return Promise.reject(new HttpError(500, error ? error.toString() : undefined));
      // HTTP errors (400, 404, 500, etc.) are returned here
      return Promise.reject(new HttpError(response.status, response.statusText, response.data));
    });
  };

  exports.request = request;
  exports.HttpError = HttpError;

}

/**********************************************************************************
 *
 * Browser-side implementation of the request-promise-native node module.
 * This simply wraps the fetch API
 * From https://www.npmjs.com/package/request-promise-native
 *
 *********************************************************************************/
 else {

  const request = function(options, requestOptions) {
    requestOptions = requestOptions || {};
    const headers = new Headers();
    for (var k in options.headers) {
        headers.append(k, options.headers[k]);
    }
    const r = new Request(options.url, {
        method: options.method,
        headers: headers,
        body: options.data,
        signal : requestOptions.signal,
    });

    const p = fetch(r).then(async (response) => {
        if (!response.ok)
            throw new HttpError(response.status, response.statusText, await response.text());
        return response.blob().then((blob) => {
            return blob.text();
        });
    }).catch((ex) => {
      if(ex.name === 'AbortError'){
        throw ex;
      }
      const proto = Object.getPrototypeOf(ex);
      if (proto.constructor.name == "HttpError")
        throw ex;
      throw new HttpError(ex.status, ex.statusText);
    });
    return p;
  };

  module.exports.request = request;

}

})();
