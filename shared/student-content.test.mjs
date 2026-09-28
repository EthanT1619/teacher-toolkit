import assert from 'node:assert/strict';
import test from 'node:test';
import {
  grammarCanRun,
  grammarManifestPack,
  kitchenCanRun,
  kitchenManifestPack,
  validateGrammarPack,
  validateKitchenPack,
  validateManifest,
  validateStoryPack,
  validateWhPack,
  whQuestionsForEngine,
} from './student-content.mjs';

function manifest(packs, id = 'LSA') {
  return {
    version: 1,
    levels: [{ id, label: id, packs }],
  };
}

const whPack = {
  id: 'lsa-01',
  lesson: 1,
  title: 'Sample Lesson',
  file: 'LSA/lesson01.json',
  status: 'available',
};

test('manifest accepts available and coming-soon metadata', () => {
  const errors = validateManifest(manifest([
    whPack,
    { id: 'lsa-02', title: 'Later', status: 'coming-soon' },
  ]));
  assert.deepEqual(errors, []);
});

test('manifest rejects duplicate ids, empty titles, and available without file', () => {
  const errors = validateManifest({
    version: 1,
    levels: [
      { id: 'LSA', packs: [{ id: 'a', title: 'One', status: 'available' }] },
      { id: 'LSA', packs: [{ id: 'a', title: ' ', status: 'coming-soon' }] },
    ],
  });
  assert.ok(errors.some((error) => error.includes('duplicate level')));
  assert.ok(errors.some((error) => error.includes('requires file')));
  assert.ok(errors.some((error) => error.includes('duplicate pack')));
  assert.ok(errors.some((error) => error.includes('title')));
});

test('WH pack accepts segments and maps engine categories', () => {
  const pack = {
    questions: [
      { id: 'q01', whType: 'where', sentence: 'Jenny went to the library after school.' },
      {
        id: 'q02',
        whType: 'Who',
        sentence: 'Mina reads a book.',
        segments: [
          { text: 'Mina', highlight: true },
          { text: ' reads a book.', highlight: false },
        ],
      },
    ],
  };
  assert.deepEqual(validateWhPack(pack), []);
  const cards = whQuestionsForEngine(pack);
  assert.equal(cards[0].category, 'Where');
  assert.equal(cards[1].category, 'Who');
  assert.equal(cards[1].segments[0].highlight, true);
});

test('WH pack rejects bad type, empty sentence, and offset-style cues', () => {
  const errors = validateWhPack({
    questions: [
      { id: 'q01', whType: 'whose', sentence: 'No.' },
      { id: 'q01', whType: 'how', sentence: '   ' },
      { id: 'q03', whType: 'when', sentence: 'Today.', segments: [{ start: 0, end: 5 }] },
    ],
  });
  assert.ok(errors.some((error) => error.includes('whType')));
  assert.ok(errors.some((error) => error.includes('duplicate')));
  assert.ok(errors.some((error) => error.includes('sentence')));
  assert.ok(errors.some((error) => error.includes('text')));
});

test('Story Forge pack checks pool size and round bounds', () => {
  assert.deepEqual(validateStoryPack({
    words: ['Mina', 'found', 'a map'],
    roundCount: 3,
    minWords: 2,
  }), []);
  const errors = validateStoryPack({ words: ['only', 'two'], roundCount: 0, minWords: 4 });
  assert.ok(errors.length >= 2);
});

test('Kitchen stays metadata-only and cannot run', () => {
  assert.deepEqual(kitchenManifestPack({
    id: 'dsc-02',
    activityType: 'recipe',
    status: 'coming-soon',
  }), []);
  assert.ok(kitchenManifestPack({ status: 'available', activityType: 'recipe' }).length > 0);
  assert.deepEqual(validateKitchenPack({
    activityType: 'recipe',
    contentVersion: 1,
    content: {},
  }), []);
  assert.equal(kitchenCanRun({ content: { subject: ['I'] } }), false);
});

test('Grammar allows only the current check-fix engine to run', () => {
  assert.deepEqual(grammarManifestPack({
    activityType: 'identify',
    status: 'coming-soon',
  }), []);
  assert.ok(grammarManifestPack({
    activityType: 'identify',
    status: 'available',
  }).some((error) => error.includes('cannot be available')));
  assert.equal(grammarCanRun({ activityType: 'check-fix', engine: 'sva' }), true);
  assert.equal(grammarCanRun({ activityType: 'identify', engine: 'sva' }), false);
  assert.equal(grammarCanRun({ activityType: 'check-fix', engine: 'tense' }), false);
  assert.ok(validateGrammarPack({ activityType: 'sort' }).length > 0);
});
