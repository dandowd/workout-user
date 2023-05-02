import { APIGatewayEventRequestContext } from "aws-lambda";
import { randomUUID } from "crypto";
import { logger } from "../common/logger";
import { EventWithJsonBody, withJsonBody } from "../common/middleware";
import { UserTableItem } from "../infrastructure/db-client";
import { CreateWorkout } from "./create-workout-types";
import { WorkoutEntity } from "./workout";

const workoutTableFactory = (userId: string) =>
  new UserTableItem<WorkoutEntity>(userId, "workout", (workout) => workout.id);

export const putWorkout = async (
  event: EventWithJsonBody<CreateWorkout>,
  context: APIGatewayEventRequestContext
) => {
  const userId = context.authorizer?.userId;
  const workoutTable = workoutTableFactory(userId!);
  const workout = event.body;

  logger.info("Creating workout", { workout });

  try {
    const workoutId = randomUUID();
    await workoutTable.put({ workout, id: workoutId });

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
