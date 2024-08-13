/** @type {import('ts-jest').JestConfigWithTsJest} */

const config = {
  coverageThreshold: {
      global: {
          lines: 80,
      },
  },
coverageReporters: [
  "json-summary", 
  "text",
  "lcov"
]
};

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  ...config
};