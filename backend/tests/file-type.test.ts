import { KIND_FOR_MIME, detectFileKind } from "../src/utils/file-type";

const bytes = (...values: number[]) => Uint8Array.from([...values, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const ascii = (text: string) => Uint8Array.from(Buffer.from(text, "latin1"));

describe("detectFileKind", () => {
  it.each([
    ["jpeg", bytes(0xff, 0xd8, 0xff, 0xe0)],
    ["png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
    ["webp", Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0, 0])],
    ["pdf", ascii("%PDF-1.7\n")],
    ["zip", bytes(0x50, 0x4b, 0x03, 0x04)],
    ["ole", bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)],
    ["mp3", ascii("ID3\u0004\u0000")],
    ["mp3", bytes(0xff, 0xfb, 0x90)],
    ["mp4", Uint8Array.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])],
  ] as const)("recognises %s by its leading bytes", (kind, data) => {
    expect(detectFileKind(data)).toBe(kind);
  });

  it.each([
    ["an HTML page", ascii("<!DOCTYPE html><script>alert(1)</script>")],
    ["a script", ascii("#!/bin/sh\nrm -rf /\n")],
    ["a GIF", ascii("GIF89a....")],
    ["an SVG", ascii("<svg xmlns='http://www.w3.org/2000/svg'></svg>")],
    ["a Windows executable", ascii("MZ\u0090\u0000\u0003")],
    ["an empty file", new Uint8Array()],
    ["a truncated PNG header", bytes(0x89, 0x50, 0x4e)],
    ["a RIFF file that is not WebP", Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45])],
  ])("returns null for %s", (_label, data) => {
    expect(detectFileKind(data)).toBeNull();
  });

  it("knows what each accepted MIME type must contain", () => {
    expect(KIND_FOR_MIME["image/png"]).toBe("png");
    expect(KIND_FOR_MIME["application/epub+zip"]).toBe("zip");
    expect(KIND_FOR_MIME["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]).toBe("zip");
    expect(KIND_FOR_MIME["application/octet-stream"]).toBeUndefined();
    expect(KIND_FOR_MIME["image/svg+xml"]).toBeUndefined();
  });
});
