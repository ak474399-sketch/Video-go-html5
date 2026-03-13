import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";

export const runtime = "nodejs";

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

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `python exit code ${code}`));
    });
  });
}

export async function POST(request: Request) {
  const rootTmp = await fs.mkdtemp(path.join(os.tmpdir(), "video-obf-"));
  const inputDir = path.join(rootTmp, "input");
  const outputDir = path.join(rootTmp, "output");

  try {
    await fs.mkdir(inputDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    const videos = files.filter((f) => f.type.startsWith("video/") || f.name.toLowerCase().endsWith(".mp4"));

    if (!videos.length) {
      return NextResponse.json({ error: "请至少上传一个视频文件" }, { status: 400 });
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
      return NextResponse.json({ error: "未生成任何变体文件" }, { status: 500 });
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
    const message = error instanceof Error ? error.message : "处理失败";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await fs.rm(rootTmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
