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

const { Util } = require("./util.js");

/**
 * @namespace Campaign
 */

/**
 * @class
 * @constructor
 * @memberof Campaign
 */
 class CampaignException {

  static INVALID_CREDENTIALS_TYPE(type, details)          { return new CampaignException(undefined, 400, 16384, `SDK-000000 Invalid credentials type '${type}'`, details); }
  static CANNOT_GET_CREDENTIALS_USER(type)                { return new CampaignException(undefined, 400, 16384, `SDK-000001 Cannot get user for Credentials of type '${type}'`); }
  static CANNOT_GET_CREDENTIALS_PASSWORD(type)            { return new CampaignException(undefined, 400, 16384, `SDK-000002 Cannot get password for Credentials of type '${type}'`); }
  static INVALID_CONNECTION_OPTIONS(options)              { return new CampaignException(undefined, 400, 16384, `SDK-000003 Invalid options parameter (type '${typeof options}'). An object literal is expected`); }
  static INVALID_REPRESENTATION(representation, details)  { return new CampaignException(undefined, 400, 16384, `SDK-000004 Invalid representation '${representation}'.`, details); }
  static CREDENTIALS_FOR_INVALID_EXT_ACCOUNT(name, type)  { return new CampaignException(undefined, 400, 16384, `SDK-000005 Cannot create connection parameters for external account '${name}': account type ${type} not supported`); }
  static BAD_PARAMETER(name, value, details)              { return new CampaignException(undefined, 400, 16384, `SDK-000006 Bad parameter '${name}' with value '${value}'`, details); }
  static UNEXPECTED_SOAP_RESPONSE(call, details)          { return new CampaignException(     call, 500,   -53, `SDK-000007 Unexpected response from SOAP call`, details); }
  static BAD_SOAP_PARAMETER(call, name, value, details)   { return new CampaignException(     call, 400, 16384, `SDK-000008 Bad parameter '${name}' with value '${value}'`, details); }
  static SOAP_UNKNOWN_METHOD(schema, method, details)     { return new CampaignException(undefined, 400, 16384, `SDK-000009 Unknown method '${method}' of schema '${schema}'`, details); }
  static NOT_LOGGED_IN(call, details)                     { return new CampaignException(     call, 400, 16384, `SDK-000010 Cannot call API because client is not logged in`, details); }
  static DECRYPT_ERROR(details)                           { return new CampaignException(undefined, 400, 16384, `SDK-000011 "Cannot decrypt password: password marker is missing`, details); }
  static SESSION_EXPIRED()                                { return new CampaignException(undefined, 401, 16384, `SDK-000012 "Session has expired or is invalid. Please reconnect.`); }
  static FILE_UPLOAD_FAILED(name, details)                { return new CampaignException(undefined, 500, 16384, `SDK-000013 "Failed to upload file ${name}`, details); }
  static REPORT_FETCH_FAILED(name, details)               { return new CampaignException(undefined, 500, 16384, `SDK-000014 Failed to fetch report ${name}`, details); }
  static FEATURE_NOT_SUPPORTED(name)                      { return new CampaignException(undefined, 500, 16384, `SDK-000015 ${name} feature is not supported by the ACC instance`); }
  static REQUEST_ABORTED( )                               { return new CampaignException(undefined, 500,   -53, `SDK-000016 Request was aborted by the client`); }
  static AEM_ASSET_UPLOAD_FAILED(details, statusCode=500) { return new CampaignException(undefined, statusCode, 16384, `SDK-000017 Failed to upload AEM asset`, details); }
  static FILE_DOWNLOAD_FAILED(name, details)              { return new CampaignException(undefined, 500, 16384, `SDK-000018 "Failed to download file ${name}`, details); }

  /**
   * Returns a short description of the exception
   * @returns {string} a short description of the exception
   */
  toString() {
      return this.message;
  }

  /**
   * Represents a Campaign exception, i.e. any kind of error that can happen when calling Campaign APIs,
   * ranging from HTTP errors, XML serialization errors, SOAP errors, authentication errors, etc.
   *
   * Members of this object are trimmed, and all session tokens, security tokens, passwords, etc. are replaced by "***"
   *
   * @param {SoapMethodCall|request} call the call that triggered the error. It can be a SoapMethodCall object, a HTTP request object, or even be undefined if the exception is generated outside of the context of a call
   * @param {number} statusCode the HTTP status code (200, 500, etc.)
   * @param {string} faultCode the fault code, i.e. an error code
   * @param {string} faultString a short description of the error
   * @param {string} detail a more detailed description of the error
   * @param {Error|string} cause an optional error object representing the cause of the exception
   */
  constructor(call, statusCode, faultCode, faultString, detail, cause) {
      // Provides a shorter and more friendly description of the call and method name
      // depending on whether the exception is thrown by a SOAP or HTTP call
      var methodCall;
      var methodName;
      if (call) {
          const ctor = Object.getPrototypeOf(call).constructor;
          if (ctor && ctor.name == "SoapMethodCall") {
              methodCall = {
                  type: "SOAP",
                  url: call.request ? call.request.url : undefined,
                  urn: call.urn,                              // Campaign schema id (ex: "xtk:session")
                  methodName: call.methodName,
                  request: call.request,                      // raw text of SOAP request
                  response: call.response                     // raw text of SOAP response
              };
              methodName = `${call.urn}#${call.methodName}`;  // Example: "xtk:session#Logon"
          }
          else {
              // HTTP call
              // Extract the path of the request URL if there's one
              // If it's a relative URL, use the URL itself
              // https://test.com/hello => "/hello"
              // /r/test => "/r/test“
              // https://test.com => ""
              var path = call.request.url || "";
              var index = path.indexOf('://');
              if (index >= 0) {
                  path = path.substring(index+3);
                  index = path.indexOf('/');
                  if (index >= 0)
                      path = path.substring(index);
                  else
                      path = "";
              }
              methodCall = {
                  type: "HTTP",
                  urn: "",
                  url: call.request.url,
                  methodName: path,
                  request: call.request,                      // the "options" object making up the HTTP request
                  response: call.response                     // the raw response text
              };
              methodName = path;
          }
      }

      // Provides default and fix edge cases for fault code, string and details
      faultString = faultString || "";
      if (faultString == "null" || faultString == "null\n") faultString = "";
      detail = detail || "";
      faultCode = faultCode || "";
      if (statusCode == 403 && faultString == "")
          faultString = "Forbidden";

      // Compose a user firendly user message
      var errorMessage = "No error message was provided";
      if (faultString != "" && detail != "")
          errorMessage = `${faultString}. ${detail}`;
      else if (faultString != "")
          errorMessage = faultString;
      else  if (detail != "")
          errorMessage = detail;
      var message = `${statusCode} - Error${faultCode == "" ? "" : " " + faultCode}`;
      if (methodName && methodName != "")
          message = message + ` calling method '${methodName}'`;
          message = message + `: ${errorMessage}`;

      // Extract Campaign error code. For instance, the fault string may look like
      // "XSV-350013 The '193.104.215.11' IP address via which...", we extract the "XSV-350013" code
      var errorCode = "";
      const match = faultString.match(/(\w{3}-\d{6})(.*)/);
      if (match && match.length >= 2) {
          errorCode = match[1];
          faultString = match[2] || "";
          faultString = faultString.trim();
      }

      /**
       * The type of exception, always "CampaignException"
       * @type {string}
       */
      this.name = "CampaignException";
      /**
       * A human friendly message describing the error
       * @type {string}
       */
      this.message = message;
      /**
       * The HTTP status code corresponding to the error
       * @type {number}
       */
      this.statusCode = statusCode;
      /**
       * An object describing the call (SOAP or HTTP) which caused the exception. Can be null
       * @type {string}
       */
      this.methodCall = methodCall;
      /**
       * A Campaign-specific error code, such as XSV-350013. May not be set if the exception did not come from a SOAP call
       * @type {string}
       */
      this.errorCode = errorCode;
      /**
       * An error code
       * @type {string}
       */
      this.faultCode = faultCode;
      /**
       * A short description of the error
       * @type {string}
       */
      this.faultString = faultString;
      /**
       * A detailed description of the error
       * @type {string}
       */
      this.detail = detail;
      /**
       * The cause of the error, such as the root cause exception
       */
      this.cause = cause;

      // Remove trailing space, and replace tokens by ***
      for (const p in this) {
        if (p != "cause") {
          var text = this[p];
          this[p] = Util.trim(text);
        }
      }
  }
}



