import os from 'os';
import { Config } from '@remotion/cli/config';

// Audio-only render (codec=wav). The main remotion.config.ts sets CRF / JPEG / pixel format,
// and Remotion rejects --crf for the wav codec, so the audio job uses this slimmer config:
//   npx remotion render src/index.js GameVideo out/audio.wav --codec=wav --config=remotion.audio.config.ts
Config.setOverwriteOutput(true);
Config.setConcurrency(Math.max(1, Math.min(2, os.cpus().length)));
Config.setChromiumOpenGlRenderer('swangle');
Config.setDelayRenderTimeoutInMilliseconds(120000);
