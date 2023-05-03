import { Context } from "aws-lambda";

export const getUserId = (context: Context) => {
  const userId = context.identity?.cognitoIdentityId;
  if (!userId) {
    throw new Error("User is not authenticated");
  }

  return userId;
};