/**
 * Creates a CampaignException for a SOAP call and from a root exception
 *
 * @private
 * @param {SoapMethodCall} call the SOAP call
 * @param {*} err the exception causing the SOAP call.
 * @returns {CampaignException} a CampaignException object wrapping the error
 * @memberof Campaign
 */
function makeCampaignException(call, err) {
  // It's already a CampaignException
  if (err instanceof CampaignException)
      return err;

  if (err && err.name == "AbortError") 
        throw CampaignException.REQUEST_ABORTED();
 
  // Wraps DOM exceptions which can occur when dealing with malformed XML
  const ctor = Object.getPrototypeOf(err).constructor;
  if (ctor && ctor.name == "DOMException") {
      return new CampaignException(call, 500, err.code, `DOMException (${err.name})`, err.message, err);
  }

  if (err.statusCode && ctor && ctor.name == "HttpError") {
    var faultString = err.statusText;
    var details = typeof err.data == 'object' ? JSON.stringify(err.data) : err.data;
    if (!faultString) {
      faultString = typeof err.data == 'object' ? JSON.stringify(err.data) : err.data;
      details = undefined;
    }

    // Session expiration case must return a 401
    if (err.data && typeof err.data == 'string' && err.data.indexOf(`XSV-350008`) != -1)
        return CampaignException.SESSION_EXPIRED();
    return new CampaignException(call, err.statusCode, "", faultString, details, err);
  }

  // Wraps other type of exceptions, including when a String is used as an exception
  const statusCode = err.statusCode || 500;
  var error = err.error || err.message;
  if (ctor.name == "String")
      error = err;
  else
      error = `${ctor.name} (${error})`;
    return new CampaignException(call, statusCode, "", error, undefined, err);
}

