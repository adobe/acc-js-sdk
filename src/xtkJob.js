/*
Copyright 2022 Adobe. All rights reserved.
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

const { CampaignException } = require("./campaign.js");
const { DomUtil } = require("./domUtil.js");
const { XtkCaster } = require("./xtkCaster.js");

/**
 * @namespace Campaign
 * 
 * @typedef {DOMElement} SoapMethodDefinition
 * @memberof Campaign
 */



/**
 * The complete Triforce, or one or more components of the Triforce.
 * @typedef {Object} XtkSoapCallSpec
 * @property {string} method - the Soap method name (without any schema information)
 * @property {string} xtkschema - the method schema id. It can be ommited if the object has a xtkschema property
 * @property {any} object - the object ("this") to call the method with, possibly null for static methods. Should implement the xtk:job interface
 * @property {Array} args - the list of arguments to the SOAP call
 * @property {(string|number)} [jobId] - the optional job id, which can be used for subsequent calls
 * @memberOf Campaign
 */

/**
 * @typedef {Object} XtkJobLog
 * @property {number} id - the job log id, which can be used for subsequent calls to getStatus
 * @property {number} iRc - the job return code (0 = ok)
 * @property {Date} logDate - the timestamp of the log
 * @property {number} logType - the level of the log message according
 * @property {string} message - the log message
 * @property {string} object - the log object
 * @property {string} errorCode - the log error code if any
 * @memberOf Campaign
 */


/**
 * @typedef {Object} XtkJobStatus
 * @property {number} status - the job status code, as defined in the xtk:job:jobStatus enumeration
 * @property {XtkJobLog[]} logs - the job log messages
 * @property {{key: string, value: string}} properties - job properties
 * @memberOf Campaign
 */

/**********************************************************************************
 *
 * Job Interface
 * Wraps the xtk:jobInterface interface into convenient JavaScript class
 *
 *********************************************************************************/
/**
 * @private
 * @class
 * @constructor
 * @memberof Campaign
 */
class XtkJobInterface {

    /**
     * Create a job interface from a client and a SOAP call definition. This method is not meant to be called directly, 
     * use client.jobInterface instead
     * @param {Campaign.Client} client the Client object to call Campaign API
     * @param {Campaign.XtkSoapCallSpec} soapCallSpec the definition of the SOAP call
     */
    constructor(client, soapCallSpec) {
        this._reset();
        this._client = client;
        this._soapCall = soapCallSpec;
        this._maxLogCount = 100; // default fetch size
        this.jobId = soapCallSpec ? soapCallSpec.jobId : undefined;
    }

    // Reset state before executing or submitting a job
    _reset() {
        this.jobId = undefined;
        this.status = undefined;
        this.result = undefined;
        this.lastLogId = 0;
        this.iRc = 0;
        this.lastErrorCode = undefined;
        this.firstErrorCode = undefined;
    }

    /**
     * Execute job synchronously (xtk:jobInterface#Execute). Expects the job to have been built with an object implementing the xtk:job interface,
     * for instance a delivery, and with the method to call (for instance "Prepare")
     * Static methods are not supported
     * @returns {string} a job id
     */
    async execute() {
        this._reset();
        const methodName = this._soapCall.method;
        const entitySchemaId = this._soapCall.xtkschema ? this._soapCall.xtkschema : (this._soapCall.object ? this._soapCall.object.xtkschema : undefined);
        if (!entitySchemaId)
            throw CampaignException.SOAP_UNKNOWN_METHOD(entitySchemaId, methodName, `No schema was provided in soap call or object`);
        const callContext = {
            client: this._client,
            object: this._soapCall.object,
            schemaId: 'xtk:jobInterface',
            entitySchemaId: entitySchemaId,
            headers: this._client._connectionParameters._options.extraHttpHeaders
        };
        var jobId = await callContext.client._callMethod("Execute", callContext, [ methodName ]);
        this.jobId = jobId;
        return jobId;
    }

