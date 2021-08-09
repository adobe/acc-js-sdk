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
            const nonStrict = !!expected[2];
            it('Should return the value casted as a timestamp ("' + value + '")', function() {
                const actual = XtkCaster.asTimestamp(value);
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
            const nonStrict = !!expected[2];
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

    it("variantStorageAttribute should return the field name where to store a variant value (for example in the xtk:option table)", () => {
        expect(XtkCaster.variantStorageAttribute(null)).toBe(null);
        expect(XtkCaster.variantStorageAttribute(undefined)).toBe(null);
        expect(XtkCaster.variantStorageAttribute(0)).toBe(null);
        expect(XtkCaster.variantStorageAttribute("")).toBe(null);
        expect(XtkCaster.variantStorageAttribute(6)).toBe("stringValue");
        expect(XtkCaster.variantStorageAttribute("string")).toBe("stringValue");
        expect(XtkCaster.variantStorageAttribute("int64")).toBe("stringValue");
        expect(XtkCaster.variantStorageAttribute(12)).toBe("memoValue");
        expect(XtkCaster.variantStorageAttribute(13)).toBe("memoValue");
        expect(XtkCaster.variantStorageAttribute("memo")).toBe("memoValue");
        expect(XtkCaster.variantStorageAttribute("CDATA")).toBe("memoValue");
        expect(XtkCaster.variantStorageAttribute(1)).toBe("longValue");
        expect(XtkCaster.variantStorageAttribute(2)).toBe("longValue");
        expect(XtkCaster.variantStorageAttribute(3)).toBe("longValue");
        expect(XtkCaster.variantStorageAttribute(15)).toBe("longValue");
        expect(XtkCaster.variantStorageAttribute(4)).toBe("doubleValue");
        expect(XtkCaster.variantStorageAttribute(5)).toBe("doubleValue");
        expect(XtkCaster.variantStorageAttribute("float")).toBe("doubleValue");
        expect(XtkCaster.variantStorageAttribute("double")).toBe("doubleValue");
        expect(XtkCaster.variantStorageAttribute(7)).toBe("timeStampValue");
        expect(XtkCaster.variantStorageAttribute(10)).toBe("timeStampValue");
        expect(XtkCaster.variantStorageAttribute("datetime")).toBe("timeStampValue");
        expect(XtkCaster.variantStorageAttribute("datetimetz")).toBe("timeStampValue");
        expect(XtkCaster.variantStorageAttribute("datetimenotz")).toBe("timeStampValue");
        expect(XtkCaster.variantStorageAttribute("date")).toBe("timeStampValue");
        expect(() => { XtkCaster.variantStorageAttribute(777); }).toThrow("Cannot get variant storage");
    });
});
