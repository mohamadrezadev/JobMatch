import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { AcademyView } from './AcademyView';
import { useResumeDraftStore } from '@/stores/useResumeDraftStore';
describe('Academy lessons', () => {
  it('checks answers without verifying or adding a resume skill', () => {
    useResumeDraftStore.getState().initialize('demo');
    const skills = useResumeDraftStore.getState().draft.skills;
    render(<AcademyView />);
    fireEvent.click(screen.getByRole('button', { name: 'شروع پودمان ۲۰ دقیقه‌ای' }));
    fireEvent.click(screen.getByRole('button', { name: 'string' }));
    expect(screen.getByRole('status')).toHaveTextContent('دوباره تلاش کنید');
    fireEvent.click(screen.getByRole('button', { name: 'boolean' }));
    expect(screen.getByRole('status')).toHaveTextContent('پاسخ صحیح');
    expect(useResumeDraftStore.getState().draft.skills).toBe(skills);
  });
  it('resets an answer when a different lesson opens', () => {
    render(<AcademyView />);
    fireEvent.click(screen.getByRole('button', { name: 'شروع پودمان ۲۰ دقیقه‌ای' }));
    fireEvent.click(screen.getByRole('button', { name: 'boolean' }));
    fireEvent.click(screen.getByRole('button', { name: 'شروع پودمان ۱۵ دقیقه‌ای' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Git و گردش کار تیمی/ })).toBeInTheDocument();
  });
});
