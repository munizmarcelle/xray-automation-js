import { describe, expect, it, afterEach, beforeEach } from "@jest/globals";
import axios from "axios";
import nock from "nock";
import fs from "fs";
import MockAdapter from "axios-mock-adapter";
import * as multipart from "parse-multipart-data";

//import XrayErrorResponse from '../src/xray-error-response.js';
//import XrayCloudResponseV2 from '../src/xray-cloud-response-v2.js';
//import XrayCloudGraphQLResponseV2 from '../src/xray-cloud-graphql-response-v2.js';
import {
  ReportConfig,
  XraySettings,
  XrayCloudClient,
  XRAY_FORMAT,
  JUNIT_FORMAT,
  TESTNG_FORMAT,
  ROBOT_FORMAT,
  NUNIT_FORMAT,
  XUNIT_FORMAT,
  CUCUMBER_FORMAT,
  BEHAVE_FORMAT,
} from "../src/index";

const xrayCloudBaseUrl = "https://xray.cloud.getxray.app/api/v2";
const authenticateUrl = xrayCloudBaseUrl + "/authenticate";

describe("timeout handling", () => {
  const mock: MockAdapter;
  const reportFile = "__tests__/resources/robot.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    //mock = new MockAdapter(axios, { delayResponse: 1000 });
    //mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );

  });

  afterEach(() => {
    mock.resetHistory();
  });
  /*
  const withDelay = function (delay: number, response: any[]) { return function (config: any) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve(response);
        }, delay);
      });
    };
  };
  */

  it("succeeds if requests take less than configured timeout", async () => {
    mock = new MockAdapter(axios);
    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
      timeout: 2000,
    };
    const xrayClient = new XrayCloudClient(xrayCloudSettings);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      projectKey: "XRAY",
    };

    const response: any = await xrayClient.submitResults(
      reportFile,
      reportConfig
    );
    expect(response._response.status).toEqual(200);
    expect(response._response.data).toEqual(successfulResponseData);
  });

  it("returns an error if requests take more than configured timeout", async () => {
    mock = new MockAdapter(axios, { delayResponse: 1000 });
    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot?projectKey=XRAY")
      .reply(200, successfulResponseData); // reply(200, successfulResponseData);

    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
      timeout: 500,
    };
    const xrayClient = new XrayCloudClient(xrayCloudSettings);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      projectKey: "XRAY",
    };

    try {
      await xrayClient.submitResults(reportFile, reportConfig);
      throw new Error("dummy"); // should not reach here
    } catch (error: any) {
      expect(error._response).toEqual("request timeout");
    }
  });

  it("returns an error if implicit auth requests take more than configured timeout", async () => {
    mock = new MockAdapter(axios, { delayResponse: 1000 });
    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
      timeout: 500,
    };
    const xrayClient = new XrayCloudClient(xrayCloudSettings);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      projectKey: "XRAY",
    };

    try {
      await xrayClient.submitResults(reportFile, reportConfig);
      throw new Error("dummy"); // should not reach here
    } catch (error: any) {
      expect(error._response).toEqual("request timeout");
    }
  });
});

describe("authentication", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/junit.xml";
  const successfulAuthResponseData = '"dXNlcm5hbWU6cGFzc3dvcmQ="';
  const invalidAuthResponseData = {
    error: "Authentication failed. Invalid client credentials!",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("is made implicitly with success and proceeds, when using submitRequest", async () => {
    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit?projectKey=XRAY")
      .reply(200, {});

    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      projectKey: "XRAY",
    };

    await xrayClient.submitResults(reportFile, reportConfig);
    expect(mock.history.post.length).toBe(2);
    expect(mock.history.post[0].data).toEqual(
      '{"client_id":"ADC8E5CE8FE446D3BD926CC1AEFF9707","client_secret":"fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478"}'
    );
    expect(mock.history.post[1].headers!["Authorization"]).toEqual(
      "Bearer dXNlcm5hbWU6cGFzc3dvcmQ="
    );
  });

  it("is made implicitly and gives an error for invalid credentials, when using submitRequest", async () => {
    mock.onPost(authenticateUrl).reply(401, invalidAuthResponseData);
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit?projectKey=XRAY")
      .reply(200, {});

    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      projectKey: "XRAY",
    };
    try {
      await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error: any) {
      expect(mock.history.post[0].data).toEqual(
        '{"client_id":"ADC8E5CE8FE446D3BD926CC1AEFF9707","client_secret":"fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478"}'
      );
      expect(mock.history.post.length).toBe(1);
      expect(error.statusCode).toEqual(401);
      expect(error.body).toEqual(invalidAuthResponseData);
    }
  });
});

