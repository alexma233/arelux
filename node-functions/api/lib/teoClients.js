import { teo } from "tencentcloud-sdk-nodejs-teo";
import { CommonClient } from "tencentcloud-sdk-nodejs-common";

export function createTeoSdkClient({ secretId, secretKey, region = "ap-guangzhou" }) {
  const TeoClient = teo.v20220901.Client;
  const clientConfig = {
    credential: {
      secretId,
      secretKey,
    },
    region,
    profile: {
      httpProfile: {
        endpoint: "teo.tencentcloudapi.com",
      },
    },
  };

  return new TeoClient(clientConfig);
}

export function createTeoCommonClient({ secretId, secretKey, region }) {
  // 注意：不要在日志/返回值里输出 secretId/secretKey
  const commonClientConfig = {
    credential: {
      secretId,
      secretKey,
    },
    region,
    profile: {
      httpProfile: {
        endpoint: "teo.tencentcloudapi.com",
      },
    },
  };

  return new CommonClient("teo.tencentcloudapi.com", "2022-09-01", commonClientConfig);
}

