import { NextResponse } from "next/server";
import { spawn, spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";

export const runtime = "nodejs";

type ApiErrorCode =
  | "INVALID_REQUEST"
  | "NO_VIDEO_FILES"
  | "DEPENDENCY_MISSING"
  | "PYTHON_EXEC_FAILED"
  | "NO_VARIANTS_GENERATED"
  | "INTERNAL_ERROR";

type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  detail?: string;
};

class PythonExecError extends Error {
  stderr: string;
  exitCode: number | null;
  constructor(message: string, stderr: string, exitCode: number | null) {
    super(message);
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

function errorJson(status: number, body: ApiErrorBody) {
  return NextResponse.json(body, { status });
}

function checkBinary(bin: string) {
  const arg = bin === "python3" ? "--version" : "-version";
  const res = spawnSync(bin, [arg], { encoding: "utf-8" });
  return {
    ok: res.status === 0 && !res.error,
    detail: res.error ? String(res.error.message) : (res.stderr || "").trim(),
  };
}

function getDependencyHealth() {
  const python = checkBinary("python3");
  const ffmpeg = checkBinary("ffmpeg");
  const ffprobe = checkBinary("ffprobe");
  return {
    python3: python.ok,
    ffmpeg: ffmpeg.ok,
    ffprobe: ffprobe.ok,
    ok: python.ok && ffmpeg.ok && ffprobe.ok,
    detail: {
      python3: python.detail || null,
      ffmpeg: ffmpeg.detail || null,
      ffprobe: ffprobe.detail || null,
    },
  };
}

async function collectFilesRecursively(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectFilesRecursively(full);
      return [full];
    })
  );
  return nested.flat();
}

function runPythonObfuscate(inputDir: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "tools", "video_obfuscate.py");
    const args = [scriptPath, inputDir, "--output-root", outputDir, "--overwrite"];
    const child = spawn("python3", args, { cwd: process.cwd() });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (err) => reject(new PythonExecError(err.message, stderr, null)));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else {
        reject(
          new PythonExecError(
            "python obfuscation process failed",
            stderr || `python exit code ${code}`,
            code
          )
        );
      }
    });
  });
}

export async function GET() {
  const health = getDependencyHealth();
  return NextResponse.json({
    code: "OK",
    message: health.ok ? "ready" : "dependency missing",
    ...health,
  });
}

export async function POST(request: Request) {
  const rootTmp = await fs.mkdtemp(path.join(os.tmpdir(), "video-obf-"));
  const inputDir = path.join(rootTmp, "input");
  const outputDir = path.join(rootTmp, "output");

  try {
    await fs.mkdir(inputDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return errorJson(400, {
        code: "INVALID_REQUEST",
        message: "请求必须使用 multipart/form-data",
        detail: `content-type=${contentType || "unknown"}`,
      });
    }

    const dep = getDependencyHealth();
    if (!dep.ok) {
      return errorJson(503, {
        code: "DEPENDENCY_MISSING",
        message: "服务端依赖缺失（python3/ffmpeg/ffprobe）",
        detail: JSON.stringify(dep.detail),
      });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    const videos = files.filter((f) => f.type.startsWith("video/") || f.name.toLowerCase().endsWith(".mp4"));

    if (!videos.length) {
      return errorJson(400, {
        code: "NO_VIDEO_FILES",
        message: "请至少上传一个视频文件",
      });
    }

    for (const file of videos) {
      const ab = await file.arrayBuffer();
      const targetPath = path.join(inputDir, file.name);
      await fs.writeFile(targetPath, Buffer.from(ab));
    }

    await runPythonObfuscate(inputDir, outputDir);

    const allOutputs = await collectFilesRecursively(outputDir);
    const mp4Outputs = allOutputs.filter((p) => p.toLowerCase().endsWith(".mp4"));
    if (!mp4Outputs.length) {
      return errorJson(500, {
        code: "NO_VARIANTS_GENERATED",
        message: "未生成任何变体文件",
      });
    }

    const zip = new JSZip();
    for (const filePath of mp4Outputs) {
      const rel = path.relative(outputDir, filePath);
      const data = await fs.readFile(filePath);
      zip.file(rel, data);
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="video_obfuscation_variants.zip"',
      },
    });
  } catch (error) {
    if (error instanceof PythonExecError) {
      return errorJson(500, {
        code: "PYTHON_EXEC_FAILED",
        message: "Python 混淆进程执行失败",
        detail: error.stderr,
      });
    }
    const message = error instanceof Error ? error.message : "处理失败";
    return errorJson(500, {
      code: "INTERNAL_ERROR",
      message: "服务内部错误",
      detail: message,
    });
  } finally {
    await fs.rm(rootTmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
