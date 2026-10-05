const fs = require('node:fs');
const path = require('node:path');
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Pass the reference pathly.html file.');
const html = fs.readFileSync(sourcePath, 'utf8');
const root = path.resolve(__dirname, '..');
function section(name) {
  const match = html.match(new RegExp('<section id="tab-' + name + '"[\\s\\S]*?<\\/section>'));
  if (!match) throw new Error('Missing section: ' + name);
  return match[0];
}
function jsx(input) {
  return input.replace(/پت‌لی/g, 'جاب مچ').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\bclass=/g, 'className=')
    .replace(/\bfor=/g, 'htmlFor=')
    .replace(/onclick="([^"]*)"/g, (_, handler) => {
      if (!/^(switchTab|sendQuickPrompt|startAcademyLesson)\(/.test(handler)) throw new Error('Unexpected reference handler');
      return 'onClick={() => { ' + handler.replace(/switchTab\(/g, 'navigate(') + ' }}';
    })
    .replace(/style="([^"]*)"/g, (_, style) => {
      const values = {};
      for (const item of style.split(';').filter(Boolean)) {
        const [key, ...rest] = item.split(':');
        values[key.trim().replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = rest.join(':').trim();
      }
      return 'style={' + JSON.stringify(values) + '}';
    })
    .replace(/<i /g, '<i aria-hidden="true" ')
    .replace(/<(br|hr|input)([^>]*?)(?<!\/)\s*>/g, '<$1$2 />');
}
const outputDir = path.join(root, 'src/components/pathly');
fs.mkdirSync(outputDir, { recursive: true });
let dashboard = jsx(section('dashboard'));
dashboard = dashboard.replace('سلام پرهام عزیز', "سلام {user?.firstName || 'پرهام'} عزیز");
fs.writeFileSync(path.join(outputDir, 'DashboardView.tsx'), [
  "'use client';",
  "import { useRouter } from 'next/navigation';",
  "import { useAuthStore } from '@/stores/useAuthStore';",
  "import { DemoNotice } from './DemoNotice';",
  "export function DashboardView() {",
  "  const router = useRouter();",
  "  const { user } = useAuthStore();",
  "  const paths: Record<string, string> = { jobs: '/jobs', copilot: '/chat', academy: '/academy', resume: '/resume', dashboard: '/dashboard' };",
  "  const navigate = (tab: string) => router.push(paths[tab] ?? '/dashboard');",
  "  const sendQuickPrompt = (prompt: string) => router.push('/chat?prompt=' + encodeURIComponent(prompt));",
  "  return <div className='space-y-3'>" + dashboard + "<DemoNotice>آمار، پیشنهاد هفته و درصدها نمونه مرجع هستند.</DemoNotice></div>;",
  "}",
].join('\n'));
let academy = jsx(section('academy').replace('tab-content hidden', 'tab-content'));
academy = academy.replace(/<div id="academy-lesson-container"[\s\S]*?<\/div>/, '{lesson && <AcademyLesson key={lesson} type={lesson} onClose={() => setLesson(null)} />}');
fs.writeFileSync(path.join(outputDir, 'AcademyView.tsx'), [
  "'use client';",
  "import { useState } from 'react';",
  "import { AcademyLesson } from './AcademyLesson';",
  "import { DemoNotice } from './DemoNotice';",
  "export function AcademyView() {",
  "  const [lesson, setLesson] = useState<string | null>(null);",
  "  const startAcademyLesson = (type: string) => setLesson(type);",
  "  return <div className='space-y-3'>" + academy + "<DemoNotice>مسیرها و درصدهای پیشرفت نمونه هستند؛ درس‌ها را می‌توانید باز کنید.</DemoNotice></div>;",
  "}",
].join('\n'));
console.log('Reference dashboard and academy ported into native React components.');
