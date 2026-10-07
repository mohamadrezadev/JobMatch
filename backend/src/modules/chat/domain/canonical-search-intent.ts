import { JobSearchIntent } from "./conversation";

// Split a grounded compound role into occupation AND technology. Unknown
// qualifiers are retained verbatim instead of broadening an arbitrary title.
export function canonicalSearchIntent(
  intent: JobSearchIntent,
): JobSearchIntent {
  const required = new Set(intent.requiredSkills ?? []);
  const targetRoles = intent.targetRoles.flatMap((role) => {
    const text = role
      .normalize("NFKC")
      .replace(/[\u200c\u200d-]/g, " ")
      .replace(/ك/g, "ک");
    const backend = /بک\s*ا?ند|back\s*end/i;
    const dotnet = /(?:asp)?\.net\b|\bdot\s*net\b|دات\s*نت|سی\s*شارپ|c#/i;
    if (!backend.test(text) || !dotnet.test(text)) return [role];
    const remainder = text
      .replace(new RegExp(backend.source, "gi"), " ")
      .replace(new RegExp(dotnet.source, "gi"), " ")
      .replace(
        /برنامه\s*نویس|توسعه\s*دهنده|\b(?:developer|programmer)\b/gi,
        " ",
      )
      .trim();
    if (remainder) return [role];
    required.add(".NET");
    return ["Backend Developer"];
  });
  return {
    ...intent,
    targetRoles: [...new Set(targetRoles)],
    ...(required.size ? { requiredSkills: [...required] } : {}),
  };
}