exports.CampaignException = CampaignException;
exports.makeCampaignException = makeCampaignException;

/**********************************************************************************
 *
 * Business constants and helpers
 *
 *********************************************************************************/

// Ignore constant definitions from coverage
/* istanbul ignore file */

// Public exports

exports.WORKFLOW_STATE_EDITION     = 0;
exports.WORKFLOW_STATE_RUNNING     = 2;
exports.WORKFLOW_STATE_STARTED     = 3;
exports.WORKFLOW_STATE_TESTING     = 9;
exports.WORKFLOW_STATE_STARTING    = 10;
exports.WORKFLOW_STATE_STARTED     = 11;
exports.WORKFLOW_STATE_PAUSING     = 12;
exports.WORKFLOW_STATE_PAUSED      = 13;
exports.WORKFLOW_STATE_RESUMING    = 14;
exports.WORKFLOW_STATE_STOPPING    = 15;
exports.WORKFLOW_STATE_STOPPING2   = 16;
exports.WORKFLOW_STATE_RESTARTING  = 17;
exports.WORKFLOW_STATE_RESTARTING2 = 18;
exports.WORKFLOW_STATE_STOPPED     = 20;
exports.WORKFLOW_STATE_FINISHED    = 20;

exports.WORKFLOW_STARTSTATE_UNDEFINED = 0;
exports.WORKFLOW_STARTSTATE_STARTING  = 1;

exports.OPERATION_STATUS_ALL       = -1;
exports.OPERATION_STATUS_EDITION   = 0;
exports.OPERATION_STATUS_STARTED   = 1;
exports.OPERATION_STATUS_FINISHED  = 2;
exports.OPERATION_STATUS_CANCELING = 3;
exports.OPERATION_STATUS_CANCELED  = 4;

exports.OPERATION_CANCELSTATE_UNDEFINED  = 0;
exports.OPERATION_CANCELSTATE_CANCELING  = 3;
exports.OPERATION_CANCELSTATE_CANCELED   = 4;

exports.OPERATION_BUDGETSTATUS_EDITION  = 0;
exports.OPERATION_BUDGETSTATUS_DEFINED  = 1;
exports.OPERATION_BUDGETSTATUS_FINISHED = 2;

exports.OPERATION_LOG_TYPE_ERROR   = 0;
exports.OPERATION_LOG_TYPE_WARNING = 1;
exports.OPERATION_LOG_TYPE_INFO    = 2;
exports.OPERATION_LOG_TYPE_STATUS  = 3;
exports.OPERATION_LOG_TYPE_VERBOSE = 4;