describe("invalid request for some report file", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/dummy.xml";

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error if unable to read reportFile", async () => {
    mock.onPost().reply(200, {});

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      projectKey: "XRAY",
    };

    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ENOENT: no such file or directory, open '__tests__/resources/dummy.xml'"
      );
    }
  });

  it("returns an error if format is not specified", async () => {
    mock.onPost().reply(200, {});

    const reportConfig: any = {};
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual("ERROR: format must be specified");
    }
  });

  it("returns an error if format is not supported", async () => {
    mock.onPost().reply(200, {});

    const reportConfig: ReportConfig = { format: "dummy" };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual("ERROR: unsupported format dummy");
    }
  });
});

describe("JUnit standard endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/junit.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResults is called, without projectKey or testExecKey", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: JUNIT_FORMAT };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: projectKey or testExecKey must be defined"
      );
    }
  });

  it("sends the correct URL encoded parameters when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/junit?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironment: "chrome",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/junit?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironments: ["chrome", "mac"],
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct payload when submitResults is called", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      projectKey: "XRAY",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      expect(mock.history.post[1].headers!["Content-Type"]).toEqual(
        "application/xml"
      );
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      expect(mock.history.post[1].data).toEqual(reportContent);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      projectKey: "XRAY",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
      expect(response._response.data).toEqual(successfulResponseData);
      expect(response.id).toEqual(successfulResponseData.id);
      expect(response.key).toEqual(successfulResponseData.key);
      expect(response.selfUrl).toEqual(successfulResponseData.self);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });
});

describe("TestNG standard endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/testng.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResults is called, without projectKey or testExecKey", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/testng")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: TESTNG_FORMAT };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: projectKey or testExecKey must be defined"
      );
    }
  });

  it("sends the correct URL encoded parameters when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/testng?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: TESTNG_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironment: "chrome",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/testng?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: TESTNG_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironments: ["chrome", "mac"],
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct payload when submitResults is called", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/testng?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: TESTNG_FORMAT,
      projectKey: "XRAY",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      expect(mock.history.post[1].headers!["Content-Type"]).toEqual(
        "application/xml"
      );
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      expect(mock.history.post[1].data).toEqual(reportContent);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/testng?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: TESTNG_FORMAT,
      projectKey: "XRAY",
    };

    const response: any = await xrayClient.submitResults(
      reportFile,
      reportConfig
    );
    expect(response._response.data).toEqual(successfulResponseData);
    expect(response.id).toEqual(successfulResponseData.id);
    expect(response.key).toEqual(successfulResponseData.key);
    expect(response.selfUrl).toEqual(successfulResponseData.self);
  });
});

describe("Nunit standard endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/nunit.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResults is called, without projectKey or testExecKey", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/nunit")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: NUNIT_FORMAT };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: projectKey or testExecKey must be defined"
      );
    }
  });

  it("sends the correct URL encoded parameters when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/nunit?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: NUNIT_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironment: "chrome",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/nunit?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: NUNIT_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironments: ["chrome", "mac"],
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct payload when submitResults is called", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/nunit?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: NUNIT_FORMAT,
      projectKey: "XRAY",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      expect(mock.history.post[1].headers!["Content-Type"]).toEqual(
        "application/xml"
      );
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      expect(mock.history.post[1].data).toEqual(reportContent);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/nunit?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: NUNIT_FORMAT,
      projectKey: "XRAY",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
      expect(response._response.data).toEqual(successfulResponseData);
      expect(response.id).toEqual(successfulResponseData.id);
      expect(response.key).toEqual(successfulResponseData.key);
      expect(response.selfUrl).toEqual(successfulResponseData.self);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });
});

