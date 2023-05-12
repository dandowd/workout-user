import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { logger } from "../common/logger";

const start = async (event: APIGatewayProxyEvent, context: Context) => {
  logger.info("start", { event, context });
  return {
    statusCode: 200,
  };
};

export const handler = start;
