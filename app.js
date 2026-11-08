
"use strict";

/* ==========================================
   STUDIOFORGE AUTO AD STUDIO
   Local-first advertising video engine
   ========================================== */

const $ = id => document.getElementById(id);

const state = {
  images: [],
  scenes: [],
  videoURL: null,
  rendering: false,
  previewTimer: null
};

const STOPWORDS = new Set([
  "the","and","for","with","from","that","this","your","you",
  "are","was","will","our","its","have","has","can","into",
  "der","die","das","und","oder","für","mit","von","ist",
  "sind","ein","eine","einer","eines","auf","im","in","am",
  "zu","als","bei","über","durch","wird","werden","ihr",
  "ihre","nicht","auch","mehr","nur","jetzt","diese","dieser"
]);

const BENEFIT_WORDS = [
  "premium","quality","innovative","innovation","simple",
  "easy","fast","powerful","smart","reliable","efficient",
  "sustainable","natural","comfortable","modern","unique",
  "exclusive","design","technology","performance",
  "qualität","innovativ","einfach","schnell","stark",
  "zuverlässig","effizient","nachhaltig","natürlich",
  "komfortabel","modern","einzigartig","exklusiv",
  "leistung","design","technologie","komfort"
];

const HOOKS = {
  premium: "A better standard starts here.",
  cinematic: "Experience something extraordinary.",
  modern: "Meet a smarter way forward.",
  minimal: "Less noise. More value.",
  energetic: "Ready for the next level?"
};

function setStatus(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",
    '"':"&quot;","'":"&#39;"
  })[char]);
}

/* ---------- IMAGE IMPORT ---------- */

$("images").addEventListener("change", async event => {
  state.images = [];

  const files = Array.from(event.target.files || [])
    .filter(file => file.type.startsWith("image/"))
    .slice(0, 20);

  for (const file of files) {
    try {
      const url = URL.createObjectURL(file);
      const image = new Image();

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });

      state.images.push({
        file,
        url,
        image,
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    } catch (error) {
      console.warn("Image could not be loaded:", file.name);
    }
  }

  $("imagePreview").innerHTML = state.images.map(item =>
    `<img src="${item.url}" alt="Uploaded product image">`
  ).join("");

  setStatus(
    "analysisStatus",
    `${state.images.length} image(s) successfully loaded.`
  );
});

/* ---------- TEXT ANALYSIS ---------- */