describe("xunit standard endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/xunit.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResults is called, without projectKey or testExecKey", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/xunit")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: XUNIT_FORMAT };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: projectKey or testExecKey must be defined"
      );
    }
  });

  it("sends the correct URL encoded parameters when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/xunit?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XUNIT_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironment: "chrome",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/xunit?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XUNIT_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironments: ["chrome", "mac"],
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct payload when submitResults is called", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/xunit?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XUNIT_FORMAT,
      projectKey: "XRAY",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      expect(mock.history.post[1].headers!["Content-Type"]).toEqual(
        "application/xml"
      );
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      expect(mock.history.post[1].data).toEqual(reportContent);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/xunit?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XUNIT_FORMAT,
      projectKey: "XRAY",
    };

    const response: any = await xrayClient.submitResults(
      reportFile,
      reportConfig
    );
    expect(response._response.data).toEqual(successfulResponseData);
    expect(response.id).toEqual(successfulResponseData.id);
    expect(response.key).toEqual(successfulResponseData.key);
    expect(response.selfUrl).toEqual(successfulResponseData.self);
  });
});

describe("Robot Framework standard endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/robot.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResults is called, without projectKey or testExecKey", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: ROBOT_FORMAT };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: projectKey or testExecKey must be defined"
      );
    }
  });

  it("sends the correct URL encoded parameters when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/robot?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironment: "chrome",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called", async () => {
    mock
      .onPost(
        xrayCloudBaseUrl +
          "/import/execution/robot?projectKey=XRAY&testPlanKey=XRAY-10&testExecKey=XRAY-765&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac"
      )
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      projectKey: "XRAY",
      testPlanKey: "XRAY-10",
      testExecKey: "XRAY-765",
      version: "1.0",
      revision: "123",
      testEnvironments: ["chrome", "mac"],
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("sends the correct payload when submitResults is called", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      projectKey: "XRAY",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      expect(mock.history.post[1].headers!["Content-Type"]).toEqual(
        "application/xml"
      );
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      expect(mock.history.post[1].data).toEqual(reportContent);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot?projectKey=XRAY")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      projectKey: "XRAY",
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
      expect(response._response.data).toEqual(successfulResponseData);
      expect(response.id).toEqual(successfulResponseData.id);
      expect(response.key).toEqual(successfulResponseData.key);
      expect(response.selfUrl).toEqual(successfulResponseData.self);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });
});

describe("Cucumber standard endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/cucumber.json";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("sends the correct payload when submitResults is called", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/cucumber")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: CUCUMBER_FORMAT,
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      expect(mock.history.post[1].headers!["Content-Type"]).toEqual(
        "application/json"
      );
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      expect(mock.history.post[1].data).toEqual(reportContent);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/cucumber")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: CUCUMBER_FORMAT,
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
      expect(response._response.data).toEqual(successfulResponseData);
      expect(response.id).toEqual(successfulResponseData.id);
      expect(response.key).toEqual(successfulResponseData.key);
      expect(response.selfUrl).toEqual(successfulResponseData.self);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });
});

describe("Behave standard endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/behave.json";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("sends the correct payload when submitResults is called", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/behave")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: BEHAVE_FORMAT,
    };
    try {
      await xrayClient.submitResults(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(2);
      expect(mock.history.post[1].headers!["Content-Type"]).toEqual(
        "application/json"
      );
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      expect(mock.history.post[1].data).toEqual(reportContent);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/behave")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: BEHAVE_FORMAT,
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
      expect(response._response.data).toEqual(successfulResponseData);
      expect(response.id).toEqual(successfulResponseData.id);
      expect(response.key).toEqual(successfulResponseData.key);
      expect(response.selfUrl).toEqual(successfulResponseData.self);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });
});

