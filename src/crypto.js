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


/**********************************************************************************
 * 
 * Browser-side implementation of nodejs crypto module
 * 
 *********************************************************************************/
exports.crypto = {};

/**********************************************************************************
 * 
 * Encryption / Decryption functions
 * Node implementation
 * 
 *********************************************************************************/
/* istanbul ignore else */
if (!Util.isBrowser()) {

  // Expose browser exports for unit testing
  exports.__browser = { crypto: exports.crypto };
  delete exports.crypto;

  var crypto = require('crypto');
  const { CampaignException } = require('./campaign.js');

  /**
   * @namespace Campaign
   */

  /**
   * Creates the encryption/decryption object
   * 
   * @private
   * @deprecated
   * @class
   * @constructor
   * @param {string} key is the encryption key, coming from the XtkSecretKey or XtkKey option
   * @memberof Campaign
   */
  class Cipher {
      
      constructor(key) {
          // ex: "llL97E5mAvLTxgT1fsAH2kjLqZXKCGHfDyR9q0C6Ivs="
          this.key = Buffer.from(key, 'base64');
          this.iv = Buffer.from([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]);
      }

      /**
       * Encrypts a password
       * 
       * @private
       * @deprecated
       * @param {string} password it the password to encrypt
       * @returns {string} the encrypted password
       */
      encryptPassword(password) {
          const cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
          var buf = Buffer.from(password, 'utf8');
          var pad = Buffer.alloc(3);
          buf = Buffer.concat([buf, pad]);
          var dec1 = cipher.update(buf);
          var dec2 = cipher.final();
          var dec = Buffer.concat([dec1, dec2]);
          dec = "@" + dec.toString('base64');
          return dec;
      }


      /**
       * Decrypts a password (such as an external account password)
       * Corresponds to the Campaign `decryptPassword` implemented in jst.cpp

      * @private
      * @deprecated
      * @param {string} password is the password to decrypt
      * @returns {string} the decrypted password
      * 
      * {marker} @
      *  {base64}
      *      {encrypted}
      *          {data} utf-8
      *          {salt} 2 bytes
      *          {crc} 1 byte
      */
      decryptPassword(password) {
          if (password === null || password === undefined || password === "")
              return "";
          if (password.substr(0, 13) === '__PLAINTEXT__')
              return password.substr(13);
          
          // remove marker
          if (password[0] !== '@')
              throw CampaignException.DECRYPT_ERROR();
          password = password.substr(1);  

          const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, this.iv);
          const buf = Buffer.from(password, 'base64');
          var dec1 = decipher.update(buf);
          var dec2 = decipher.final(); 
          var dec = Buffer.concat([dec1, dec2]);

          // last byte is CRC (check and remove)
          dec = dec.slice(0, dec.length - 1);
          // last 2 bytes are salt
          dec = dec.slice(0, dec.length - 2);
          
          dec = dec.toString('utf-8');
          return dec;
      }

  }

  // Public exports
  exports.Cipher = Cipher;
}


})();