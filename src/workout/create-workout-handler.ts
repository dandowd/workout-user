import { APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "crypto";
import { logger } from "../common/logger";
import { EventWithJsonBody, withJsonBody } from "../common/middleware";
import { getUserId } from "../common/user";
import { UserTableItem } from "../infrastructure/db-client";
import { CreateWorkout } from "./create-workout-dto";
import { WorkoutEntity } from "./workout-entity";

const workoutTableFactory = (userId: string) =>
  new UserTableItem<WorkoutEntity>(userId, "workout", (workout) => workout.id);

export const putWorkout = async (
  event: EventWithJsonBody<CreateWorkout>
): Promise<APIGatewayProxyResult> => {
  const workout = event.body;

  logger.info("Creating workout", { workout });

  try {
    const userId = getUserId(event.requestContext);
    const workoutTable = workoutTableFactory(userId);

    const workoutId = randomUUID();
    await workoutTable.put({ id: workoutId, ...workout });

    return {
      statusCode: 200,
      body: JSON.stringify({ workoutId }),
    };
  } catch (err) {
    logger.error("Error creating workout", { err });

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error creating workout" }),
    };
  }
};

export const handler = withJsonBody(putWorkout);
