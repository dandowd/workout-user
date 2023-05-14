import { APIGatewayProxyEvent } from "aws-lambda";

export const getUserId = (context: APIGatewayProxyEvent["requestContext"]) => {
  const userId = context.authorizer?.claims.sub;

  if (!userId) {
    throw new Error("User is not authenticated");
  }

  return userId;
};
