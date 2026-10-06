import React from "react";
import {
  Document,
  Page,
  Text,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import { resolve } from "path";
import { existsSync } from "fs";
import { ResumeContent } from "./integrity";

export async function renderResumePDF(content: ResumeContent): Promise<Buffer> {
  const font = resolve(__dirname, "../../../assets/Vazirmatn-Regular.woff");
  if (!existsSync(font)) throw new Error("Bundled resume font missing");
  Font.register({ family: "Vazirmatn", src: font });
  const text = (value: string, key: string, size = 11) =>
    React.createElement(
      Text,
      { key, style: { fontSize: size, marginBottom: 10, textAlign: "right" } },
      value,
    );
  const page = React.createElement(
    Page,
    { size: "A4", style: { padding: 36, fontFamily: "Vazirmatn" } },
    [
      text(content.name, "name", 22),
      text(content.title, "title", 14),
      text(
        [content.email, content.location].filter(Boolean).join(" | "),
        "contact",
      ),
      text("خلاصه حرفه‌ای", "summary-heading", 14),
      text(content.summary, "summary"),
      text("مهارت‌ها", "skills-heading", 14),
      text(content.skills_to_emphasize.join("، "), "skills"),
      ...(content.highlights.length
        ? [
            text("سوابق و پروژه‌های ثبت‌شده", "facts-heading", 14),
            ...content.highlights.map((value, i) => text(value, `fact-${i}`)),
          ]
        : []),
    ],
  );
  return renderToBuffer(
    React.createElement(Document, { title: `Resume - ${content.name}` }, page),
  );
}
