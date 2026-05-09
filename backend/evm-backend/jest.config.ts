/// <reference types="node" />

import type { Config } from "jest";

const config: Config = {
  displayName: "evm-backend",
  rootDir: ".",
  testRegex: "src/.*\\.spec\\.ts$",
  testPathIgnorePatterns: ["scripts/"],
  preset: "ts-jest",
  testEnvironment: "node",
};

module.exports = config;