exports.OPERATION_TYPE_UNIQUE      = 0;
exports.OPERATION_TYPE_RECURRENT   = 1;
exports.OPERATION_TYPE_PERIODIC    = 2;

exports.TASK_STATUS_EDITION        = 0;
exports.TASK_STATUS_FORECASTED     = 1;
exports.TASK_STATUS_STARTED        = 2;
exports.TASK_STATUS_FINISHED       = 3;
exports.TASK_STATUS_CANCELED       = 4;
exports.TASK_STATUS_PENDING        = 5;
exports.TASK_STATUS_VALIDATED      = 6;
exports.TASK_STATUS_REFUSED        = 7;

exports.TASK_PRIORITY_NORMAL    = 1;

exports.TASK_TYPE_TASK          = 0;
exports.TASK_TYPE_MILESTONE     = 1;
exports.TASK_TYPE_GROUPING      = 2;
exports.TASK_TYPE_NOTIFICATION  = 3;
exports.TASK_TYPE_ASSET         = 4;

exports.TASK_VALIDATIONTYPE_TARGET     = 0;
exports.TASK_VALIDATIONTYPE_CONTENT    = 1;
exports.TASK_VALIDATIONTYPE_BUDGET     = 2;
exports.TASK_VALIDATIONTYPE_EXTRACTION = 3;
exports.TASK_VALIDATIONTYPE_FCP        = 4;
exports.TASK_VALIDATIONTYPE_SANDBOX    = 5;
exports.TASK_VALIDATIONTYPE_AVAILABLE  = 6;
exports.TASK_VALIDATIONTYPE_EXTERNAL   = 7;

exports.TASK_VALIDATIONSTATE_UNDEFINED  = 0;
exports.TASK_VALIDATIONSTATE_VALIDATED  = 1;
exports.TASK_VALIDATIONSTATE_REFUSED    = 2;

exports.TASK_NTF_INITIAL      = 0;
exports.TASK_NTF_TASK         = 1;
exports.TASK_NTF_FINISHED     = 2;
exports.TASK_NTF_CANCELED     = 3;
exports.TASK_NTF_RES_FINISHED = 4;
exports.TASK_NTF_RES_CANCELED = 5;
exports.TASK_NTF_VALIDATED    = 6;
exports.TASK_NTF_REFUSED      = 7;
exports.TASK_NTF_ALERT        = 8;

exports.TASK_FILTER_ALL       = 50;
exports.TASK_FILTER_LATE      = 51;

exports.DELIVERY_FILTER_ALL        = 0;
exports.DELIVERY_FILTER_EDITION    = 1;
exports.DELIVERY_FILTER_TOVALIDATE = 2;
exports.DELIVERY_FILTER_STARTED    = 3;
exports.DELIVERY_FILTER_FINISHED   = 4;
exports.DELIVERY_FILTER_FAILED     = 5;
exports.DELIVERY_FILTER_CANCELED   = 6;

exports.DELIVERY_STATE_EDITION           = 0;
exports.DELIVERY_STATE_TARGETPENDING     = 11;
exports.DELIVERY_STATE_TARGETSELECTION   = 12;
exports.DELIVERY_STATE_TARGETARBITRATION = 13;
exports.DELIVERY_STATE_TARGETREADY       = 15;
exports.DELIVERY_STATE_MSGPREPENDING     = 21;
exports.DELIVERY_STATE_PREPARATION       = 22;
exports.DELIVERY_STATE_MESSAGEFINISHED   = 25;
exports.DELIVERY_STATE_PREPAREFAILED     = 37;
exports.DELIVERY_STATE_READY             = 45;
exports.DELIVERY_STATE_DELAYED           = 51;
exports.DELIVERY_STATE_STARTED           = 55;
exports.DELIVERY_STATE_RETRYPENDING      = 61;
exports.DELIVERY_STATE_RETRY             = 62;
exports.DELIVERY_STATE_CANCELPENDING     = 81;
exports.DELIVERY_STATE_CANCEL            = 85;
exports.DELIVERY_STATE_PAUSEPENDING      = 71;
exports.DELIVERY_STATE_PAUSE             = 75;
exports.DELIVERY_STATE_FINISHED          = 95;
exports.DELIVERY_STATE_DELETED           = 100;