describe("Xray JSON standard endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/xray_cloud.json";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("sends the correct payload when submitResults is called", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XRAY_FORMAT,
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      expect(mock.history.post[1].headers!["Content-Type"]).toEqual(
        "application/json"
      );
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      expect(mock.history.post[1].data).toEqual(reportContent);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XRAY_FORMAT,
    };
    try {
      const response: any = await xrayClient.submitResults(
        reportFile,
        reportConfig
      );
      expect(response._response.data).toEqual(successfulResponseData);
      expect(response.id).toEqual(successfulResponseData.id);
      expect(response.key).toEqual(successfulResponseData.key);
      expect(response.selfUrl).toEqual(successfulResponseData.self);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  });
});

/* multipart endpoints */

describe("JUnit multipart endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/junit.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResultsMultipart is called, without Test Execution related info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: JUNIT_FORMAT };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: testExecInfoFile or testExecInfo must be defined"
      );
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      testExecInfo: {
        fields: {
          project: {
            key: "BOOK",
          },
          summary: "Test Execution for some automated tests",
          issuetype: {
            name: "Test Execution",
          },
        },
      },
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        reportConfig.testExecInfo.toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info in a file", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
      expect(parts[2].filename).toEqual("testInfo.json");
      expect(parts[2].type).toEqual("application/json");
      expect(parts[2].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/junit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: JUNIT_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };

    const response: any = await xrayClient.submitResultsMultipart(
      reportFile,
      reportConfig
    );
    expect(response._response.data).toEqual(successfulResponseData);
    expect(response.id).toEqual(successfulResponseData.id);
    expect(response.key).toEqual(successfulResponseData.key);
    expect(response.selfUrl).toEqual(successfulResponseData.self);
  });
});

describe("TestNG multipart endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/testng.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResultsMultipart is called, without Test Execution related info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/testng/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: TESTNG_FORMAT };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: testExecInfoFile or testExecInfo must be defined"
      );
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/testng/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: TESTNG_FORMAT,
      testExecInfo: {
        fields: {
          project: {
            key: "BOOK",
          },
          summary: "Test Execution for some automated tests",
          issuetype: {
            name: "Test Execution",
          },
        },
      },
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        reportConfig.testExecInfo.toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info in a file", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/testng/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: TESTNG_FORMAT,
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/testng/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: TESTNG_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
      expect(parts[2].filename).toEqual("testInfo.json");
      expect(parts[2].type).toEqual("application/json");
      expect(parts[2].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/testng/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: TESTNG_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };

    const response: any = await xrayClient.submitResultsMultipart(
      reportFile,
      reportConfig
    );
    expect(response._response.data).toEqual(successfulResponseData);
    expect(response.id).toEqual(successfulResponseData.id);
    expect(response.key).toEqual(successfulResponseData.key);
    expect(response.selfUrl).toEqual(successfulResponseData.self);
  });
});

describe("Nunit multipart endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/nunit.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResultsMultipart is called, without Test Execution related info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/nunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: NUNIT_FORMAT };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: testExecInfoFile or testExecInfo must be defined"
      );
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/nunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: NUNIT_FORMAT,
      testExecInfo: {
        fields: {
          project: {
            key: "BOOK",
          },
          summary: "Test Execution for some automated tests",
          issuetype: {
            name: "Test Execution",
          },
        },
      },
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        reportConfig.testExecInfo.toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info in a file", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/nunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: NUNIT_FORMAT,
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/nunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: NUNIT_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
      expect(parts[2].filename).toEqual("testInfo.json");
      expect(parts[2].type).toEqual("application/json");
      expect(parts[2].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/nunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: NUNIT_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
      expect(response._response.data).toEqual(successfulResponseData);
      expect(response.id).toEqual(successfulResponseData.id);
      expect(response.key).toEqual(successfulResponseData.key);
      expect(response.selfUrl).toEqual(successfulResponseData.self);
    } catch (error: any) {
      throw error;
    }
  });
});