    /**
     * Execute job asynchronously (xtk:jobInterface#Execute). Expects the job to have been built with an object implementing the xtk:job interface,
     * for instance a delivery, and with the method to call (for instance "Prepare")
     * Static methods are not supported
     * @returns {string} a job id
     */
     async submit() {
        this._reset();
        const methodName = this._soapCall.method;
        const entitySchemaId = this._soapCall.xtkschema ? this._soapCall.xtkschema : (this._soapCall.object ? this._soapCall.object.xtkschema : undefined);
        if (!entitySchemaId)
            throw CampaignException.SOAP_UNKNOWN_METHOD(entitySchemaId, methodName, `No schema was provided in soap call or object`);
        const callContext = {
            client: this._client,
            object: this._soapCall.object,
            schemaId: 'xtk:jobInterface',
            entitySchemaId: entitySchemaId,
            headers: this._client._connectionParameters._options.extraHttpHeaders
        };
        var jobId = await callContext.client._callMethod("Submit", callContext, [ this._soapCall.method ]);
        this.jobId = jobId;
        return jobId;
    }

    /**
     * Execute a SOAP call asynchronously (xtk:jobInterface#Execute). Expects the job to have been built with an object implementing the xtk:job interface,
     * for instance a delivery, and with the method to call (for instance "Prepare"). Can optionally pass parameters to the job.
     * Static methods are not supported
     * @returns {string} a job id
     */
     async submitSoapCall() {
        this._reset();
        const entitySchemaId = this._soapCall.xtkschema ? this._soapCall.xtkschema : (this._soapCall.object ? this._soapCall.object.xtkschema : undefined);
        const callContext = {
            client: this._client,
            object: this._soapCall.object,
            schemaId: 'xtk:jobInterface',
            entitySchemaId: entitySchemaId,
            headers: this._client._connectionParameters._options.extraHttpHeaders
        };
        const methodName = this._soapCall.method;
        var schema = await this._client.getSchema(entitySchemaId, "xml", true);
        if (!schema)
            throw CampaignException.SOAP_UNKNOWN_METHOD(entitySchemaId, methodName, `Schema '${entitySchemaId}' not found`);
        var method = await this._client._methodCache.get(entitySchemaId, methodName);
        if (!method)
            throw CampaignException.SOAP_UNKNOWN_METHOD(entitySchemaId, methodName, `Method '${methodName}' of schema '${entitySchemaId}' not found`);

        const isStatic = DomUtil.getAttributeAsBoolean(method, "static");

        var jobId = null;
        if ( !isStatic)
            jobId = await callContext.client._callMethod("SubmitSoapCall", callContext, [ {
                name: this._soapCall.method,
                service: this._soapCall.xtkschema,
                param: [
                    { name:"this", type:"DOMDocument", value: this._soapCall.object },
                    { name:"bStart", type:"boolean", value:"false" },
                ]
            } ]);
        else {
            // for non-persistant job, override object to intialize job properties
            callContext.object = {
                doNotPersist: "true",
                xtkschema: this._soapCall.xtkschema,
                id: this._soapCall.jobId,
                properties: {
                    warning: false,
                }
            };
            // SubmitSoapCall now supports static method
            // no need parameter type as it's already present in API definition
            jobId = await callContext.client._callMethod("SubmitSoapCall", callContext,
                    {                
                        name: this._soapCall.method,
                        service: this._soapCall.xtkschema,
                        param : this._soapCall.args
                    },
             );
        }
        this.jobId = jobId;
        return jobId;
    }

    /**
     * Poll the status of a job previously submitted with Execute, Submit, or SubmitSoapCall. The status is made of 3 objects: the status code,
     * logs, and job properties. Job Properties are arbitrary key value pairs set by the job, but also contains progress information.
     * This call will fetch the most recent status and logs and aggregate it with previously fetched statuses
     * @param {number|undefined} lastLogId the log id fetch logs from. If unspecified, this function will return the next batch of logs. If set to 0, will return logs from the beginning
     * @param {number|undefined} maxLogCount the max number of logs to fetch. Defaults to 100
     * @returns {Campaign.XtkJobStatus} an object containing the job status, all logs fetched so for, and job properties
     */
    async getStatus(lastLogId, maxLogCount) {
        if (lastLogId === undefined) lastLogId = this.lastLogId;
        if (maxLogCount === null || maxLogCount === undefined) maxLogCount = this._maxLogCount;
        var status = await this._client.NLWS.xtkJob.getStatus(this.jobId, lastLogId, maxLogCount);
        if (this._client._representation === "xml") {
            status[1] = this._client._toRepresentation(status[1], "SimpleJson");
            status[2] = this._client._toRepresentation(status[2], "SimpleJson");
        }
        status = this._makeJobStatus(status);
        this._updateStatus(status);
        return status;
    }

