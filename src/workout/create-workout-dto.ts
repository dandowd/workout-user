const weightScheme = {
  type: "array",
  items: { type: "number" },
};

const numberArray = {
  type: "array",
  additionalProperties: false,
  items: { type: "number" },
};

const flatSchema = {
  type: "object",
  required: ["sets", "reps"],
  additionalProperties: false,
  properties: {
    sets: { type: "number" },
    reps: { type: "number" },
  },
};

const workoutSchema = {
  type: "object",
  required: ["exerciseId", "repType"],
  additionalProperties: false,
  minProperties: 3,
  properties: {
    exerciseId: { type: "string" },
    repType: { type: "string", oneOf: ["FLAT", "RPE", "RANGE", "TIMED"] },
    weight: weightScheme,
    flat: flatSchema,
    rpe: numberArray,
    range: numberArray,
    time: numberArray,
  },
};

export const createWorkoutSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    exercises: {
      type: "array",
      items: workoutSchema,
    },
  },
};

export type CreateWorkout = {
  exercises: Exercise[];
};

export type RepType = "FLAT" | "RPE" | "RANGE" | "TIMED";

type Exercise = {
  exerciseId: string;
  repType: string;
  weight?: number[];
  flat?: {
    sets: number;
    reps: number;
  };
  rpe?: number[];
  range?: number[];
  time?: number[];
};