function analyseText(text) {
  const clean = text.replace(/\s+/g, " ").trim();

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  const words = clean
    .toLowerCase()
    .match(/[\p{L}\p{N}-]+/gu) || [];

  const frequency = {};

  words.forEach(word => {
    if (word.length > 3 && !STOPWORDS.has(word)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });

  const keywords = Object.entries(frequency)
    .sort((a,b) => b[1] - a[1])
    .slice(0,8)
    .map(item => item[0]);

  const benefits = sentences.filter(sentence =>
    BENEFIT_WORDS.some(word =>
      sentence.toLowerCase().includes(word)
    )
  );

  const numbers = clean.match(/\b\d+(?:[.,]\d+)?\s?(?:%|€|EUR|years|Jahre|W|kW|GB|TB|ml|kg|mm|cm)?\b/gi) || [];

  return {
    clean,
    sentences,
    keywords,
    benefits: benefits.slice(0,5),
    numbers: [...new Set(numbers)].slice(0,8),
    wordCount: words.length
  };
}

function shorten(text, max = 100) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return value.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function makeHeadline(analysis, product) {
  const first = analysis.sentences[0];

  if (first) return shorten(first, 75);
  if (product) return `Discover ${product}`;

  return "Discover a better experience";
}

function makeBenefitLines(analysis) {
  if (analysis.benefits.length) {
    return analysis.benefits.slice(0,4);
  }

  return analysis.keywords.slice(0,4).map(word =>
    `Discover the value of ${word}`
  );
}

/* ---------- STORYBOARD ---------- */

function createStoryboard() {
  const rawText = $("sourceText").value.trim();
  const product = $("productName").value.trim() || "Your product";
  const style = $("style").value;
  const tone = $("tone").value;
  const duration = Number($("duration").value);
  const cta = $("cta").value.trim() || "Discover it now";

  if (!rawText && !state.images.length) {
    setStatus(
      "analysisStatus",
      "Please add product text or at least one image first."
    );
    return;
  }

  const analysis = analyseText(rawText);
  const headline = makeHeadline(analysis, product);
  const benefits = makeBenefitLines(analysis);

  const hook = HOOKS[style] || HOOKS.premium;

  const scenes = [
    {
      type:"hook",
      title: hook,
      subtitle: product,
      seconds: duration * 0.18,
      image: 0
    },
    {
      type:"product",
      title: product,
      subtitle: headline,
      seconds: duration * 0.24,
      image: Math.min(1, state.images.length - 1)
    }
  ];

  benefits.slice(0,3).forEach((benefit,index) => {
    scenes.push({
      type:"benefit",
      title: shorten(benefit,65),
      subtitle: "Designed to make a difference",
      seconds: duration * 0.13,
      image: state.images.length
        ? index % state.images.length : -1
    });
  });

  scenes.push({
    type:"cta",
    title: cta,
    subtitle: product,
    seconds: duration * 0.19,
    image: state.images.length
      ? state.images.length - 1 : -1
  });

  const total = scenes.reduce((sum, scene) =>
    sum + scene.seconds, 0
  );

  scenes.forEach(scene => {
    scene.seconds = scene.seconds * duration / total;
  });

  state.scenes = scenes;
  state.analysis = analysis;
  state.product = product;
  state.style = style;
  state.tone = tone;

  renderAnalysis(analysis, headline, benefits);
  renderStoryboard(scenes);

  $("previewBtn").disabled = false;
  $("renderBtn").disabled = false;

  drawScene(0, 0.5);

  setStatus(
    "analysisStatus",
    "Analysis complete. Storyboard generated."
  );
}

function renderAnalysis(analysis, headline, benefits) {
  const result = $("analysisResult");

  result.innerHTML = `
    <div class="pill">${analysis.wordCount} words analysed</div>
    <div class="pill">${state.images.length} images loaded</div>
    <div class="pill">${analysis.keywords.length} keywords found</div>

    <p><strong>Suggested advertising headline</strong><br>
    ${escapeHTML(headline)}</p>

    <p><strong>Detected keywords</strong><br>
    ${analysis.keywords.map(word =>
      `<span class="pill">${escapeHTML(word)}</span>`
    ).join("") || "No clear keywords detected."}</p>

    <p><strong>Potential benefits</strong></p>
    <ul>${benefits.map(item =>
      `<li>${escapeHTML(item)}</li>`
    ).join("") || "<li>Product introduction and positioning</li>"}</ul>

    <p class="small">This is local heuristic analysis. It does not verify factual product claims or understand image contents semantically.</p>
  `;
}

function renderStoryboard(scenes) {
  $("storyboard").innerHTML = scenes.map((scene,index) => `
    <div class="scene">
      <strong>Scene ${index + 1} · ${escapeHTML(scene.type.toUpperCase())}</strong>
      <p>${escapeHTML(scene.title)}</p>
      <p>${escapeHTML(scene.subtitle)}</p>
      <p>${scene.seconds.toFixed(1)} seconds</p>
    </div>
  `).join("");
}

$("analyseBtn").addEventListener("click", createStoryboard);

/* ---------- VIDEO DIMENSIONS ---------- */

function dimensions() {
  const format = $("format").value;

  if (format === "16:9") {
    return { width:1280, height:720 };
  }

  if (format === "1:1") {
    return { width:900, height:900 };
  }

  return { width:720, height:1280 };
}

/* ---------- VISUAL RENDERING ---------- */

function drawBackground(ctx, width, height, time, sceneIndex) {
  const gradient = ctx.createLinearGradient(
    0,0,width,height
  );

  const palette = {
    premium:["#10101d","#44325e"],
    cinematic:["#080b15","#273e5b"],
    modern:["#101b2b","#155b69"],
    minimal:["#16171c","#41414b"],
    energetic:["#29133b","#873b68"]
  };

  const colors = palette[state.style] || palette.premium;

  gradient.addColorStop(0,colors[0]);
  gradient.addColorStop(1,colors[1]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,width,height);

  const glow = ctx.createRadialGradient(
    width * (0.25 + 0.5 * Math.abs(Math.sin(time * 0.5))),
    height * 0.35,
    0,
    width * 0.5,
    height * 0.5,
    width * 0.8
  );

  glow.addColorStop(0,"rgba(170,145,255,0.16)");
  glow.addColorStop(1,"rgba(0,0,0,0)");

  ctx.fillStyle = glow;
  ctx.fillRect(0,0,width,height);
}

function drawImage(ctx, item, width, height, time) {
  if (!item) return;

  const image = item.image;
  const scale = Math.max(
    width / image.width,
    height / image.height
  );

  const zoom = 1.02 + 0.055 * Math.min(time,1);
  const w = image.width * scale * zoom;
  const h = image.height * scale * zoom;

  const x = (width - w) / 2;
  const y = (height - h) / 2;

  ctx.save();
  ctx.globalAlpha = 0.77;
  ctx.drawImage(image,x,y,w,h);
  ctx.restore();

  const shade = ctx.createLinearGradient(
    0,0,0,height
  );

  shade.addColorStop(0,"rgba(0,0,0,0.12)");
  shade.addColorStop(0.45,"rgba(0,0,0,0.18)");
  shade.addColorStop(1,"rgba(0,0,0,0.78)");

  ctx.fillStyle = shade;
  ctx.fillRect(0,0,width,height);
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach(word => {
    const candidate = line ? line + " " + word : word;

    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) lines.push(line);
  return lines;
}

function drawScene(index, progress, targetCanvas) {
  if (!state.scenes.length) return;

  const canvas = targetCanvas || $("previewCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  const scene = state.scenes[index];
  if (!scene) return;

  const image = scene.image >= 0
    ? state.images[scene.image]
    : null;

  drawBackground(ctx,width,height,progress,index);

  drawImage(ctx,image,width,height,progress);

  const compact = width < height;
  const centerY = height * (compact ? 0.63 : 0.64);
  const maxWidth = width * 0.82;

  const titleSize = Math.round(width * 0.061);
  const subtitleSize = Math.round(width * 0.027);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,.6)";
  ctx.shadowBlur = 18;

  ctx.font = `800 ${titleSize}px system-ui`;

  const titleLines = wrapText(
    ctx,scene.title,maxWidth
  ).slice(0,3);

  const startY = centerY -
    (titleLines.length - 1) * titleSize * 0.62;

  titleLines.forEach((line,i) => {
    ctx.fillText(
      line,
      width/2,
      startY + i * titleSize * 1.25,
      maxWidth
    );
  });

  ctx.shadowBlur = 8;
  ctx.fillStyle = "#e4e5ef";
  ctx.font = `500 ${subtitleSize}px system-ui`;

  const subtitleLines = wrapText(
    ctx,scene.subtitle,maxWidth
  ).slice(0,3);

  subtitleLines.forEach((line,i) => {
    ctx.fillText(
      line,
      width/2,
      startY +
      titleLines.length * titleSize * 1.25 +
      i * subtitleSize * 1.5,
      maxWidth
    );
  });

  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.font = `600 ${Math.round(width * 0.018)}px system-ui`;
  ctx.fillText(
    state.product || "STUDIOFORGE",
    width/2,
    height * 0.09
  );

  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.fillRect(
    width * 0.12,
    height * 0.94,
    width * 0.76,
    Math.max(3,width * 0.004)
  );

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(
    width * 0.12,
    height * 0.94,
    width * 0.76 * progress,
    Math.max(3,width * 0.004)
  );

  ctx.fillStyle = "rgba(255,255,255,.65)";
  ctx.font = `500 ${Math.round(width * 0.015)}px system-ui`;
  ctx.fillText(
    `${index + 1} / ${state.scenes.length}`,
    width/2,
    height * 0.975
  );
}

/* ---------- PREVIEW ---------- */

$("previewBtn").addEventListener("click", () => {
  if (!state.scenes.length) return;

  if (state.previewTimer) {
    clearInterval(state.previewTimer);
  }

  let index = 0;
  let start = Date.now();

  const advance = () => {
    if (!state.scenes.length) return;

    const elapsed = (Date.now() - start) / 1000;
    const scene = state.scenes[index];

    const progress = Math.min(
      1, elapsed / scene.seconds
    );

    drawScene(index,progress);

    if (progress >= 1) {
      index++;

      if (index >= state.scenes.length) {
        clearInterval(state.previewTimer);
        state.previewTimer = null;
        drawScene(state.scenes.length - 1,1);
        return;
      }

      start = Date.now();
    }
  };

  advance();
  state.previewTimer = setInterval(advance,50);
});

/* ---------- VIDEO EXPORT ---------- */

function supportedMimeType() {
  const types = [
    "video/mp4;codecs=h264",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];

  if (!window.MediaRecorder) return "";

  return types.find(type =>
    MediaRecorder.isTypeSupported(type)
  ) || "";
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve,ms));
}

