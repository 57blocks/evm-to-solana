import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { SELF_DECLARED_DEPS_METADATA } from "@nestjs/common/constants";
import { EVMClients } from "./EVMClients";

describe("EVMClients", () => {
  it("declares ConfigService injection explicitly for tsx runtime", () => {
    expect(Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, EVMClients)).toEqual([
      { index: 0, param: ConfigService },
    ]);
  });
});
