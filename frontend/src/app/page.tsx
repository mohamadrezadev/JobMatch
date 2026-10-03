import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Find the right job.<br />
            <span className="text-brand-600">Understand your gaps.</span><br />
            Build your application.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
            Pathly is your AI career copilot. See exactly which jobs fit you, understand why, close your skill gaps, and get a tailored resume — all in one place.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-200 bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-gray-900">How it works</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { icon: '🔍', title: 'Find Jobs', desc: 'Discover roles that actually match your skills and preferences' },
              { icon: '🧠', title: 'Understand Fit', desc: 'See exactly why each job fits — with a clear explainable score' },
              { icon: '📈', title: 'Close Gaps', desc: 'Know precisely what skills you need to learn before applying' },
              { icon: '📄', title: 'Apply Fast', desc: 'Generate a tailored resume for each job in seconds' },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-2xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 px-6 py-16 text-center text-white">
        <h2 className="text-2xl font-bold sm:text-3xl">Ready to find your next role?</h2>
        <p className="mx-auto mt-3 max-w-md text-brand-100">Join thousands of junior developers who land jobs faster with Pathly.</p>
        <div className="mt-8">
          <Link href="/register">
            <button className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-brand-700 shadow hover:bg-gray-50">
              Start for free
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
