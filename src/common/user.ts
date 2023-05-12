import { APIGatewayProxyEvent } from "aws-lambda";

export const getUserId = (event: APIGatewayProxyEvent) => {
  const userId = event.requestContext.authorizer?.claims.sub;

  if (!userId) {
    throw new Error("User is not authenticated");
  }

  return userId;
};