exports.DELIVERY_STATUS_CANCELED = 4;

exports.DELIVERY_DELETE_STATUS_DELETED   = 2;

exports.DELIVERY_MESSAGETYPE_EMAIL     = 0;
exports.DELIVERY_MESSAGETYPE_SMS       = 1;
exports.DELIVERY_MESSAGETYPE_PHONE     = 2;
exports.DELIVERY_MESSAGETYPE_PAPER     = 3;
exports.DELIVERY_MESSAGETYPE_FAX       = 4;
exports.DELIVERY_MESSAGETYPE_AGENCY    = 5;
exports.DELIVERY_MESSAGETYPE_FACEBOOK  = 20;
exports.DELIVERY_MESSAGETYPE_TWITTER   = 25;
exports.DELIVERY_MESSAGETYPE_MOBILEAPP = 40;
exports.DELIVERY_MESSAGETYPE_IOS       = 41;
exports.DELIVERY_MESSAGETYPE_ANDROID   = 42;
exports.DELIVERY_MESSAGETYPE_OTHER     = 120;

exports.DELIVERY_PUBLICATION_STATUS_NOTAPPLICABLE = 0;
exports.DELIVERY_PUBLICATION_STATUS_EDITION = 1;
exports.DELIVERY_PUBLICATION_STATUS_DEPLOYED = 2;
exports.DELIVERY_PUBLICATION_STATUS_FAILED = 3;
exports.DELIVERY_PUBLICATION_STATUS_PRODUCTION = 100;

exports.MESSAGE_TYPE_TASK   = 9;

exports.DELIVERY_STATUS_IGNORED = 0;
exports.DELIVERY_STATUS_SENT    = 1;
exports.DELIVERY_STATUS_TOSENT  = 6;

exports.DELIVERY_MODE_EXTERNAL    = 0;
exports.DELIVERY_MODE_BULK        = 1;
exports.DELIVERY_MODE_DESCRIPTIVE = 2;
exports.DELIVERY_MODE_MIDSOURCING = 4;

exports.DELIVERY_KPI_ERROR_THRESHOLD = 85;
exports.DELIVERY_KPI_WARNING_THRESHOLD = 95;

exports.FAILURE_RAISON_CONTROL = 127;

exports.MESSAGE_TYPE_ALL = 127;

exports.VALIDATION_MODE_AUTO   = 0;
exports.VALIDATION_MODE_MANUAL = 1;

exports.DEFAULT_MAX_RUNNINGS = 10;

exports.DEFAULT_MAX_DEL_PREP = 7;

exports.TIME_RANGE_DAY =        0;
exports.TIME_RANGE_FORECASTED = 1;

exports.STOCKLINE_TYPE_REAL    = 0;
exports.STOCKLINE_TYPE_ORDER   = 1;
exports.STOCKLINE_TYPE_CONSUME = 2;

exports.CONTENT_STATUS_EDITION             = 0;
exports.CONTENT_STATUS_INWAITING           = 1;
exports.CONTENT_STATUS_VALIDATED           = 2;
exports.CONTENT_STATUS_REFUSED             = 3;
exports.CONTENT_STATUS_FCP_INWAITING       = 4;
exports.CONTENT_STATUS_FCP_VALIDATED       = 5;
exports.CONTENT_STATUS_FCP_REFUSED         = 6;
exports.CONTENT_STATUS_INPROGRESS          = 10;
exports.CONTENT_STATUS_AVAILABLE           = 11;
exports.CONTENT_STATUS_EXTERNAL_INWAITING  = 15;
exports.CONTENT_STATUS_EXTERNAL_REFUSED    = 16;

exports.TARGET_STATUS_EDITION   = 0;
exports.TARGET_STATUS_INWAITING = 1;
exports.TARGET_STATUS_VALIDATED = 2;
exports.TARGET_STATUS_REFUSED   = 3;

exports.BUDGET_STATUS_EDITION   = 0;
exports.BUDGET_STATUS_INWAITING = 1;
exports.BUDGET_STATUS_VALIDATED = 2;
exports.BUDGET_STATUS_REFUSED   = 3;

