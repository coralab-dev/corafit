import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateCanonicalExercises, validateTemplateExerciseNames } from './seed-canonical-exercises';
import {
  CANONICAL_TEMPLATE_PLANS,
  collectPlanExerciseNames,
  readCanonicalExerciseSeeds,
} from './seed';

void describe('canonical exercise seed helpers', () => {
  void it('accepts only active global image exercises with mediaUrl', () => {
    const exercises = validateCanonicalExercises([
      {
        name: 'Press de banca con barra',
        primaryMuscle: 'chest',
        secondaryMuscles: [],
        equipment: 'barbell',
        instructions: 'Baja la barra con control.',
        recommendations: 'Mantén pies firmes.',
        mediaUrl: 'https://example.com/press.webp',
        mediaType: 'image',
        videoUrl: 'https://example.com/press',
      },
    ]);

    assert.equal(exercises[0].name, 'Press de banca con barra');
  });

  void it('rejects exercises without image media', () => {
    assert.throws(
      () =>
        validateCanonicalExercises([
          {
            name: 'Plancha',
            primaryMuscle: 'core',
            secondaryMuscles: [],
            equipment: 'bodyweight',
            instructions: null,
            recommendations: null,
            mediaUrl: '',
            mediaType: 'image',
            videoUrl: null,
          },
        ]),
      /mediaUrl/,
    );
  });

  void it('rejects template exercises that are not in the canonical JSON', () => {
    const canonical = validateCanonicalExercises([
      {
        name: 'Flexiones',
        primaryMuscle: 'chest',
        secondaryMuscles: [],
        equipment: 'bodyweight',
        instructions: null,
        recommendations: null,
        mediaUrl: 'https://example.com/flexiones.webp',
        mediaType: 'image',
        videoUrl: null,
      },
    ]);

    assert.throws(
      () => validateTemplateExerciseNames(['Flexiones', 'Ejercicio legacy'], canonical),
      /Ejercicio legacy/,
    );
  });

  void it('keeps canonical seed templates limited to canonical exercise names', () => {
    const canonicalExercises = readCanonicalExerciseSeeds();

    assert.doesNotThrow(() =>
      validateTemplateExerciseNames(
        collectPlanExerciseNames(CANONICAL_TEMPLATE_PLANS),
        canonicalExercises,
      ),
    );
  });
});
