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

/**********************************************************************************
 * 
 * Samples to display server version, and more infos
 * 
 *********************************************************************************/
const utils = require("./utils.js");

( async () => {

  await utils.sample({
    title: "Password encryption and hashing",
    labels: [ "Basics", "Encrypt", "Hash", "EncryptPassword", "EncryptServerPassword", "HashPassword", "ReEncryptPassword", "xtk:session" ],
    description: `The xtk:session API provides several function to encrypt secrets and passwords
    - xtk:session#Encrypt                 AESEncryptString (old XtkKey)
    - xtk:session#EncryptPassword         AESEncryptString (new XtkSecretKey)
    - xtk:session#EncryptServerPassword   EncryptServerPassword
    - xtk:session#HashPassword            Creates a hash for the password
    - xtk:session#ReEncryptPassword       for old key (can be XtkKey or XtkSecretKey) to XtkSecretKey`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        const password = "Hello, World";
        console.log(`xtk:session#Encrypt : ${await NLWS.xtkSession.encrypt(password)}`);
        console.log(`xtk:session#EncryptPassword : ${await NLWS.xtkSession.encryptPassword(password)}`);
        console.log(`xtk:session#EncryptServerPassword : ${await NLWS.xtkSession.encryptServerPassword(password)}`);
        console.log(`xtk:session#HashPassword : ${await NLWS.xtkSession.hashPassword(password)}`);
        console.log(`xtk:session#ReEncryptPassword : ${await NLWS.xtkSession.reEncryptPassword(await NLWS.xtkSession.encryptPassword(password))}`);
      });
    }
  });

})();