exports.COMPUTATION_STATE_UNDEFINED  = 0;
exports.COMPUTATION_STATE_INWAITING  = 1;
exports.COMPUTATION_STATE_INPROCESS  = 2;
exports.COMPUTATION_STATE_FINISHED   = 3;

exports.EXTRACTION_STATUS_EDITION   = 0;
exports.EXTRACTION_STATUS_INWAITING = 1;
exports.EXTRACTION_STATUS_VALIDATED = 2;
exports.EXTRACTION_STATUS_REFUSED   = 3;
exports.EXTRACTION_STATUS_SENT      = 4;

exports.SANDBOX_STATUS_EDITION   = 0;
exports.SANDBOX_STATUS_INWAITING = 1;
exports.SANDBOX_STATUS_VALIDATED = 2;
exports.SANDBOX_STATUS_REFUSED   = 3;

exports.VALIDATION_TYPE_TARGET           = 0;
exports.VALIDATION_TYPE_CONTENT          = 1;
exports.VALIDATION_TYPE_BUDGET           = 2;
exports.VALIDATION_TYPE_EXTRACTION       = 3;
exports.VALIDATION_TYPE_FCP              = 4;
exports.VALIDATION_TYPE_SANDBOX          = 5;
exports.VALIDATION_TYPE_AVAILABLE        = 6;
exports.VALIDATION_TYPE_EXTERNAL         = 7;
exports.VALIDATION_TYPE_STARTING         = 9;
exports.VALIDATION_TYPE_MANUAL           = 10;
exports.VALIDATION_TYPE_SUBMITFCP        = 11;
exports.VALIDATION_TYPE_SUBMITCONTENT    = 12;
exports.VALIDATION_TYPE_SUBMITEDITION    = 13;
exports.VALIDATION_TYPE_VALIDATION       = 20;
exports.VALIDATION_TYPE_PUBLICATION      = 21;
exports.VALIDATION_TYPE_CANCELLATION     = 22;
exports.VALIDATION_TYPE_RESERVATION      = 23;
exports.VALIDATION_TYPE_FORMAT           = 24;
exports.VALIDATION_TYPE_SUBMITBUDGET     = 25;
exports.VALIDATION_TYPE_LOCK             = 30;
exports.VALIDATION_TYPE_UNLOCK           = 31;

exports.ASSET_STATUS_EDITION              = 0;
exports.ASSET_STATUS_VALIDATIONPENDING    = 1;
exports.ASSET_STATUS_INPROCESS            = 2;
exports.ASSET_STATUS_VALIDATED            = 3;
exports.ASSET_STATUS_REFUSED              = 4;
exports.ASSET_STATUS_PUBLICATIONPENDING   = 5;
exports.ASSET_STATUS_PUBLICATIONINPROCESS = 6;
exports.ASSET_STATUS_PUBLISHED            = 7;
exports.ASSET_STATUS_CANCELED             = 8;

exports.DATATRANSFER_STATUS_EDITION   = 0;
exports.DATATRANSFER_STATUS_RUNNING   = 2;
exports.DATATRANSFER_STATUS_CANCELING = 3;
exports.DATATRANSFER_STATUS_CANCELED  = 4;
exports.DATATRANSFER_STATUS_FINISHED  = 5;
exports.DATATRANSFER_STATUS_ERROR     = 6;
exports.DATATRANSFER_STATUS_PAUSING   = 7;
exports.DATATRANSFER_STATUS_PAUSED    = 8;

exports.COSTLINE_TYPE_PLANNED    = 0;
exports.COSTLINE_TYPE_RESERVED   = 1;
exports.COSTLINE_TYPE_COMMITTED  = 2;
exports.COSTLINE_TYPE_EXPENSED   = 3;

exports.VALIDATIONLOG_ACTION_VALIDATED = 0;
exports.VALIDATIONLOG_ACTION_REFUSED   = 1;
exports.VALIDATIONLOG_ACTION_CANCELED  = 2;

exports.MEASURE_TYPE_WITHOUTCONTROL = 0;
exports.MEASURE_TYPE_WITHCONTROL    = 1;

exports.HYPOTHESIS_STATE_EDITION   = 0;
exports.HYPOTHESIS_STATE_WAITING   = 1;
exports.HYPOTHESIS_STATE_STARTED   = 2;
exports.HYPOTHESIS_STATE_FINISHED  = 3;
exports.HYPOTHESIS_STATE_ERROR     = 4;