describe("xunit multipart endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/xunit.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResultsMultipart is called, without Test Execution related info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/xunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: XUNIT_FORMAT };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: testExecInfoFile or testExecInfo must be defined"
      );
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/xunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XUNIT_FORMAT,
      testExecInfo: {
        fields: {
          project: {
            key: "BOOK",
          },
          summary: "Test Execution for some automated tests",
          issuetype: {
            name: "Test Execution",
          },
        },
      },
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        reportConfig.testExecInfo.toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info in a file", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/xunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XUNIT_FORMAT,
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/xunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XUNIT_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
      expect(parts[2].filename).toEqual("testInfo.json");
      expect(parts[2].type).toEqual("application/json");
      expect(parts[2].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/xunit/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XUNIT_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };

    const response: any = await xrayClient.submitResultsMultipart(
      reportFile,
      reportConfig
    );
    expect(response._response.data).toEqual(successfulResponseData);
    expect(response.id).toEqual(successfulResponseData.id);
    expect(response.key).toEqual(successfulResponseData.key);
    expect(response.selfUrl).toEqual(successfulResponseData.self);
  });
});

describe("Robot Framework multipart endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/robot.xml";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResultsMultipart is called, without Test Execution related info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: ROBOT_FORMAT };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: testExecInfoFile or testExecInfo must be defined"
      );
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      testExecInfo: {
        fields: {
          project: {
            key: "BOOK",
          },
          summary: "Test Execution for some automated tests",
          issuetype: {
            name: "Test Execution",
          },
        },
      },
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        reportConfig.testExecInfo.toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info in a file", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual("report.xml");
      expect(parts[0].type).toEqual("application/xml");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
      expect(parts[2].filename).toEqual("testInfo.json");
      expect(parts[2].type).toEqual("application/json");
      expect(parts[2].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/robot/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: ROBOT_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
      expect(response._response.data).toEqual(successfulResponseData);
      expect(response.id).toEqual(successfulResponseData.id);
      expect(response.key).toEqual(successfulResponseData.key);
      expect(response.selfUrl).toEqual(successfulResponseData.self);
    } catch (error: any) {
      throw error;
    }
  });
});

describe("Cucumber multipart endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/cucumber.json";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResultsMultipart is called, without Test Execution related info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/cucumber/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: CUCUMBER_FORMAT };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: testExecInfoFile or testExecInfo must be defined"
      );
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/cucumber/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: CUCUMBER_FORMAT,
      testExecInfo: {
        fields: {
          project: {
            key: "BOOK",
          },
          summary: "Test Execution for some automated tests",
          issuetype: {
            name: "Test Execution",
          },
        },
      },
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.json");
      expect(parts[0].type).toEqual("application/json");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        reportConfig.testExecInfo.toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info in a file", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/cucumber/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: CUCUMBER_FORMAT,
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.json");
      expect(parts[0].type).toEqual("application/json");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/cucumber/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: CUCUMBER_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };

    const response: any = await xrayClient.submitResultsMultipart(
      reportFile,
      reportConfig
    );
    expect(response._response.data).toEqual(successfulResponseData);
    expect(response.id).toEqual(successfulResponseData.id);
    expect(response.key).toEqual(successfulResponseData.key);
    expect(response.selfUrl).toEqual(successfulResponseData.self);
  });
});

describe("Behave multipart endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/behave.json";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResultsMultipart is called, without Test Execution related info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/behave/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: BEHAVE_FORMAT };
    try {
      await xrayClient.submitResultsMultipart(reportFile, reportConfig);
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: testExecInfoFile or testExecInfo must be defined"
      );
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/behave/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: BEHAVE_FORMAT,
      testExecInfo: {
        fields: {
          project: {
            key: "BOOK",
          },
          summary: "Test Execution for some automated tests",
          issuetype: {
            name: "Test Execution",
          },
        },
      },
    };
    try {
      await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.json");
      expect(parts[0].type).toEqual("application/json");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        reportConfig.testExecInfo.toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info in a file", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/behave/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: BEHAVE_FORMAT,
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.json");
      expect(parts[0].type).toEqual("application/json");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/behave/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: BEHAVE_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };

    const response: any = await xrayClient.submitResultsMultipart(
      reportFile,
      reportConfig
    );
    expect(response._response.data).toEqual(successfulResponseData);
    expect(response.id).toEqual(successfulResponseData.id);
    expect(response.key).toEqual(successfulResponseData.key);
    expect(response.selfUrl).toEqual(successfulResponseData.self);
  });
});

