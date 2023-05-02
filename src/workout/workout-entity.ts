import { CreateWorkout } from "./create-workout-dto";

export type WorkoutEntity = {
  id: string;
} & CreateWorkout;
