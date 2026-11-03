// Test dell'analisi FFprobe e della scelta della copia di lavoro. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { bitrateFor, playability, progressFromLine, summarizeProbe, workingCopyArgs } from "./media.ts";

const probe = (video, audio = { codec_type: "audio", codec_name: "aac" }, format = "mov,mp4,m4a,3gp,3g2,mj2") =>
  summarizeProbe({
    streams: [{ codec_type: "video", codec_name: "h264", width: 1920, height: 1080, avg_frame_rate: "25/1", pix_fmt: "yuv420p", field_order: "progressive", ...video }, audio].filter(Boolean),
    format: { format_name: format, duration: "5400.5" },
  });

test("riepilogo di FFprobe", () => {
  const p = probe({});
  assert.equal(p.durationMs, 5_400_500);
  assert.equal(p.fps, 25);
  assert.equal(p.videoCodec, "h264");
  assert.equal(p.audioCodec, "aac");
  assert.equal(p.interlaced, false);
  // La copertina di un MP4 non è la traccia video.
  const cover = summarizeProbe({
    streams: [{ codec_type: "video", codec_name: "mjpeg", disposition: { attached_pic: 1 } }, { codec_type: "video", codec_name: "hevc", avg_frame_rate: "50/1" }],
    format: { format_name: "mp4", duration: "10" },
  });
  assert.equal(cover.videoCodec, "hevc");
});

test("originale riproducibile solo se affidabile", () => {
  assert.deepEqual(playability(probe({})), { playable: true });
  assert.equal(playability(probe({}, undefined, "webm")).playable, true);
  assert.equal(playability(probe({ codec_name: "mpeg2video" })).playable, false);
  assert.equal(playability(probe({}, undefined, "mpegts")).playable, false);
  assert.equal(playability(probe({}, { codec_type: "audio", codec_name: "pcm_s16le" })).playable, false);
  assert.equal(playability(probe({ pix_fmt: "yuv422p10le" })).playable, false);
  assert.equal(playability(probe({ field_order: "tt" })).playable, false);
  assert.equal(playability(probe({}, undefined, "matroska,webm")).playable, true);
  const r = playability(probe({ codec_name: "mpeg2video" }));
  assert.match(r.reason, /mpeg2video/);
});

test("copia di lavoro: encoder di macOS, un fotogramma chiave al secondo, originale solo letto", () => {
  const info = probe({ field_order: "tt", avg_frame_rate: "30000/1001" });
  const args = workingCopyArgs("/in/partita.ts", "/cache/x.part.mp4", info);
  assert.ok(args.includes("h264_videotoolbox"));
  assert.ok(!args.includes("libx264"));
  assert.equal(args[args.indexOf("-g") + 1], "30");
  assert.match(args[args.indexOf("-vf") + 1], /bwdif/);
  assert.equal(args[args.indexOf("-i") + 1], "/in/partita.ts");
  assert.equal(args.at(-1), "/cache/x.part.mp4");
  assert.equal(bitrateFor({ width: 3840, height: 2160 }), "24M");
  assert.equal(bitrateFor({ width: 1280, height: 720 }), "6M");
});

test("avanzamento della copia", () => {
  assert.equal(progressFromLine("out_time_us=2700250000", 5_400_500), 0.5);
  assert.equal(progressFromLine("out_time_us=9999999999", 5_400_500), 1);
  assert.equal(progressFromLine("frame=100", 5_400_500), null);
  assert.equal(progressFromLine("out_time_us=1", null), null);
});