async function renderVideo() {
  if (state.rendering || !state.scenes.length) return;

  if (!window.MediaRecorder ||
      !HTMLCanvasElement.prototype.captureStream) {
    setStatus(
      "renderStatus",
      "Video rendering is not supported by this browser."
    );
    return;
  }

  state.rendering = true;
  $("renderBtn").disabled = true;
  $("previewBtn").disabled = true;

  try {
    const size = dimensions();
    const canvas = document.createElement("canvas");

    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext("2d",{
      alpha:false
    });

    const stream = canvas.captureStream(30);
    const mimeType = supportedMimeType();

    if (!mimeType) {
      throw new Error("No supported video recording format found.");
    }

    const chunks = [];

    const recorder = new MediaRecorder(stream,{
      mimeType,
      videoBitsPerSecond: 5000000
    });

    const finished = new Promise((resolve,reject) => {
      recorder.ondataavailable = event => {
        if (event.data && event.data.size) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        reject(new Error("Video recording failed."));
      };

      recorder.onstop = resolve;
    });

    recorder.start(500);

    const totalDuration = state.scenes.reduce(
      (sum,scene) => sum + scene.seconds,
      0
    );

    let elapsedTotal = 0;

    for (let i=0;i<state.scenes.length;i++) {
      const scene = state.scenes[i];
      const frames = Math.max(
        1,Math.ceil(scene.seconds * 30)
      );

      for (let frame=0;frame<frames;frame++) {
        const progress = frame / frames;

        drawScene(i,progress,canvas);

        const percent = Math.round(
          100 * (elapsedTotal +
          progress * scene.seconds) /
          totalDuration
        );

        $("progressBar").style.width =
          `${percent}%`;

        setStatus(
          "renderStatus",
          `Rendering scene ${i+1}/${state.scenes.length} · ${percent}%`
        );

        await wait(1000/30);
      }

      elapsedTotal += scene.seconds;
    }

    recorder.stop();
    await finished;

    stream.getTracks().forEach(track => track.stop());

    const blob = new Blob(chunks,{
      type:mimeType
    });

    if (!blob.size) {
      throw new Error("The exported video is empty.");
    }

    if (state.videoURL) {
      URL.revokeObjectURL(state.videoURL);
    }

    state.videoURL = URL.createObjectURL(blob);

    $("output").src = state.videoURL;
    $("output").hidden = false;
    $("outputHint").hidden = true;

    $("downloadLink").href = state.videoURL;
    $("downloadLink").hidden = false;
    $("downloadLink").download =
      `studioforge-ad.${mimeType.includes("mp4") ? "mp4" : "webm"}`;

    $("shareBtn").disabled = false;

    $("progressBar").style.width = "100%";

    setStatus(
      "renderStatus",
      `Finished · ${(blob.size / 1024 / 1024).toFixed(1)} MB · ${mimeType}`
    );

  } catch (error) {
    console.error(error);

    setStatus(
      "renderStatus",
      error.message || "Video rendering failed."
    );

  } finally {
    state.rendering = false;
    $("renderBtn").disabled = false;
    $("previewBtn").disabled = false;
  }
}

