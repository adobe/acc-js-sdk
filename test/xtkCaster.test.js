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
 * Unit tests for the XtkCaster class
 * 
 *********************************************************************************/

const XtkCaster = require('../src/xtkCaster.js').XtkCaster;
const assert = require('assert');


assert.myEquals = function(actual, expected) {
    var same = false;
    if (actual === null && expected === null) same = true;
    else if (actual === undefined && expected === undefined) same = true;
    else if (actual === undefined || actual === null || expected === undefined || expected === null) same = false;
    else if (expected instanceof Date)
        same = expected.getTime() === actual.getTime();
    else if (actual === expected) same = true;
    assert(same);
}

describe('XtkCaster', function() {

    describe('#asNumber', function() {
        const expectedValues = [
            // (value)   ==  expected
            [ undefined,                     0   ],
            [ null,                          0   ],
            [ "",                            0   ],
            [ 1,                             1   ],
            [ 12.4,                         12.4 ],
            [ -2.3,                         -2.3 ],
            [ "1",                           1   ],
            [ "12.4",                       12.4 ],
            [ "-2.3",                       -2.3 ],
            [ "--2.3",                       0   ],
            [ "dummy",                       0   ],
            [ "  1",                         1   ],
            [ "  12.4",                     12.4 ],
            [ "  -2.3",                     -2.3 ],
            [ "1  ",                         1   ],
            [ "12.4  ",                     12.4 ],
            [ "-2.3  ",                     -2.3 ],
            [ {},                            0   ],
            [ NaN,                           0   ],
            [ Number.POSITIVE_INFINITY,      0   ],
            [ Number.NEGATIVE_INFINITY,      0   ],
            [ new Date(),                    0   ],
            [ new Date("hello"),             0   ],
        ];

        function testOne(i) {
            const expected = expectedValues[i];
            const value = expected[0];
            const expectedResult = expected[1];
            it('Should return the value casted as a number', function() {
                assert.myEquals(XtkCaster.asNumber(value), expectedResult);
            });
            it('Should return the value casted as type float', function() {
                assert.myEquals(XtkCaster.as(value, 'float'), expectedResult);
            });
            it('Should return the value casted as type 4', function() {
                assert.myEquals(XtkCaster.as(value, 4), expectedResult);
            });
            it('Should return the value casted as type double', function() {
                assert.myEquals(XtkCaster.as(value, 'double'), expectedResult);
            });
            it('Should return the value casted as type 5', function() {
                assert.myEquals(XtkCaster.as(value, 5), expectedResult);
            });
        }

        for (var i=0; i<expectedValues.length; i++) {
            testOne(i);
        }
    }),

    describe('#asByte', function() {
        const expectedValues = [
            // (value)   ==  expected
            [ undefined,                     0   ],
            [ null,                          0   ],
            [ "",                            0   ],
            [ 1,                             1   ],
            [ 12.4,                         12   ],
            [ -2.3,                         -2   ],
            [ "1",                           1   ],
            [ "12.4",                       12   ],
            [ "-2.3",                       -2   ],
            [ "--2.3",                       0   ],
            [ "dummy",                       0   ],
            [ "  1",                         1   ],
            [ "  12.4",                     12   ],
            [ "  -2.3",                     -2   ],
            [ "1  ",                         1   ],
            [ "12.4  ",                     12   ],
            [ "-2.3  ",                     -2  ],
            [ {},                            0   ],
            [ NaN,                           0   ],
            [ Number.POSITIVE_INFINITY,      0   ],
            [ Number.NEGATIVE_INFINITY,      0   ],
            [ new Date(),                    0   ],
            [ new Date("hello"),             0   ],

            // Rounding
            [ "1.4",                         1   ],
            [ "1.5",                         2   ],
            [ "1.6",                         2   ],
            [ "127",                         127 ],
            [ "128",                         127 ],
            [ "129",                         127 ],
            [ "-1.4",                       -1   ],
            [ "-1.5",                       -1   ],
            [ "-1.6",                       -2   ],
            [ "-127",                       -127 ],
            [ "-128",                       -128 ],
            [ "-129",                       -128 ],
        ];

        function testOne(i) {
            const expected = expectedValues[i];
            const value = expected[0];
            const expectedResult = expected[1];
            it('Should return the value casted as a byte ("' + value + '")', function() {
                assert.myEquals(XtkCaster.asByte(value), expectedResult);
            });
            it('Should return the value casted as type byte', function() {
                assert.myEquals(XtkCaster.as(value, 'byte'), expectedResult);
            });
            it('Should return the value casted as type 1', function() {
                assert.myEquals(XtkCaster.as(value, 1), expectedResult);
            });
        }

        for (var i=0; i<expectedValues.length; i++) {
            testOne(i);
        }
    }),

    describe('#asShort', function() {
        const expectedValues = [
            // (value)   ==  expected
            [ undefined,                     0   ],
            [ null,                          0   ],
            [ "",                            0   ],
            [ 1,                             1   ],
            [ 12.4,                         12   ],
            [ -2.3,                         -2   ],
            [ "1",                           1   ],
            [ "12.4",                       12   ],
            [ "-2.3",                       -2   ],
            [ "--2.3",                       0   ],
            [ "dummy",                       0   ],
            [ "  1",                         1   ],
            [ "  12.4",                     12   ],
            [ "  -2.3",                     -2   ],
            [ "1  ",                         1   ],
            [ "12.4  ",                     12   ],
            [ "-2.3  ",                     -2  ],
            [ {},                            0   ],
            [ NaN,                           0   ],
            [ Number.POSITIVE_INFINITY,      0   ],
            [ Number.NEGATIVE_INFINITY,      0   ],
            [ new Date(),                    0   ],
            [ new Date("hello"),             0   ],

            // Rounding
            [ "1.4",                         1   ],
            [ "1.5",                         2   ],
            [ "1.6",                         2   ],
            [ "32767",                     32767 ],
            [ "32768",                     32767 ],
            [ "32769",                     32767 ],
            [ "-1.4",                       -1   ],
            [ "-1.5",                       -1   ],
            [ "-1.6",                       -2   ],
            [ "-32767",                   -32767 ],
            [ "-32768",                   -32768 ],
            [ "-32769",                   -32768 ],
        ];

        function testOne(i) {
            const expected = expectedValues[i];
            const value = expected[0];
            const expectedResult = expected[1];
            it('Should return the value casted as a short ("' + value + '")', function() {
                assert.myEquals(XtkCaster.asShort(value), expectedResult);
            });
            it('Should return the value casted as type short', function() {
                assert.myEquals(XtkCaster.as(value, 'short'), expectedResult);
            });
            it('Should return the value casted as type 2', function() {
                assert.myEquals(XtkCaster.as(value, 2), expectedResult);
            });
        }

        for (var i=0; i<expectedValues.length; i++) {
            testOne(i);
        }
    }),

    describe('#asLong', function() {
        const expectedValues = [
            // (value)   ==  expected
            [ undefined,                     0   ],
            [ null,                          0   ],
            [ "",                            0   ],
            [ 1,                             1   ],
            [ 12.4,                         12   ],
            [ -2.3,                         -2   ],
            [ "1",                           1   ],
            [ "12.4",                       12   ],
            [ "-2.3",                       -2   ],
            [ "--2.3",                       0   ],
            [ "dummy",                       0   ],
            [ "  1",                         1   ],
            [ "  12.4",                     12   ],
            [ "  -2.3",                     -2   ],
            [ "1  ",                         1   ],
            [ "12.4  ",                     12   ],
            [ "-2.3  ",                     -2  ],
            [ {},                            0   ],
            [ NaN,                           0   ],
            [ Number.POSITIVE_INFINITY,      0   ],
            [ Number.NEGATIVE_INFINITY,      0   ],
            [ new Date(),                    0   ],
            [ new Date("hello"),             0   ],

            // Rounding
            [ "1.4",                         1   ],
            [ "1.5",                         2   ],
            [ "1.6",                         2   ],
            [ "2147483647",                     2147483647 ],
            [ "2147483648",                     2147483647 ],
            [ "2147483649",                     2147483647 ],
            [ "-1.4",                       -1   ],
            [ "-1.5",                       -1   ],
            [ "-1.6",                       -2   ],
            [ "-2147483647",                   -2147483647 ],
            [ "-2147483648",                   -2147483648 ],
            [ "-2147483649",                   -2147483648 ],
        ];

        function testOne(i) {
            const expected = expectedValues[i];
            const value = expected[0];
            const expectedResult = expected[1];
            it('Should return the value casted as a long ("' + value + '")', function() {
                assert.myEquals(XtkCaster.asLong(value), expectedResult);
            });
            it('Should return the value casted as type long', function() {
                assert.myEquals(XtkCaster.as(value, 'long'), expectedResult);
            });
            it('Should return the value casted as type 3', function() {
                assert.myEquals(XtkCaster.as(value, 3), expectedResult);
            });
        }

        for (var i=0; i<expectedValues.length; i++) {
            testOne(i);
        }
    }),

    describe('#asInt64', function() {
        const expectedValues = [
            // (value)   ==  expected
            [ undefined,                     "0"   ],
            [ null,                          "0"   ],
            [ "",                            "0"   ],
            [ " ",                           "0"   ],
            [ "1.",                          "0"   ],
            [ ".5",                          "0"   ],
            [ 1,                             "1"   ],
            [ 12.4,                         "0"   ],
            [ -2.3,                         "0"   ],
            [ "1",                           "1"   ],
            [ "12.4",                       "0"   ],
            [ "-2.3",                       "0"   ],
            [ "--2.3",                       "0"   ],
            [ "dummy",                       "0"   ],
            [ "  1",                         "1"   ],
            [ "  12.4",                     "0"   ],
            [ "  -2.3",                     "0"   ],
            [ "1  ",                         "1"   ],
            [ "12.4  ",                     "0"   ],
            [ "-2.3  ",                     "0"  ],
            [ {},                            "0"   ],
            [ NaN,                           "0"   ],
            [ Number.POSITIVE_INFINITY,      "0"   ],
            [ Number.NEGATIVE_INFINITY,      "0"   ],
            [ new Date(),                    "0"   ],
            [ new Date("hello"),             "0"   ],

            // Rounding
            [ "1.4",                         "0"   ],
            [ "1.5",                         "0"   ],
            [ "1.6",                         "0"   ],
            [ "2147483647",                     "2147483647" ],
            [ "2147483648",                     "2147483648" ],
            [ "2147483649",                     "2147483649" ],
            [ "-1.4",                       "0"   ],
            [ "-1.5",                       "0"   ],
            [ "-1.6",                       "0"   ],
            [ "-2147483647",                   "-2147483647" ],
            [ "-2147483648",                   "-2147483648" ],
            [ "-2147483649",                   "-2147483649" ],
        ];

        function testOne(i) {
            const expected = expectedValues[i];
            const value = expected[0];
            const expectedResult = expected[1];
            it('Should return the value casted as a int64 ("' + value + '")', function() {
                assert.myEquals(XtkCaster.asInt64(value), expectedResult);
            });
            it('Should return the value casted as type int64', function() {
                assert.myEquals(XtkCaster.as(value, 'int64'), expectedResult);
            });
        }

        for (var i=0; i<expectedValues.length; i++) {
            testOne(i);
        }
    }),
    
    describe('#asString', function() {
        const expectedValues = [
            // (value)   ==  expected
            [ undefined,                                        ""                          ],
            [ null,                                             ""                          ],
            [ "",                                               ""                          ],
            [ 1,                                                "1"                         ],
            [ 12.4,                                             "12.4"                      ],
            [ -2.3,                                             "-2.3"                      ],
            [ "1",                                              "1"                         ],
            [ "12.4",                                           "12.4"                      ],
            [ "-2.3",                                           "-2.3"                      ],
            [ "--2.3",                                          "--2.3"                     ],
            [ "dummy",                                          "dummy"                     ],
            [ "  1",                                            "  1"                       ],
            [ "  12.4",                                         "  12.4"                    ],
            [ "  -2.3",                                         "  -2.3"                    ],
            [ "1  ",                                            "1  "                       ],
            [ "12.4  ",                                         "12.4  "                    ],
            [ "-2.3  ",                                         "-2.3  "                    ],
            [ {},                                               ""                          ],
            [ NaN,                                              ""                          ],
            [ Number.POSITIVE_INFINITY,                         ""                          ],
            [ Number.NEGATIVE_INFINITY,                         ""                          ],
            [ new Date(Date.UTC(2020,1,20,10,37,44)),           "2020-02-20T10:37:44.000Z"  ],
            [ new Date("invalid"),                              ""                          ],
        ];

        function testOne(i) {
            const expected = expectedValues[i];
            const value = expected[0];
            const expectedResult = expected[1];
            it('Should return the value casted as a string ("' + value + '")', function() {
                const actual = XtkCaster.asString(value);
                assert.myEquals(actual, expectedResult);
            });
            it('Should return the value casted as type string', function() {
                assert.myEquals(XtkCaster.as(value, 'string'), expectedResult);
            });
            it('Should return the value casted as type 6', function() {
                assert.myEquals(XtkCaster.as(value, 6), expectedResult);
            });
            it('Should return the value casted as type memo', function() {
                assert.myEquals(XtkCaster.as(value, 'memo'), expectedResult);
            });
            it('Should return the value casted as type 12', function() {
                assert.myEquals(XtkCaster.as(value, 12), expectedResult);
            });
            it('Should return the value casted as type 13', function() {
                assert.myEquals(XtkCaster.as(value, 13), expectedResult);
            });
        }

        for (var i=0; i<expectedValues.length; i++) {
            testOne(i);
        }
    }),

    describe('#asTimestamp', function() {
        const expectedValues = [
            // (value)                                   ==  expected
            [ undefined,                                        null                                  ],
            [ null,                                             null                                  ],
            [ "",                                               null                                  ],
            [ " ",                                              null                                  ],
            [ true,                                             null                                  ],
            [ false,                                            null                                  ],
            [ "dummy",                                          null                                  ],
            [ "2020-02-20T10:37:44.000Z",                       new Date("2020-02-20T10:37:44.000Z"),   ],
            [ "2020-02-20 10:37:44.000Z",                       new Date("2020-02-20T10:37:44.000Z"),   ],
            [ "2020-02-20",                                     new Date("2020-02-20T00:00:00.000Z"),   ],
            [ 0,                                                new Date("1970-01-01T00:00:00.000Z"),   ],
            [ 1,                                                new Date("1970-01-01T00:00:01.000Z"),   ],
            [ "0",                                              new Date("1970-01-01T00:00:00.000Z"),   ],
            [ "1",                                              new Date("1970-01-01T00:00:01.000Z"),   ],
            [ "  0",                                            new Date("1970-01-01T00:00:00.000Z"),   ],
            [ "  1",                                            new Date("1970-01-01T00:00:01.000Z"),   ],
            [ "0  ",                                            new Date("1970-01-01T00:00:00.000Z"),   ],
            [ "1  ",                                            new Date("1970-01-01T00:00:01.000Z"),   ],
            [ {},                                               null                                  ],
            [ NaN,                                              null                                  ],
            [ Number.POSITIVE_INFINITY,                         null                                  ],
            [ Number.NEGATIVE_INFINITY,                         null                                  ],
            [ new Date(Date.UTC(2020,1,20,10,37,44)),           new Date("2020-02-20T10:37:44.000Z"),   ],
            [ new Date("hello"),                                null                                  ],
        ];

        function testOne(i) {
            const expected = expectedValues[i];
            const value = expected[0];
            const expectedResult = expected[1];
            it('Should return the value casted as a timestamp ("' + value + '")', function() {
                let actual = XtkCaster.asTimestamp(value);
                assert.myEquals(actual, expectedResult);
                actual = XtkCaster.asDatetime(value);
                assert.myEquals(actual, expectedResult);
            });
            it('Should return the value casted as type datetime', function() {
                assert.myEquals(XtkCaster.as(value, 'datetime'), expectedResult);
            });
            it('Should return the value casted as type 7', function() {
                assert.myEquals(XtkCaster.as(value, 7), expectedResult);
            });
            it('Should return the value casted as type datetimetz', function() {
                assert.myEquals(XtkCaster.as(value, 'datetimetz'), expectedResult);
            });
            it('Should return the value casted as type datetimenotz', function() {
                assert.myEquals(XtkCaster.as(value, 'datetimenotz'), expectedResult);
            });
        }

        for (var i=0; i<expectedValues.length; i++) {
            testOne(i);
        }
    }),

    describe('#asDate', function() {
        const expectedValues = [
            // (value)                                   ==  expected
            [ undefined,                                        null                                  ],
            [ null,                                             null                                  ],
            [ "",                                               null                                  ],
            [ " ",                                              null                                  ],
            [ true,                                             null                                  ],
            [ false,                                            null                                  ],
            [ "dummy",                                          null                                  ],
            [ "2020-02-20T10:37:44.000Z",                       new Date("2020-02-20T00:00:00.000Z"),   ],
            [ "2020-02-20 10:37:44.000Z",                       new Date("2020-02-20T00:00:00.000Z"),   ],
            [ "2020-02-20",                                     new Date("2020-02-20T00:00:00.000Z"),   ],
            [ 0,                                                new Date("1970-01-01T00:00:00.000Z"),   ],
            [ 1,                                                new Date("1970-01-01T00:00:00.000Z"),   ],
            [ "0",                                              new Date("1970-01-01T00:00:00.000Z"),   ],
            [ "1",                                              new Date("1970-01-01T00:00:00.000Z"),   ],
            [ "  0",                                            new Date("1970-01-01T00:00:00.000Z"),   ],
            [ "  1",                                            new Date("1970-01-01T00:00:00.000Z"),   ],
            [ "0  ",                                            new Date("1970-01-01T00:00:00.000Z"),   ],
            [ "1  ",                                            new Date("1970-01-01T00:00:00.000Z"),   ],
            [ {},                                               null                                  ],
            [ NaN,                                              null                                  ],
            [ Number.POSITIVE_INFINITY,                         null                                  ],
            [ Number.NEGATIVE_INFINITY,                         null                                  ],
            [ new Date(Date.UTC(2020,1,20,10,37,44)),           new Date("2020-02-20T00:00:00.000Z"),   ],
            [ new Date("hello"),                                null                                  ],
        ];

        function testOne(i) {
            const expected = expectedValues[i];
            const value = expected[0];
            const expectedResult = expected[1];
            it('Should return the value casted as a date ("' + value + '")', function() {
                const actual = XtkCaster.asDate(value);
                assert.myEquals(actual, expectedResult);
            });
            it('Should return the value casted as type date', function() {
                assert.myEquals(XtkCaster.as(value, 'date'), expectedResult);
            });
            it('Should return the value casted as type 10', function() {
                assert.myEquals(XtkCaster.as(value, 10), expectedResult);
            });
        }

        for (var i=0; i<expectedValues.length; i++) {
            testOne(i);
        }
    }),

    describe('#asBoolean', function() {

        const expectedValues = [
            // (value,      defaultValue)   ==  expected            expected ("as" function)

            // null and undefined inherits the default value
            [ undefined,       undefined,        false,             false ],
            [ null,            undefined,        false,             false ],
            [ undefined,       true,             true,              false ],
            [ null,            true,             true,              false ],
            [ undefined,       false,            false,             false ],
            [ null,            false,            false,             false ],

            // booleans are return unchanged
            [ true,            undefined,        true,              true  ],
            [ true,            true,             true,              true  ],
            [ true,            false,            true,              true  ],
            [ false,           undefined,        false,             false ],
            [ false,           true,             false,             false ],
            [ false,           false,            false,             false ],

            // empty string is considered as false
            [ "",              undefined,        false,             false ],
            [ "",              true,             false,             false ],
            [ "",              false,            false,             false ],
            [ " ",             undefined,        false,             false ],
            [ " ",             true,             false,             false ],
            [ " ",             false,            false,             false ],
            [ "  ",            undefined,        false,             false ],
            [ "  ",            true,             false,             false ],
            [ "  ",            false,            false,             false ],

            // "false" and "true" are recognised
            [ "false",         undefined,        false,             false ],
            [ "false",         true,             false,             false ],
            [ "false",         false,            false,             false ],
            [ "false ",        undefined,        false,             false ],
            [ "false ",        true,             false,             false ],
            [ "false ",        false,            false,             false ],
            [ " false",        undefined,        false,             false ],
            [ " false",        true,             false,             false ],
            [ " false",        false,            false,             false ],
            [ "faLSe",         undefined,        false,             false ],
            [ "faLSe",         true,             false,             false ],
            [ "faLSe",         false,            false,             false ],

            [ "true",          undefined,        true,              true  ],
            [ "true",          true,             true,              true  ],
            [ "true",          false,            true,              true  ],
            [ "true ",         undefined,        true,              true  ],
            [ "true ",         true,             true,              true  ],
            [ "true ",         false,            true,              true  ],
            [ " true",         undefined,        true,              true  ],
            [ " true",         true,             true,              true  ],
            [ " true",         false,            true,              true  ],
            [ "TRUE",          undefined,        true,              true  ],
            [ "TRUE",          true,             true,              true  ],
            [ "TRUE",          false,            true,              true  ],

            // Number 0 is false
            [ 0,               undefined,        false,             false ],
            [ 0,               undefined,        false,             false ],
            [ 0,               true,             false,             false ],
            [ 0,               false,            false,             false ],
            [ "0",             undefined,        false,             false ],
            [ "0",             true,             false,             false ],
            [ "0",             false,            false,             false ],
            [ "0 ",            undefined,        false,             false ],
            [ "0 ",            true,             false,             false ],
            [ "0 ",            false,            false,             false ],
            [ " 0 ",           undefined,        false,             false ],
            [ " 0 ",           true,             false,             false ],
            [ " 0 ",           false,            false,             false ],

            // Any other number is true
            [ 1,               undefined,        true,              true  ],
            [ 1,               true,             true,              true  ],
            [ 1,               false,            true,              true  ],
            [ "1",             undefined,        true,              true  ],
            [ "1",             true,             true,              true  ],
            [ "1",             false,            true,              true  ],
            [ "1 ",            undefined,        true,              true  ],
            [ "1 ",            true,             true,              true  ],
            [ "1 ",            false,            true,              true  ],
            [ " 1 ",           undefined,        true,              true  ],
            [ " 1 ",           true,             true,              true  ],
            [ " 1 ",           false,            true,              true  ],

            [ 2.4,             undefined,        true,              true  ],
            [ 2.4,             true,             true,              true  ],
            [ 2.4,             false,            true,              true  ],
            [ "2.4",           undefined,        true,              true  ],
            [ "2.4",           true,             true,              true  ],
            [ "2.4",           false,            true,              true  ],
            [ "2.4 ",          undefined,        true,              true  ],
            [ "2.4 ",          true,             true,              true  ],
            [ "2.4 ",          false,            true,              true  ],
            [ " 2.4 ",         undefined,        true,              true  ],
            [ " 2.4 ",         true,             true,              true  ],
            [ " 2.4 ",         false,            true,              true  ],

            [ -1,              undefined,        true,              true  ],
            [ -1,              true,             true,              true  ],
            [ -1,              false,            true,              true  ],
            [ "-1",            undefined,        true,              true  ],
            [ "-1",            true,             true,              true  ],
            [ "-1",            false,            true,              true  ],
            [ "-1 ",           undefined,        true,              true  ],
            [ "-1 ",           true,             true,              true  ],
            [ "-1 ",           false,            true,              true  ],
            [ " -1 ",          undefined,        true,              true  ],
            [ " -1 ",          true,             true,              true  ],
            [ " -1 ",          false,            true,              true  ],

            // NaN and Infinite numbers are false
            [ NaN,            undefined,        false,              false ],
            [ NaN,            true,             false,              false ],
            [ NaN,            false,            false,              false ],
            [ Number.POSITIVE_INFINITY, undefined,        false,    false ],
            [ Number.POSITIVE_INFINITY, true,             false,    false ],
            [ Number.POSITIVE_INFINITY, false,            false,    false ],
            [ Number.NEGATIVE_INFINITY, undefined,        false,    false ],
            [ Number.NEGATIVE_INFINITY, true,             false,    false ],
            [ Number.NEGATIVE_INFINITY, false,            false,    false ],

            // invalid values are considered as false
            [ "dummy",        undefined,        false,              false ],
            [ "dummy",        true,             false,              false ],
            [ "dummy",        false,            false,              false ],

            // Objects are considered as false 
            [ {},             undefined,        false,              false ],
            [ {},             true,             false,              false ],
            [ {},             false,            false,              false ],

            [ new Date(),     false,            false,              false ],
            [ new Date("x"),  false,            false,              false ],
        ];

        function testOne(i) {
            const expected = expectedValues[i];
            const value = expected[0];
            const defaultValue = expected[1];
            const expectedResult = expected[2];
            it('Should return the value casted as a boolean', function() {
                assert.myEquals(XtkCaster.asBoolean(value, defaultValue), expectedResult);
            });

            const expectedResultNoDefault = expected[3];
            it('Should return the value "' + value + '" casted as type boolean', function() {
                assert.myEquals(XtkCaster.as(value, 'boolean'), expectedResultNoDefault);
            });
            it('Should return the value "' + value + '" casted as type 15', function() {
                assert.myEquals(XtkCaster.as(value, 15), expectedResultNoDefault);
            });
        }

        for (var i=0; i<expectedValues.length; i++) {
            testOne(i);
        }
    })

    describe('None type', function() {
        it('Should support none type', function() {
            assert.equal(XtkCaster.as(null, 0), null);
            assert.equal(XtkCaster.as(undefined, 0), undefined);
            assert.equal(XtkCaster.as("Hello", 0), "Hello");
            assert.equal(XtkCaster.as(3, 0), 3);

            assert.equal(XtkCaster.as(null, ""), null);
            assert.equal(XtkCaster.as(undefined, ""), undefined);
            assert.equal(XtkCaster.as("Hello", ""), "Hello");
            assert.equal(XtkCaster.as(3, ""), 3);
        });
    });

    describe("Unsupported types", function() {
        it("Should fail on unsupported types", function() {
            assert.throws(() => { XtkCaster.as(1, "unsupported"); });
            assert.throws(() => { XtkCaster.as(1, 999); });
        });
    });

    it("Nan should cast to 0", function() {
        assert.equal(XtkCaster.asNumber("Invalid"), 0);     // will parse as "NaN"
        assert.equal(XtkCaster.asNumber(NaN), 0);           // real "NaN"
    });

    it("_variantStorageAttribute should return the field name where to store a variant value (for example in the xtk:option table)", () => {
        expect(XtkCaster._variantStorageAttribute(null)).toBe(null);
        expect(XtkCaster._variantStorageAttribute(undefined)).toBe(null);
        expect(XtkCaster._variantStorageAttribute(0)).toBe(null);
        expect(XtkCaster._variantStorageAttribute("")).toBe(null);
        expect(XtkCaster._variantStorageAttribute(6)).toBe("stringValue");
        expect(XtkCaster._variantStorageAttribute("string")).toBe("stringValue");
        expect(XtkCaster._variantStorageAttribute("primarykey")).toBe("stringValue");
        expect(XtkCaster._variantStorageAttribute("int64")).toBe("stringValue");
        expect(XtkCaster._variantStorageAttribute("uuid")).toBe("stringValue");
        expect(XtkCaster._variantStorageAttribute(12)).toBe("memoValue");
        expect(XtkCaster._variantStorageAttribute(13)).toBe("memoValue");
        expect(XtkCaster._variantStorageAttribute("memo")).toBe("memoValue");
        expect(XtkCaster._variantStorageAttribute("CDATA")).toBe("memoValue");
        expect(XtkCaster._variantStorageAttribute("blob")).toBe("memoValue");
        expect(XtkCaster._variantStorageAttribute("html")).toBe("memoValue");
        expect(XtkCaster._variantStorageAttribute(1)).toBe("longValue");
        expect(XtkCaster._variantStorageAttribute(2)).toBe("longValue");
        expect(XtkCaster._variantStorageAttribute(3)).toBe("longValue");
        expect(XtkCaster._variantStorageAttribute(15)).toBe("longValue");
        expect(XtkCaster._variantStorageAttribute("byte")).toBe("longValue");
        expect(XtkCaster._variantStorageAttribute("short")).toBe("longValue");
        expect(XtkCaster._variantStorageAttribute("long")).toBe("longValue");
        expect(XtkCaster._variantStorageAttribute("int")).toBe("longValue");
        expect(XtkCaster._variantStorageAttribute("boolean")).toBe("longValue");
        expect(XtkCaster._variantStorageAttribute(4)).toBe("doubleValue");
        expect(XtkCaster._variantStorageAttribute(5)).toBe("doubleValue");
        expect(XtkCaster._variantStorageAttribute("float")).toBe("doubleValue");
        expect(XtkCaster._variantStorageAttribute("double")).toBe("doubleValue");
        expect(XtkCaster._variantStorageAttribute(7)).toBe("timeStampValue");
        expect(XtkCaster._variantStorageAttribute(10)).toBe("timeStampValue");
        expect(XtkCaster._variantStorageAttribute("datetime")).toBe("timeStampValue");
        expect(XtkCaster._variantStorageAttribute("datetimetz")).toBe("timeStampValue");
        expect(XtkCaster._variantStorageAttribute("datetimenotz")).toBe("timeStampValue");
        expect(XtkCaster._variantStorageAttribute("date")).toBe("timeStampValue");
        expect(() => { XtkCaster._variantStorageAttribute(777); }).toThrow("Cannot get variant storage");
    });

    describe("Array tests", () => {
            it("Should return array", () => {
            expect(XtkCaster.asArray(null)).toStrictEqual([]);
            expect(XtkCaster.asArray(undefined)).toStrictEqual([]);
            expect(XtkCaster.asArray(false)).toStrictEqual([false]);
            expect(XtkCaster.asArray("Hello")).toStrictEqual(["Hello"]);
            expect(XtkCaster.asArray([])).toStrictEqual([]);
            expect(XtkCaster.asArray([null])).toStrictEqual([null]);
        })
    
        it("Should support arrays", () => {
            expect(XtkCaster.as(null, "array")).toStrictEqual([]);
            expect(XtkCaster.as(undefined, "array")).toStrictEqual([]);
            expect(XtkCaster.as(false, "array")).toStrictEqual([false]);
            expect(XtkCaster.as("Hello", "array")).toStrictEqual(["Hello"]);
            expect(XtkCaster.as([], "array")).toStrictEqual([]);
            expect(XtkCaster.as([null], "array")).toStrictEqual([null]);
        });
    });

    describe("Timespan test", () => {
        it("Should return timespan", () => {
            expect(XtkCaster.asTimespan(null)).toStrictEqual(0);
            expect(XtkCaster.asTimespan(undefined)).toStrictEqual(0);
            expect(XtkCaster.asTimespan(false)).toStrictEqual(0);
            expect(XtkCaster.asTimespan("Hello")).toStrictEqual(0);
            expect(XtkCaster.asTimespan([])).toStrictEqual(0);
            expect(XtkCaster.asTimespan([null])).toStrictEqual(0);
            expect(XtkCaster.asTimespan(NaN)).toStrictEqual(0);
            expect(XtkCaster.asTimespan(Number.POSITIVE_INFINITY)).toStrictEqual(0);
            expect(XtkCaster.asTimespan(Number.NEGATIVE_INFINITY)).toStrictEqual(0);
            expect(XtkCaster.asTimespan("86400")).toStrictEqual(86400);
            expect(XtkCaster.asTimespan(86400)).toStrictEqual(86400);
        })

        it("As should support 'timspan'", () => {
            expect(XtkCaster.as(null, "timespan")).toStrictEqual(0);
            expect(XtkCaster.as(undefined, "timespan")).toStrictEqual(0);
            expect(XtkCaster.as(false, "timespan")).toStrictEqual(0);
            expect(XtkCaster.as("Hello", "timespan")).toStrictEqual(0);
            expect(XtkCaster.as([], "timespan")).toStrictEqual(0);
            expect(XtkCaster.as([null], "timespan")).toStrictEqual(0);
            expect(XtkCaster.as("86400", "timespan")).toStrictEqual(86400);
            expect(XtkCaster.as(86400, "timespan")).toStrictEqual(86400);
        });

        it("As should support type 14", () => {
            expect(XtkCaster.as(null, 14)).toStrictEqual(0);
            expect(XtkCaster.as(undefined, 14)).toStrictEqual(0);
            expect(XtkCaster.as(false, 14)).toStrictEqual(0);
            expect(XtkCaster.as("Hello", 14)).toStrictEqual(0);
            expect(XtkCaster.as([], 14)).toStrictEqual(0);
            expect(XtkCaster.as([null], 14)).toStrictEqual(0);
            expect(XtkCaster.as("86400", 14)).toStrictEqual(86400);
            expect(XtkCaster.as(86400, 14)).toStrictEqual(86400);
        });
    })

    describe("Other string types", () => {
        it("Type 'html'", () => {
            expect(XtkCaster.as(null, "html")).toStrictEqual("");
            expect(XtkCaster.as(undefined, "html")).toStrictEqual("");
            expect(XtkCaster.as("Hello", "html")).toStrictEqual("Hello");
            expect(XtkCaster.as("0", "html")).toStrictEqual("0");
        });

        it("Type 'uuid'", () => {
            expect(XtkCaster.as(null, "uuid")).toStrictEqual("");
            expect(XtkCaster.as(undefined, "uuid")).toStrictEqual("");
            expect(XtkCaster.as("Hello", "uuid")).toStrictEqual("Hello");
            expect(XtkCaster.as("0", "uuid")).toStrictEqual("0");
        });

        it("Type 'blob'", () => {
            expect(XtkCaster.as(null, "blob")).toStrictEqual("");
            expect(XtkCaster.as(undefined, "blob")).toStrictEqual("");
            expect(XtkCaster.as("Hello", "blob")).toStrictEqual("Hello");
            expect(XtkCaster.as("0", "blob")).toStrictEqual("0");
        });

        it("Type 'int'", () => {
            expect(XtkCaster.as(null, "int")).toStrictEqual(0);
            expect(XtkCaster.as(undefined, "int")).toStrictEqual(0);
            expect(XtkCaster.as("42", "int")).toStrictEqual(42);
            expect(XtkCaster.as("0", "int")).toStrictEqual(0);
        });
    })

    describe("Primarykey type", () => {
        it("Should parse empty primary keys", () => {
            expect(XtkCaster.asPrimaryKey(null)).toBeUndefined();
            expect(XtkCaster.asPrimaryKey(undefined)).toBeUndefined();
            expect(XtkCaster.asPrimaryKey("")).toBeUndefined();
            // no schema
            expect(XtkCaster.asPrimaryKey("|")).toBeUndefined();
            expect(XtkCaster.asPrimaryKey("|xyz")).toBeUndefined();
        });

        it("Should parse simple keys", () => {
            expect(XtkCaster.asPrimaryKey("xtk:operator|123")).toMatchObject({ schemaId: "xtk:operator", values: [ "123" ] });
            expect(XtkCaster.asPrimaryKey("xtk:operator|")).toMatchObject({ schemaId: "xtk:operator", values: [ "" ] });
        });

        it("Should parse composite keys", () => {
            expect(XtkCaster.asPrimaryKey("xtk:operator|123|xyz")).toMatchObject({ schemaId: "xtk:operator", values: [ "123", "xyz" ] });
            expect(XtkCaster.asPrimaryKey("xtk:operator||xyz")).toMatchObject({ schemaId: "xtk:operator", values: [ "", "xyz" ] });
            expect(XtkCaster.asPrimaryKey("xtk:operator||xyz|")).toMatchObject({ schemaId: "xtk:operator", values: [ "", "xyz", "" ] });
        });

        it("Should handle escaping", () => {
            expect(XtkCaster.asPrimaryKey("xtk:operator|a\\|b")).toMatchObject({ schemaId: "xtk:operator", values: [ "a|b" ] });
            expect(XtkCaster.asPrimaryKey("xtk:operator|a\\|b\\|c")).toMatchObject({ schemaId: "xtk:operator", values: [ "a|b|c" ] });
            expect(XtkCaster.asPrimaryKey("xtk:operator|a\\\"b")).toMatchObject({ schemaId: "xtk:operator", values: [ "a\"b" ] });
            expect(XtkCaster.asPrimaryKey("xtk:operator|a\\|b\\\"c")).toMatchObject({ schemaId: "xtk:operator", values: [ "a|b\"c" ] });
        });

        it("Should convert to string", () => {
            expect(XtkCaster.asString({})).toBe("");
            expect(XtkCaster.asString({ schemaId: "xtk:operator", values: [ "123" ] })).toBe("xtk:operator|123");
            expect(XtkCaster.asString({ schemaId: "xtk:operator", values: [ "123", "xyz" ] })).toBe("xtk:operator|123|xyz");
            expect(XtkCaster.asString({ schemaId: "xtk:operator", values: [ "123", "" ] })).toBe("xtk:operator|123|");
            expect(XtkCaster.asString({ schemaId: "xtk:operator", values: [ "123", null ] })).toBe("xtk:operator|123|");
            expect(XtkCaster.asString({ schemaId: "xtk:operator", values: [ "123", undefined ] })).toBe("xtk:operator|123|");
            expect(XtkCaster.asString({ schemaId: "xtk:operator", values: [ "123", 123 ] })).toBe("xtk:operator|123|123");
            expect(XtkCaster.asString({ schemaId: "xtk:operator", values: [ "123", 0 ] })).toBe("xtk:operator|123|0");
            expect(XtkCaster.asString({ schemaId: "xtk:operator", values: [ "123", true ] })).toBe("xtk:operator|123|true");
            expect(XtkCaster.asString({ schemaId: "xtk:operator", values: [ "123", false ] })).toBe("xtk:operator|123|false");
        });

        it("Should support as()", () => {
            expect(XtkCaster.as({ schemaId: "xtk:operator", values: [ "123" ] }, "string")).toBe("xtk:operator|123");
            expect(XtkCaster.as({ schemaId: "xtk:operator", values: [ "123" ] }, "primarykey")).toMatchObject({ schemaId: "xtk:operator", values: [ "123" ] });
            expect(XtkCaster.as("xtk:operator|123", "primarykey")).toMatchObject({ schemaId: "xtk:operator", values: [ "123" ] });
        });

        it("Should test primary key type", () => {
            expect(XtkCaster.isPrimaryKey(undefined)).toBe(false);
            expect(XtkCaster.isPrimaryKey(null)).toBe(false);
            expect(XtkCaster.isPrimaryKey("")).toBe(false);
            expect(XtkCaster.isPrimaryKey(0)).toBe(false);
            expect(XtkCaster.isPrimaryKey(123)).toBe(false);
            expect(XtkCaster.isPrimaryKey({ schemaId: "nms:recipient" })).toBe(false);
            expect(XtkCaster.isPrimaryKey({ schemaId: "nms:recipient", values:null })).toBe(false);
            expect(XtkCaster.isPrimaryKey({ schemaId: "nms:recipient", values:"123" })).toBe(false);
            expect(XtkCaster.isPrimaryKey({ schemaId: "nms:recipient", values:[ "123" ]})).toBe(true);
            expect(XtkCaster.isPrimaryKey({ schemaId: "nms:recipient", values:[ ]})).toBe(true);
        });
    });

    it("Should check time type", () => {
        expect(XtkCaster.isTimeType(null)).toBe(false);
        expect(XtkCaster.isTimeType(undefined)).toBe(false);
        expect(XtkCaster.isTimeType(0)).toBe(false);
        expect(XtkCaster.isTimeType("")).toBe(false);
        expect(XtkCaster.isTimeType(6)).toBe(false);
        expect(XtkCaster.isTimeType("string")).toBe(false);
        expect(XtkCaster.isTimeType("int64")).toBe(false);
        expect(XtkCaster.isTimeType("uuid")).toBe(false);
        expect(XtkCaster.isTimeType(12)).toBe(false);
        expect(XtkCaster.isTimeType(13)).toBe(false);
        expect(XtkCaster.isTimeType("memo")).toBe(false);
        expect(XtkCaster.isTimeType("CDATA")).toBe(false);
        expect(XtkCaster.isTimeType("blob")).toBe(false);
        expect(XtkCaster.isTimeType("html")).toBe(false);
        expect(XtkCaster.isTimeType(1)).toBe(false);
        expect(XtkCaster.isTimeType(2)).toBe(false);
        expect(XtkCaster.isTimeType(3)).toBe(false);
        expect(XtkCaster.isTimeType(15)).toBe(false);
        expect(XtkCaster.isTimeType("byte")).toBe(false);
        expect(XtkCaster.isTimeType("short")).toBe(false);
        expect(XtkCaster.isTimeType("long")).toBe(false);
        expect(XtkCaster.isTimeType("int")).toBe(false);
        expect(XtkCaster.isTimeType("boolean")).toBe(false);
        expect(XtkCaster.isTimeType(4)).toBe(false);
        expect(XtkCaster.isTimeType(5)).toBe(false);
        expect(XtkCaster.isTimeType("float")).toBe(false);
        expect(XtkCaster.isTimeType("double")).toBe(false);
        expect(XtkCaster.isTimeType(7)).toBe(true);
        expect(XtkCaster.isTimeType(10)).toBe(true);
        expect(XtkCaster.isTimeType("datetime")).toBe(true);
        expect(XtkCaster.isTimeType("timestamp")).toBe(true);
        expect(XtkCaster.isTimeType("datetimetz")).toBe(true);
        expect(XtkCaster.isTimeType("datetimenotz")).toBe(true);
        expect(XtkCaster.isTimeType("date")).toBe(true);
        expect(XtkCaster.isTimeType(14)).toBe(true);
        expect(XtkCaster.isTimeType("time")).toBe(true);
        expect(XtkCaster.isTimeType("timespan")).toBe(true);
    });

    it("Should check string type", () => {
        expect(XtkCaster.isStringType(null)).toBe(false);
        expect(XtkCaster.isStringType(undefined)).toBe(false);
        expect(XtkCaster.isStringType(0)).toBe(false);
        expect(XtkCaster.isStringType("")).toBe(false);
        expect(XtkCaster.isStringType(6)).toBe(true);
        expect(XtkCaster.isStringType("string")).toBe(true);
        expect(XtkCaster.isStringType("int64")).toBe(false);
        expect(XtkCaster.isStringType("uuid")).toBe(false);
        expect(XtkCaster.isStringType(12)).toBe(true);
        expect(XtkCaster.isStringType(13)).toBe(true);
        expect(XtkCaster.isStringType("memo")).toBe(true);
        expect(XtkCaster.isStringType("CDATA")).toBe(true);
        expect(XtkCaster.isStringType("blob")).toBe(true);
        expect(XtkCaster.isStringType("html")).toBe(true);
        expect(XtkCaster.isStringType(1)).toBe(false);
        expect(XtkCaster.isStringType(2)).toBe(false);
        expect(XtkCaster.isStringType(3)).toBe(false);
        expect(XtkCaster.isStringType(15)).toBe(false);
        expect(XtkCaster.isStringType("byte")).toBe(false);
        expect(XtkCaster.isStringType("short")).toBe(false);
        expect(XtkCaster.isStringType("long")).toBe(false);
        expect(XtkCaster.isStringType("int")).toBe(false);
        expect(XtkCaster.isStringType("boolean")).toBe(false);
        expect(XtkCaster.isStringType(4)).toBe(false);
        expect(XtkCaster.isStringType(5)).toBe(false);
        expect(XtkCaster.isStringType("float")).toBe(false);
        expect(XtkCaster.isStringType("double")).toBe(false);
        expect(XtkCaster.isStringType(7)).toBe(false);
        expect(XtkCaster.isStringType(10)).toBe(false);
        expect(XtkCaster.isStringType("datetime")).toBe(false);
        expect(XtkCaster.isStringType("timestamp")).toBe(false);
        expect(XtkCaster.isStringType("datetimetz")).toBe(false);
        expect(XtkCaster.isStringType("datetimenotz")).toBe(false);
        expect(XtkCaster.isStringType("date")).toBe(false);
        expect(XtkCaster.isStringType(14)).toBe(false);
        expect(XtkCaster.isStringType("time")).toBe(false);
        expect(XtkCaster.isStringType("timespan")).toBe(false);
    });

    it("Should check number type", () => {
        expect(XtkCaster.isNumericType(null)).toBe(false);
        expect(XtkCaster.isNumericType(undefined)).toBe(false);
        expect(XtkCaster.isNumericType(0)).toBe(false);
        expect(XtkCaster.isNumericType("")).toBe(false);
        expect(XtkCaster.isNumericType(6)).toBe(false);
        expect(XtkCaster.isNumericType("string")).toBe(false);
        expect(XtkCaster.isNumericType("int64")).toBe(false);
        expect(XtkCaster.isNumericType("uuid")).toBe(false);
        expect(XtkCaster.isNumericType(12)).toBe(false);
        expect(XtkCaster.isNumericType(13)).toBe(false);
        expect(XtkCaster.isNumericType("memo")).toBe(false);
        expect(XtkCaster.isNumericType("CDATA")).toBe(false);
        expect(XtkCaster.isNumericType("blob")).toBe(false);
        expect(XtkCaster.isNumericType("html")).toBe(false);
        expect(XtkCaster.isNumericType(1)).toBe(true);
        expect(XtkCaster.isNumericType(2)).toBe(true);
        expect(XtkCaster.isNumericType(3)).toBe(true);
        expect(XtkCaster.isNumericType(15)).toBe(false);
        expect(XtkCaster.isNumericType("byte")).toBe(true);
        expect(XtkCaster.isNumericType("short")).toBe(true);
        expect(XtkCaster.isNumericType("long")).toBe(true);
        expect(XtkCaster.isNumericType("int")).toBe(true);
        expect(XtkCaster.isNumericType("boolean")).toBe(false);
        expect(XtkCaster.isNumericType(4)).toBe(true);
        expect(XtkCaster.isNumericType(5)).toBe(true);
        expect(XtkCaster.isNumericType("float")).toBe(true);
        expect(XtkCaster.isNumericType("double")).toBe(true);
        expect(XtkCaster.isNumericType(7)).toBe(false);
        expect(XtkCaster.isNumericType(10)).toBe(false);
        expect(XtkCaster.isNumericType("datetime")).toBe(false);
        expect(XtkCaster.isNumericType("timestamp")).toBe(false);
        expect(XtkCaster.isNumericType("datetimetz")).toBe(false);
        expect(XtkCaster.isNumericType("datetimenotz")).toBe(false);
        expect(XtkCaster.isNumericType("date")).toBe(false);
        expect(XtkCaster.isNumericType(14)).toBe(true);
        expect(XtkCaster.isNumericType("time")).toBe(false);
        expect(XtkCaster.isNumericType("timespan")).toBe(true);
    });
});