describe("Xray JSON multipart endpoint", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const reportFile = "__tests__/resources/xray_cloud.json";
  const successfulAuthResponseData = '"1234567890"';
  const successfulResponseData = {
    id: "38101",
    key: "XRAY-765",
    self: "http://xray.example.com/rest/api/2/issue/38101",
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns an error when submitResultsMultipart is called, without Test Execution related info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = { format: XRAY_FORMAT };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
    } catch (error: any) {
      expect(error._response).toEqual(
        "ERROR: testExecInfoFile or testExecInfo must be defined"
      );
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XRAY_FORMAT,
      testExecInfo: {
        fields: {
          project: {
            key: "BOOK",
          },
          summary: "Test Execution for some automated tests",
          issuetype: {
            name: "Test Execution",
          },
        },
      },
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.json");
      expect(parts[0].type).toEqual("application/json");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        reportConfig.testExecInfo.toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("sends the correct payload when submitResultsMultipart is called with Test Execution info in a file", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XRAY_FORMAT,
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );

      expect(mock.history.post.length).toBe(2);
      const rawFormData = mock.history.post[1].data
        .getBuffer()
        .toString("utf-8");
      const boundary = mock.history.post[1].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual("report.json");
      expect(parts[0].type).toEqual("application/json");
      const reportContent = fs.readFileSync(reportFile).toString("utf-8");
      const partContent = parts[0].data.toString("utf-8");
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual("info.json");
      expect(parts[1].type).toEqual("application/json");
      expect(parts[1].data.toString("utf-8")).toEqual(
        fs.readFileSync(reportConfig.testExecInfoFile!).toString("utf-8")
      );
    } catch (error: any) {
      throw error;
    }
  });

  it("returns Test Execution data when submitResults is called with success", async () => {
    mock
      .onPost(xrayCloudBaseUrl + "/import/execution/multipart")
      .reply(200, successfulResponseData);

    const reportConfig: ReportConfig = {
      format: XRAY_FORMAT,
      testInfoFile: "__tests__/resources/testInfo.json",
      testExecInfoFile: "__tests__/resources/testExecInfo.json",
    };
    try {
      const response: any = await xrayClient.submitResultsMultipart(
        reportFile,
        reportConfig
      );
      expect(response._response.data).toEqual(successfulResponseData);
      expect(response.id).toEqual(successfulResponseData.id);
      expect(response.key).toEqual(successfulResponseData.key);
      expect(response.selfUrl).toEqual(successfulResponseData.self);
    } catch (error: any) {
      throw error;
    }
  });
});

/* GraphQL requests */

describe("graphQL: getTestPlanIssueId", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const successfulAuthResponseData = '"dXNlcm5hbWU6cGFzc3dvcmQ="';

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("returns the issueId, for a valid request and successful authentication", async () => {
    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);

    // {  "query":     "{ getTestPlans(jql: \"key = XRAY-12\", limit: 1) { total results { issueId } } }" }
    //
    const mockedResponse = {
      data: {
        getTestPlans: {
          total: 1,
          results: [
            {
              issueId: "109601",
            },
          ],
        },
      },
    };
    const mockedGraphQLserver = nock("https://xray.cloud.getxray.app")
      .post("/api/v2/graphql")
      .matchHeader("authorization", "Bearer dXNlcm5hbWU6cGFzc3dvcmQ=")
      .reply(200, mockedResponse);

    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    try {
      const testPlanIssueId = await xrayClient.getTestPlanId("XRAY-17");
      expect(testPlanIssueId).toEqual("109601");
      expect(mock.history.post[0].data).toEqual(
        '{"client_id":"ADC8E5CE8FE446D3BD926CC1AEFF9707","client_secret":"fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478"}'
      );
    } catch (error: any) {
      throw error;
    }
  });
});