$("renderBtn").addEventListener("click",renderVideo);

/* ---------- SHARE ---------- */

$("shareBtn").addEventListener("click",async () => {
  if (!state.videoURL) return;

  try {
    const response = await fetch(state.videoURL);
    const blob = await response.blob();

    const extension = blob.type.includes("mp4")
      ? "mp4" : "webm";

    const file = new File(
      [blob],
      `studioforge-ad.${extension}`,
      {type:blob.type}
    );

    if (navigator.canShare &&
        navigator.canShare({files:[file]})) {
      await navigator.share({
        files:[file],
        title:"StudioForge advertising video"
      });
    } else {
      setStatus(
        "renderStatus",
        "Direct sharing is unavailable. Use Download video instead."
      );
    }

  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus(
        "renderStatus",
        "Sharing was not completed. Try downloading the video."
      );
    }
  }
});

/* ---------- STARTUP ---------- */

const previewCanvas = $("previewCanvas");
const initialSize = dimensions();

previewCanvas.width = initialSize.width;
previewCanvas.height = initialSize.height;

if ("serviceWorker" in navigator) {
  window.addEventListener("load",() => {
    navigator.serviceWorker.register("./sw.js")
      .catch(error => console.warn(
        "Service worker registration failed:",error
      ));
  });
}

console.log("StudioForge Auto Ad Studio engine loaded.");
