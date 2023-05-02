import { CreateWorkout } from "../handlers/create-workout-types";

export type WorkoutEntity = {
  id: string;
} & CreateWorkout;
