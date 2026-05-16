export type CreateExerciseDto = {
  name: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  equipment: string;
  instructions?: string;
  recommendations?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
};

export type UpdateExerciseDto = Partial<CreateExerciseDto> & {
  status?: string;
};

export type ListExercisesQuery = {
  limit?: string;
  page?: string;
  search?: string;
  primaryMuscle?: string;
  equipment?: string;
  type?: 'global' | 'custom' | 'all';
  status?: string;
};
