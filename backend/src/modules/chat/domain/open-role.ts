// Job titles are open text, not an enum. These rules remove request wrappers and
// optional constraints; the caller still owns deterministic constraint parsing.
export function openRole(text: string): string | undefined {
  if (/هستم|\bi am\b/i.test(text) && !/دنبال|looking for/i.test(text)) return;
  if (
    /نمی\s*خوام|نمی\s*خواهم|بدون|نباش|don't want|exclude|without|^(?:سلام|ممنون|مرسی|باشه|بله|نه|خیر|hello|hi|thanks|ok)$|^(?:چرا|کجا|کدام|why|where|what|how)\b/i.test(
      text,
    )
  )
    return;
  let title = text
    .replace(
      /^(?:لطفا\s+)?\d+\s*(?:تا\s*)?(?:شغل|کار|آگهی|نتیجه|موقعیت)\s+/,
      "",
    )
    .replace(
      /\s+(?:(?:بهم|به من)\s+)?(?:پیشنهاد بده|معرفی کن|نشون بده|نشان بده|پیدا کن)[\s\S]*$/,
      "",
    )
    .replace(/^[«“"']|[»”"']$/g, "")
    .replace(
      /^(?:من\s+)?(?:دنبال\s+(?:(?:یک|یه)\s+)?(?:کار|شغل|موقعیت|پوزیشن)?\s*|(?:یه|یک)\s+(?:کار|شغل|موقعیت|پوزیشن)\s+|(?:کار|شغل|پوزیشن|موقعیت شغلی|عنوان شغلی|نقش)(?:\s+به عنوان)?\s*[:：=]?\s+|(?:می\s*خوام|می\s*خواهم)\s+)/,
      "",
    )
    .replace(
      /^(?:i (?:want|need) (?:a |an )?(?:job|role|position)(?: as)?|(?:i am )?looking for (?:a |an )?(?:job|role|position)?(?: as)?|find (?:me )?(?:a |an )?(?:job|role|position)(?: as)?|(?:job title|position|role)\s*[:：=])\s*/i,
      "",
    )
    .replace(/^به عنوان\s+|^as\s+/i, "")
    .split(/\s+(?:به جای|instead of|rather than)\s+/i)[0]
    .replace(
      /\s+\d+\s*(?:تا\s*)?(?:آگهی|اگهی|نتیجه|job listings?|jobs?|results?)(?=\s|$)[\s\S]*$/i,
      "",
    )
    .replace(
      /(?:می\s*گردم|می\s*جویم|می\s*خوام|می\s*خواهم|هستم|باشم|پیدا کن|بگرد)[\s\S]*$/,
      "",
    )
    .replace(/\s+(?:job|position|role)$/i, "")
    .replace(
      /(?:با\s+حقوق|حقوق\s*(?:حداقل|بالای|\d)|حداقل\s*\d|بالای\s*\d|salary|minimum\s*\d|\s+with\s+|با مهارت)[\s\S]*$/i,
      "",
    )
    .replace(
      /(?:(?:فقط|only)\s+)?(?:\b(?:remote|hybrid|on\s*site|junior|senior|mid\s*level)\b|دورکار(?:ی)?|هیبرید|حضوری|جونیور|سینیور|میدلول)/gi,
      " ",
    )
    .replace(/\s+(?:در|توی|تو|in)\s+[\s\S]*$/i, "")
    .replace(/تهران|tehran|اصفهان|شیراز|مشهد/gi, " ")
    .replace(/(?:بهتره|بهتر است|ترجیح می دم|preferred)/gi, " ")
    .replace(/^[\s،,:：]+|[\s،,:：]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (
    !title ||
    title.length > 100 ||
    title.split(" ").length > 10 ||
    !/[\p{L}]/u.test(title)
  )
    return;
  if (
    /^(?:فقط|کار|شغل|موقعیت|پوزیشن|دنبال کار|job|a job|work|فقط دورکار|دنبال|حداقل|یا|و|or|and|only)$/.test(
      title,
    ) ||
    /\d.*(?:میلیون|million|تومن|تومان|toman)|site:|https?:|[<>]|(?:^|\s)(?:من|می|نیست|ندارم|لطفا|please|i|my)(?:\s|$)/i.test(
      title,
    )
  )
    return;
  return title;
}
