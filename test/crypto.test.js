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
 * Unit tests for the encryption utilities
 * 
 *********************************************************************************/

const assert = require('assert');
const crypto = require('../src/crypto.js');
const Cipher = crypto.Cipher;

describe('crypto', function() {
    
    it("Should decrypt password", function() {
        const cipher = new Cipher("HMLmn6uvWr8wu1Akt8UORr07YbC64u1FVW7ENAxNjpo=");
        var decrypted = cipher.decryptPassword("@57QS5VHMb9BCsojLVrKI/Q==");
        assert.equal(decrypted, "mid");
    });

    it("Should fail on invalid encrypted string", function() {
        const cipher = new Cipher("HMLmn6uvWr8wu1Akt8UORr07YbC64u1FVW7ENAxNjpo=");
        assert.throws(function() {
            cipher.decryptPassword("Hello");
        });
    });

    it("Should decrypt password twice", function() {
        const cipher = new Cipher("HMLmn6uvWr8wu1Akt8UORr07YbC64u1FVW7ENAxNjpo=");
        var decrypted = cipher.decryptPassword("@57QS5VHMb9BCsojLVrKI/Q==");
        assert.equal(decrypted, "mid");
         decrypted = cipher.decryptPassword("@57QS5VHMb9BCsojLVrKI/Q==");
        assert.equal(decrypted, "mid");
    });

    it("Should decrypt password after failure", function() {
        const cipher = new Cipher("HMLmn6uvWr8wu1Akt8UORr07YbC64u1FVW7ENAxNjpo=");
        assert.throws(function() {
            cipher.decryptPassword("@Hello");
        });
        // make sure state is valid after failure
        var decrypted = cipher.decryptPassword("@57QS5VHMb9BCsojLVrKI/Q==");
        assert.equal(decrypted, "mid");
    });

    it("Should handle plain text passwords", function() {
        const cipher = new Cipher("llL97E5mAvLTxgT1fsAH2kjLqZXKCGHfDyR9q0C6Ivs=");
        var decrypted = cipher.decryptPassword("__PLAINTEXT__pass");
        assert.equal(decrypted, "pass");
    });

    it("Should fail if no marker", function() {
        const cipher = new Cipher("HMLmn6uvWr8wu1Akt8UORr07YbC64u1FVW7ENAxNjpo=");
        expect(() => { cipher.decryptPassword("57QS5VHMb9BCsojLVrKI/Q=="); }).toThrow("SDK-000011");
    });

    it("Should support empty passwords", function() {
        const cipher = new Cipher("HMLmn6uvWr8wu1Akt8UORr07YbC64u1FVW7ENAxNjpo=");
        assert.equal(cipher.decryptPassword(""), "");
        assert.equal(cipher.decryptPassword(null), "");
        assert.equal(cipher.decryptPassword(undefined), "");
    });

    it("Encrypt - decrypt", function() {
        const cipher = new Cipher("HMLmn6uvWr8wu1Akt8UORr07YbC64u1FVW7ENAxNjpo=");
        expect(cipher.decryptPassword(cipher.encryptPassword(""))).toBe("");
        expect(cipher.decryptPassword(cipher.encryptPassword("1"))).toBe("1");
        expect(cipher.decryptPassword(cipher.encryptPassword("Hello"))).toBe("Hello");
        expect(cipher.decryptPassword(cipher.encryptPassword("ABCDEFGHIJKLmnopqrstuvwxyz"))).toBe("ABCDEFGHIJKLmnopqrstuvwxyz");
    });

});


describe('crypto (browser)', function() {

    it("Should do nothing", () => {
        const browserCrypto = crypto.__browser.crypto;
        expect(browserCrypto).toStrictEqual({});
    })
});
