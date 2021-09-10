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
 * Unit tests for the SOAP wrapper
 * 
 *********************************************************************************/

jest.mock('axios');
const axios = require('axios');

const request = require('../src/transport.js').request;

describe("Transport layer", () => {

    it("Should call successfull HTTP", async () => {
        axios.mockReturnValue(Promise.resolve({ data: "Ok" }));
        expect(await request({})).toBe("Ok");
    })

    it("Should call unsuccessful HTTP with response", async () => {
        axios.mockReturnValue(Promise.reject({ response:{ status:500, statusText:"Error", data:"No data" } }));
        await expect(request({ url: "http://" })).rejects.toMatchObject({ statusCode:500, statusText:"Error", data:"No data", request: { url: "http://" }});
    })

    it("Should call unsuccessful HTTP with non-HTTP error", async () => {
        axios.mockReturnValue(Promise.reject("Failed"));
        await expect(request({ url: "http://" })).rejects.toBe("Failed");
    })
});
