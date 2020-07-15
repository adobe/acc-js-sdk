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

module.exports = {
  rootDir: '..',
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      lines: 100,
      statements: 100
    }
  },
  reporters: [
    'default',
    'jest-junit'
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: [/*
    '<rootDir>/test/jest/jest.setup.js',
    // remove any of the lines below if you don't want to use any of the mocks
    '<rootDir>/test/jest/jest.fetch.setup.js',
    '<rootDir>/test/jest/jest.fs.setup.js',
    '<rootDir>/test/jest/jest.swagger.setup.js',
    '<rootDir>/test/jest/jest.fixture.setup.js'*/
  ]
}
