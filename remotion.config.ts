import { Config } from "@remotion/cli/config";

// PNG frames: lossless intermediates, crisp text edges (JPEG softened them).
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(18); // matches --crf=18 in CI workflow
Config.setOverwriteOutput(true);

// Optional overrides (only needed on locked-down networks / small machines):
//   REMOTION_BROWSER_EXECUTABLE=/path/to/chrome   use an existing Chrome/Chromium instead of downloading one
//   REMOTION_CONCURRENCY=2                        limit parallel render tabs
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
if (process.env.REMOTION_CONCURRENCY) {
  Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY));
}
