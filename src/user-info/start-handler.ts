import { logger } from "../common/logger";

const start = async (event: any) => {
  logger.info("start", { event });

  return {
    statusCode: 200,
  };
};

export const handler = start;
