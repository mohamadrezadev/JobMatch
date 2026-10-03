'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/api-client';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, markProfileComplete } = useAuthStore();
  const [step, setStep] = useState<Step>(1);

  // Step 1: Basic info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [targetRole, setTargetRole] = useState('');

  // Step 2: Experience
  const [experienceYears, setExperienceYears] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'Junior' | 'Mid' | 'Senior'>('Junior');
  const [education, setEducation] = useState('');

  // Step 3: Skills
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState<{ name: string; level: string }[]>([]);
  const [skillLevel, setSkillLevel] = useState('Intermediate');

  // Step 4: Preferences
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState<'Remote' | 'OnSite' | 'Hybrid'>('Remote');
  const [desiredSalary, setDesiredSalary] = useState('');

  useEffect(() => {
    // Restore step from Zustand if exists
    const storedStep = useAuthStore.getState().onboardingStep;
    if (storedStep && storedStep > 1) setStep(storedStep as Step);
  }, []); // eslint-disable-line

  function saveProgress(currentStep: Step) {
    completeOnboarding(currentStep);
    setStep(currentStep);
  }

  async function nextStep() {
    if (step === 1 && targetRole) saveProgress(2);
    else if (step === 2 && experienceYears) saveProgress(3);
    else if (step === 3 && skills.length > 0) saveProgress(4);
    else if (step === 4) await submitProfile();
  }

  async function submitProfile() {
    try {
      await apiClient.put('/api/users/profile', {
        title: targetRole,
        location,
        experienceYears: Number(experienceYears),
        experienceLevel,
        workType,
        desiredSalary: desiredSalary ? Number(desiredSalary) : undefined,
      });
      // Save skills
      for (const sk of skills) {
        try {
          await apiClient.post('/api/users/skills', { skillName: sk.name, level: sk.level });
        } catch {}
      }
      markProfileComplete();
      router.push('/');
    } catch {
      alert('Failed to save profile. Please try again.');
    }
  }

  function addSkill() {
    if (!newSkill.trim()) return;
    setSkills([...skills, { name: newSkill.trim(), level: skillLevel }]);
    setNewSkill('');
  }

  const stepsLabel = ['Basic Info', 'Experience', 'Skills', 'Preferences'];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Set up your profile</h1>
        <p className="mt-1 text-sm text-gray-500">This helps us recommend the right jobs for you.</p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {stepsLabel.map((label, i) => (
          <div key={label} className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? 'bg-brand-600' : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-sm text-gray-500">Step {step} of 4 — {stepsLabel[step - 1]}</p>

      {step === 1 && (
        <Card>
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Basic Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <Input label="Target Role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g., Junior .NET Developer" />
            <Button className="w-full" onClick={nextStep} disabled={!targetRole}>Next</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Experience</h2>
            <Input label="Years of Experience" type="number" min="0" max="50" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Level</label>
              <div className="flex gap-2">
                {(['Junior', 'Mid', 'Senior'] as const).map((lvl) => (
                  <button key={lvl} onClick={() => setExperienceLevel(lvl)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium ${experienceLevel === lvl ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={nextStep} disabled={!experienceYears}>Next</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Your Skills</h2>
            <p className="text-sm text-gray-500">Add the technologies and tools you know.</p>
            <div className="flex gap-2">
              <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="e.g., C#" onKeyDown={(e) => e.key === 'Enter' && addSkill()} />
              <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
              <Button onClick={addSkill} size="sm">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((sk, i) => (
                <span key={i} className="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-700">
                  {sk.name}
                  <span className="text-xs opacity-70">({sk.level})</span>
                  <button onClick={() => setSkills(skills.filter((_, idx) => idx !== i))} className="ml-1 text-brand-400 hover:text-brand-600">×</button>
                </span>
              ))}
            </div>
            <Button className="w-full" onClick={nextStep} disabled={skills.length === 0}>Next</Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Preferences</h2>
            <Input label="Location preference" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Tehran or Remote" />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Work Type</label>
              <div className="flex gap-2">
                {(['Remote', 'Hybrid', 'OnSite'] as const).map((wt) => (
                  <button key={wt} onClick={() => setWorkType(wt)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium ${workType === wt ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                    {wt}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Minimum monthly salary (optional)" type="number" value={desiredSalary} onChange={(e) => setDesiredSalary(e.target.value)} />
            <Button className="w-full" onClick={nextStep}>Finish & Start Exploring</Button>
          </div>
        </Card>
      )}

      {step > 1 && (
        <button onClick={() => setStep(step - 1)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
      )}
    </div>
  );
}
