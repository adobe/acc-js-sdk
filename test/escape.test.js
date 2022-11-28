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
 * Unit tests for escaping functions
 * 
 *********************************************************************************/
const sdk = require('../src/index.js');

describe('escaping', function() {

    describe('escapeXtk', function() {
        
        describe('Escaping strings', function() {
            it("Should escape null strings", () => {
                expect(sdk.escapeXtk(null)).toBe("''");
            });

            it("Should escape undefined strings", () => {
                expect(sdk.escapeXtk(undefined)).toBe("''");
            });

            it("Should escape empty strings", () => {
                expect(sdk.escapeXtk("")).toBe("''");
            });

            it("Should escape empty simple strings", () => {
                expect(sdk.escapeXtk("Hello")).toBe("'Hello'");
                expect(sdk.escapeXtk("Hello world")).toBe("'Hello world'");
                expect(sdk.escapeXtk(" ")).toBe("' '");
            });

            it("Should escape simple quotes", () => {
                expect(sdk.escapeXtk("Hello 'world'")).toBe("'Hello \\'world\\''");
            });
        })

        describe('Tagged template literal', function() {

            it("Should escape in template literal", () => {
                expect(sdk.escapeXtk`Hello world`).toBe("Hello world");
                expect(sdk.escapeXtk`Hello 'world'`).toBe("Hello 'world'");     // only variables are escaped

                const empty = "";
                expect(sdk.escapeXtk``).toBe("");
                expect(sdk.escapeXtk`${empty}`).toBe("''");

                const name = "Joe's";
                expect(sdk.escapeXtk`Hello ${name}`).toBe("Hello 'Joe\\'s'");    // variable value is quoted and escaped

                // A more relevant test
                const userName = 'Alex';
                expect({ expr: sdk.escapeXtk`@name = ${userName}` }).toEqual({ expr: "@name = 'Alex'" });

                // Should support multiple variables
                expect({ expr: sdk.escapeXtk`@name = ${userName} or @name = ${name}` }).toEqual({ expr: "@name = 'Alex' or @name = 'Joe\\'s'" });
            })

            it("Should support constants", () => {
                expect(sdk.escapeXtk([],[])).toBe("''");
            })
        })

        it("examples in jsdoc", () => {
            expect(sdk.escapeXtk("Rock 'n' Roll")).toBe("'Rock \\'n\\' Roll'");
            expect(sdk.escapeXtk`@name=${"Rock 'n' Roll"}`).toBe("@name='Rock \\'n\\' Roll'");
        });

        describe('QueryDef & template literal', () => {
            
        })

    });

    describe('escapeForLike', function() {
        it('Should support null and undefined', () => {
            expect(sdk.escapeForLike(null)).toBe('');
            expect(sdk.escapeForLike(undefined)).toBe('');
            expect(sdk.escapeForLike('')).toBe('');
        });

        it('Should escape simple strings', () => {
            expect(sdk.escapeForLike('Hello')).toBe('Hello');
            expect(sdk.escapeForLike('Hello world')).toBe('Hello world');
            expect(sdk.escapeForLike('1234')).toBe('1234');
        });

        it('Should escape special chars', () => {
            expect(sdk.escapeForLike('99.9%')).toBe('99.9\\%');
            expect(sdk.escapeForLike("John 'Rusty' Toe")).toBe("John \\'Rusty\\' Toe");
            expect(sdk.escapeForLike("Hello_Cruel_World")).toBe("Hello\\_Cruel\\_World");
            expect(sdk.escapeForLike("John \\Rusty\\ Toe")).toBe("John \\\\Rusty\\\\ Toe");
            // $ is not a special char
            expect(sdk.escapeForLike('$99.9')).toBe('$99.9');
        });

        it('Should escape Xtk Variables', () => {
            expect(sdk.escapeForLike('$99.9', false)).toBe('$99.9');
            expect(sdk.escapeForLike('1+$id', true)).toBe("1+' + Char('36') + 'id");
        });
    });

});