exports.OPERATOR_TYPE_OP    = 0;
exports.OPERATOR_TYPE_GROUP = 1;
exports.OPERATOR_TYPE_RIGHT = 2;

exports.WORKFLOWTASK_STATUS_PENDING = 0;
exports.WORKFLOWTASK_STATUS_COMPLETED = 1;

exports.MOBILE_MSGTYPE_SMS     = 0;
exports.MOBILE_MSGTYPE_WAPPUSH = 1;
exports.MOBILE_MSGTYPE_MMS     = 2;

exports.CATALOG_STATUS_EDITION              = 0;
exports.CATALOG_STATUS_VALIDATIONPENDING    = 1;
exports.CATALOG_STATUS_INPROCESS            = 2;
exports.CATALOG_STATUS_VALIDATED            = 3;
exports.CATALOG_STATUS_REFUSED              = 4;
exports.CATALOG_STATUS_PUBLISHED            = 7;
exports.CATALOG_STATUS_CANCELED             = 8;

exports.CATALOG_VALIDATIONMODE_MANUAL  = 0;
exports.CATALOG_VALIDATIONMODE_AUTO    = 1;

exports.CENTRALLOCAL_TYPE_LOCAL      = 0;
exports.CENTRALLOCAL_TYPE_MUTUALIZED = 1;

exports.CENTRALLOCAL_MODE_CENTRALIZED  = 0;
exports.CENTRALLOCAL_MODE_LOCALIZEDOP  = 1;
exports.CENTRALLOCAL_MODE_LOCALIZEDWEB = 2;
exports.CENTRALLOCAL_MODE_DISTRIBUTED  = 3;

exports.LOCALORDER_STATUS_PROOF     = 0;
exports.LOCALORDER_STATUS_RESERVED  = 1;
exports.LOCALORDER_STATUS_VALIDATED = 2;
exports.LOCALORDER_STATUS_REFUSED   = 6;
exports.LOCALORDER_STATUS_AVAILABLE = 3;
exports.LOCALORDER_STATUS_CANCELED  = 4;
exports.LOCALORDER_STATUS_ERROR     = 5;

exports.LOCALVALIDATIONLOG_STATUS_INWAITING = 0;
exports.LOCALVALIDATIONLOG_STATUS_VALIDATED = 1;
exports.LOCALVALIDATIONLOG_STATUS_REFUSED = 2;

exports.LOCALDISTRIBUTION_VALIDATIONMODE_MANUAL    = 0;
exports.LOCALDISTRIBUTION_VALIDATIONMODE_AUTOMATIC = 1;

exports.OPERATION_WEBAPPTYPE_NONE      = 0;
exports.OPERATION_WEBAPPTYPE_DEFAULT   = 1;
exports.OPERATION_WEBAPPTYPE_USER      = 2;
exports.OPERATION_WEBAPPTYPE_EXTERNAL  = 3;

exports.RESOURCE_TYPE_FILE = 0;

exports.SIMULATION_STATUS_EDIT         = 0;
exports.SIMULATION_STATUS_PENDING      = 1;
exports.SIMULATION_STATUS_RUNNING      = 2;
exports.SIMULATION_STATUS_CANCELING    = 3;
exports.SIMULATION_STATUS_CANCELED     = 4;
exports.SIMULATION_STATUS_FINISHED     = 5;
exports.SIMULATION_STATUS_ERROR        = 6;
exports.SIMULATION_STATUS_PAUSEPENDING = 7;
exports.SIMULATION_STATUS_PAUSE        = 8;

exports.HYPOTHESIS_STATUS_EDIT         = 0;
exports.HYPOTHESIS_STATUS_PENDING      = 1;
exports.HYPOTHESIS_STATUS_RUNNING      = 2;
exports.HYPOTHESIS_STATUS_CANCELING    = 3;
exports.HYPOTHESIS_STATUS_CANCELED     = 4;
exports.HYPOTHESIS_STATUS_FINISHED     = 5;
exports.HYPOTHESIS_STATUS_ERROR        = 6;
exports.HYPOTHESIS_STATUS_PAUSEPENDING = 7;
exports.HYPOTHESIS_STATUS_PAUSE        = 8;