describe("graphQL: associateTestExecutionToTestPlanByIds", () => {
  const mock: MockAdapter;
  const xrayClient: XrayCloudClient;
  const successfulAuthResponseData = '"dXNlcm5hbWU6cGFzc3dvcmQ="';

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.resetHistory();
  });

  it("associates a Test Execution to a Test Plan, for a valid request and successful authentication", async () => {
    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
    const mockedResponse = {
      data: {
        data: {
          addTestExecutionsToTestPlan: {
            addedTestExecutions: ["10001"],
            warning: null,
          },
        },
      },
    };
    const mockedGraphQLserver = nock("https://xray.cloud.getxray.app")
      .post("/api/v2/graphql")
      .matchHeader("authorization", "Bearer dXNlcm5hbWU6cGFzc3dvcmQ=")
      .reply(200, mockedResponse);

    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    const testExecIssueId = "10001";
    const testPlanIssueId = "10000";
    const res = await xrayClient.associateTestExecutionToTestPlanByIds(
      testExecIssueId,
      testPlanIssueId
    );
    expect(mock.history.post[0].data).toEqual(
      '{"client_id":"ADC8E5CE8FE446D3BD926CC1AEFF9707","client_secret":"fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478"}'
    );
    // expect(res._response.data.addTestExecutionsToTestPlan.addedTestExecutions[0]).toEqual(testExecIssueId);
    expect(res).toEqual(testExecIssueId);
  });

  it("does not associate a Test Execution to a Test Plan if already associated, for a valid request and successful authentication", async () => {
    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
    const mockedResponse = {
      data: {
        data: {
          addTestExecutionsToTestPlan: {
            addedTestExecutions: [],
            warning: null,
          },
        },
      },
    };
    const mockedGraphQLserver = nock("https://xray.cloud.getxray.app")
      .post("/api/v2/graphql")
      .matchHeader("authorization", "Bearer dXNlcm5hbWU6cGFzc3dvcmQ=")
      .reply(200, mockedResponse);

    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    const testExecIssueId = "10001";
    const testPlanIssueId = "10000";
    const res = await xrayClient.associateTestExecutionToTestPlanByIds(
      testExecIssueId,
      testPlanIssueId
    );
    expect(mock.history.post[0].data).toEqual(
      '{"client_id":"ADC8E5CE8FE446D3BD926CC1AEFF9707","client_secret":"fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478"}'
    );
    // expect(res._response.data.addTestExecutionsToTestPlan.addedTestExecutions[0]).toEqual(testExecIssueId);
    expect(res).toEqual(testExecIssueId);
  });

  it("returns error if failed to associate a Test Execution to a Test Plan even with a successful authentication", async () => {
    mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData);
    const mockedResponse = {
      errors: [
        {
          message: "User doesn't have permissions to edit issue with id 10000",
          locations: [
            {
              line: 1,
              column: 12,
            },
          ],
          path: ["addTestExecutionsToTestPlan"],
        },
      ],
      data: {
        addTestExecutionsToTestPlan: null,
      },
    };
    const mockedGraphQLserver = nock("https://xray.cloud.getxray.app")
      .post("/api/v2/graphql")
      .matchHeader("authorization", "Bearer dXNlcm5hbWU6cGFzc3dvcmQ=")
      .reply(200, mockedResponse);

    const xrayCloudSettings = {
      clientId: "ADC8E5CE8FE446D3BD926CC1AEFF9707",
      clientSecret: "fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478",
    };
    xrayClient = new XrayCloudClient(xrayCloudSettings);

    try {
      const testExecIssueId = "10001";
      const testPlanIssueId = "10000";
      const res = await xrayClient.associateTestExecutionToTestPlanByIds(
        testExecIssueId,
        testPlanIssueId
      );
      throw new Error(); // should not come here
    } catch (error: any) {
      expect(mock.history.post[0].data).toEqual(
        '{"client_id":"ADC8E5CE8FE446D3BD926CC1AEFF9707","client_secret":"fe40e2670597a5a9c573ed4c8cda6ba5675580b7f3c4c6a440d78a6ea9eae478"}'
      );
      // expect(res._response.data.addTestExecutionsToTestPlan.addedTestExecutions[0]).toEqual(testExecIssueId);
      //expect(res._response.errors[0].message).toEqual("User doesn't have permissions to edit issue with id 10000");
      expect(error.errorMessages.length).toBe(1);
      expect(error.errorMessages[0]).toEqual(
        "User doesn't have permissions to edit issue with id 10000"
      );
    }
  });
});