    // Aggregate new status with previously fetched status
    _updateStatus(status) {
        for (var i=0; i<status.logs.length; i++) {
            if (status.logs[i].id > this.lastLogId)
                this.lastLogId = status.logs[i].id;
        }
        if (this.status === undefined) {
            this.status = status;
        }
        else {
            const oldLogs = this.status.logs;
            this.status = status;
            this.status.logs = oldLogs.concat(this.status.logs);
        }
    }

    /**
     * Returns current progress of the job as a percentage (value between 0 and 1). This requires getStatus to have been called before
     * @returns {number} the current job progress as a percentage value
     */
    getProgress() {
        if (!this.status || !this.status.properties || !this.status.properties.progress) return 0;
        if (!this.status.properties.progress.max) return 0;
        return this.status.properties.progress.current / this.status.properties.progress.max;
    }

    /**
     * Get the result of a job, i.e. the value returned by the underlying SOAP call if it had been called directlty. 
     * Assumes that the job is successful. If not, this call will throw an exception
     * @returns {*} the job result
     */
    async getResult() {
        var result = await this._client.NLWS.xtkJob.getResult(this.jobId);
        result = this._makeJobResult(result);
        this.result = result;
        return result;
    }

    // Convert the job result into a typed object
    _makeJobResult(rawResult) {
        return rawResult;
    }

    // Convert job logs into a type object
    _makeLogs(rawLogs) {
        const logs = [];
        rawLogs = rawLogs || {};
        rawLogs = XtkCaster.asArray(rawLogs.log);
        for (var i=0; i<rawLogs.length; i++) {
            const rawLog = rawLogs[i];
            var message = XtkCaster.asString(rawLog.message);
            const match = message.match(/(\w{3}-\d{6})(.*)/);
            var errorCode = undefined;
            if (match && match.length >= 2) {
                errorCode = match[1];
                message = match[2] || "";
                message = message.trim();
            }
            rawLog.id = XtkCaster.asLong(rawLog.id);
            rawLog.iRc = XtkCaster.asLong(rawLog.iRc);
            rawLog.logDate = XtkCaster.asDatetime(rawLog.logDate);
            rawLog.logType = XtkCaster.asLong(rawLog.logType);
            rawLog.message = message;
            rawLog.object = XtkCaster.asString(rawLog.object);
            rawLog.errorCode = errorCode;
            logs.push(rawLog);

            if (errorCode) 
                this.lastErrorCode = errorCode;
            if (errorCode && !this.firstErrorCode)
                this.firstErrorCode = errorCode;
            if (rawLog.iRc != 0)
                this.iRc = rawLog.iRc;
        }
        return logs;
    }

    // Convert job properties into a typed object
    _makeProperties(rawProperties) {
        rawProperties = rawProperties || {};
        rawProperties.warning = XtkCaster.asBoolean(rawProperties.warning);
        if (!rawProperties.progress) rawProperties.progress = {};
        rawProperties.progress.current = XtkCaster.asLong(rawProperties.progress.current);
        rawProperties.progress.max = XtkCaster.asLong(rawProperties.progress.max);
        return rawProperties;
    }

    // Parse the result of GetStatus API. The result is an array of 3 object. The first is the status code,
    // followed by the the logs, and finally the properties
    _makeJobStatus(rawStatus) {
        if (!rawStatus) rawStatus = [];
        return {
            status: XtkCaster.asLong(rawStatus[0]),
            logs: this._makeLogs(rawStatus[1]),
            properties: this._makeProperties(rawStatus[2])
        };
    }

    /**
     * Cancel a preciously submitted job
     */
     async cancel() {
        await this._client.NLWS.xtkJob.cancel(this.jobId);
    }

    /**
     * Pause a preciously submitted job
     */
    async   pause() {
        await this._client.NLWS.xtkJob.pause(this.jobId);
    }
    
    /**
     * Waits until a job is actually cancelled
     * @param {number} timeoutSeconds in seconds
     */
     async waitJobCancelled(timeoutSeconds) {
        await this._client.NLWS.xtkJob.waitJobCancelled(this.jobId, timeoutSeconds);
    }

    /**
     * Queries if warnings or errors have been generated for this job
     * @return {boolean} Returns 'true' if there has been at least one warning or error message
     */
     async hasWarning() {
        return XtkCaster.asBoolean(await this._client.NLWS.xtkJob.hasWarning(this.jobId));
    }
}

// Public exports
exports.XtkJobInterface = XtkJobInterface;

})();