exports.HYPOTHESIS_TYPE_DELIVERY = 0;
exports.HYPOTHESIS_TYPE_OFFER    = 1;
exports.HYPOTHESIS_TYPE_ALL      = 127;

exports.WEBAPP_STATE_EDITION   = 0;
exports.WEBAPP_STATE_TOPUBLISH = 5;
exports.WEBAPP_STATE_PROD      = 10;
exports.REPORT_STATE_PROD      = 10;

exports.SANDBOXMODE_COMPLETE   = 0;
exports.SANDBOXMODE_SANDBOX    = 1;
exports.SANDBOXMODE_SIMULATION = 2;

exports.SANDBOXMODE_ENFORCEMENT_COMPLETE = 1;

exports.VALIDATION_NOTIF   = 0;
exports.PUBLICATION_NOTIF  = 1;
exports.OPERATION_NOTIF    = 2;
exports.CANCELLATION_NOTIF = 3;

exports.PROPOSITION_STATUS_ACCEPTED = 3;
exports.PROPOSITION_STATUS_CONTROL  = 99;

exports.VALIDATION_TYPE_DELAY = 0;
exports.VALIDATION_TYPE_DATE = 1;

exports.PROCESS_TYPE_CREATEOPERATION = 0;
exports.PROCESS_TYPE_CREATEWORKFLOW  = 1;
exports.PROCESS_TYPE_CANCELOPERATION = 2;

exports.GROUP_TYPE_NMS      = 0;
exports.GROUP_TYPE_SEG      = 1;
exports.GROUP_TYPE_FILE     = 2;
exports.GROUP_TYPE_TEMPLATE = 3;

exports.GROUP_ORIGIN_NMS         = 0;
exports.GROUP_ORIGIN_SEG         = 1;
exports.GROUP_ORIGIN_FILE        = 2;
exports.GROUP_ORIGIN_IMPORTLEAD  = 3;

exports.OFFER_STATUS_EDITION              = 0;
exports.OFFER_STATUS_VALIDATIONPENDING    = 1;
exports.OFFER_STATUS_INPROCESS            = 2;
exports.OFFER_STATUS_VALIDATED            = 3;
exports.OFFER_STATUS_REFUSED              = 4;
exports.OFFER_STATUS_CANCELED             = 5;
exports.OFFER_STATUS_PUBLISHED            = 6;
exports.OFFER_STATUS_PRODUCTIONPENDING    = 7;
exports.OFFER_STATUS_CANCELPENDING        = 8;

exports.OFFERVIEW_STATE_EDITION           = 0;
exports.OFFERVIEW_STATE_VALIDATIONPENDING = 1;
exports.OFFERVIEW_STATE_VALIDATED         = 3;
exports.OFFERVIEW_STATE_REFUSED           = 4;
exports.OFFERVIEW_STATE_CANCELED          = 5;
exports.OFFERVIEW_STATE_PUBLISHED         = 6;

exports.SERVICE_TYPE_EMAIL    = 0;
exports.SERVICE_TYPE_MOBILE   = 1;
exports.SERVICE_TYPE_FACEBOOK = 20;
exports.SERVICE_TYPE_TWEETER  = 25;
exports.SERVICE_TYPE_APP      = 40;

exports.ACTION_TYPE_NONE                  = 0;
exports.ACTION_TYPE_TOVALIDATE            = 1;
exports.ACTION_TYPE_REFUSED               = 2;
exports.ACTION_TYPE_SUBMIT                = 3;
exports.ACTION_TYPE_SUBSCRIBE             = 4;
exports.ACTION_TYPE_CONFIRM               = 5;
exports.ACTION_TYPE_EXTRACTION_APPROVAL   = 6;
exports.ACTION_TYPE_EXTRACTION_INWAITING  = 7;
exports.ACTION_TYPE_FCP_APPROVAL          = 8;
exports.ACTION_TYPE_TOEDIT                = 9;
exports.ACTION_TYPE_PREPARATION_INWAITING = 10;
exports.ACTION_TYPE_EXPIRED = 11;

exports.CONTENT_EDITING_MODE_DEFAULT = 0;
exports.CONTENT_EDITING_MODE_DCE = 1;
exports.CONTENT_EDITING_MODE_AEM = 2;

})();
