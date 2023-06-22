const fs = require('fs');
const { join } = require('path');

console.log('Copying the cheetah model...');

const testDirectory = join(__dirname, '..', 'test');
const fixturesDirectory = join(__dirname, '..', 'cypress', 'fixtures');

const paramsSourceDirectory = join(
  __dirname,
  '..',
  '..',
  '..',
  'lib',
  'common',
);

const sourceDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "resources",
);

try {
  fs.mkdirSync(testDirectory, { recursive: true });

  fs.readdirSync(paramsSourceDirectory).forEach(file => {
    fs.copyFileSync(join(paramsSourceDirectory, file), join(testDirectory, file));
  });

  fs.mkdirSync(join(fixturesDirectory, 'audio_samples'), { recursive: true });
  fs.readdirSync(join(sourceDirectory, 'audio_samples')).forEach(file => {
    fs.copyFileSync(join(sourceDirectory, 'audio_samples', file), join(fixturesDirectory, 'audio_samples', file));
  });
} catch (error) {
  console.error(error);
}

console.log('... Done!');
