import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";
import { APIGatewayProxyEvent } from "aws-lambda";
import httpEventNormalizer from "@middy/http-event-normalizer";
import middy from "@middy/core";

export type EventWithJsonBody<TBody> = Omit<APIGatewayProxyEvent, "body"> & {
  body: TBody;
};

export type EventWithQueryStringParameters<TQuery> = Omit<
  APIGatewayProxyEvent,
  "queryStringParameters"
> & { queryStringParameters: TQuery };

export const withJsonBody = (handler: (...args: any) => any) => {
  return middy()
    .use(httpErrorHandler())
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .handler(handler);
};

export const withQueryStringParameters = (handler: (...args: any) => any) => {
  return middy(handler).use(httpErrorHandler()).use(httpEventNormalizer());
};
