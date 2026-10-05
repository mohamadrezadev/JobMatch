import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { JobsView } from './JobsView';
import apiClient from '@/lib/api-client';
let mockAuthenticated = false;
jest.mock('@/stores/useAuthStore', () => ({ useAuthStore: () => ({ isAuthenticated: mockAuthenticated, user: mockAuthenticated ? { id: 'owner' } : null }) }));
jest.mock('@/lib/api-client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
describe('Reference job discovery', () => {
  beforeEach(() => { jest.clearAllMocks(); mockAuthenticated = false; window.history.replaceState({}, '', '/jobs?preview=design'); });
  it('searches skills and selects a matching detail', () => {
    render(<JobsView />);
    fireEvent.change(screen.getByLabelText('جستجوی فرصت‌ها'), { target: { value: 'Tailwind' } });
    expect(screen.getAllByRole('button', { name: /شرکت پیشگامان فناوری/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /استارتاپ هوش‌نو/ })).not.toBeInTheDocument();
  });
  it('does not show samples in ordinary anonymous navigation', () => {
    window.history.replaceState({}, '', '/jobs');
    render(<JobsView />);
    expect(screen.queryByRole('button', { name: /شرکت پیشگامان فناوری/ })).not.toBeInTheDocument();
  });
  it('supports hybrid and remote filters with an empty state', () => {
    render(<JobsView />);
    fireEvent.change(screen.getByLabelText('شهر و نوع حضور'), { target: { value: 'hybrid' } });
    expect(screen.getAllByRole('button', { name: /شرکت پیشگامان فناوری/ })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('شهر و نوع حضور'), { target: { value: 'remote' } });
    expect(screen.getAllByRole('button', { name: /استارتاپ هوش‌نو/ })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('جستجوی فرصت‌ها'), { target: { value: 'not-found' } });
    expect(screen.getByText('هیچ شغلی با این مشخصات یافت نشد.')).toBeInTheDocument();
  });
  it('removes filter chips', () => {
    render(<JobsView />);
    fireEvent.click(screen.getByRole('button', { name: 'حذف فیلتر جونیور' }));
    fireEvent.click(screen.getByRole('button', { name: 'حذف فیلتر فرانت‌اند' }));
    expect(screen.getByText('بدون محدودیت')).toBeInTheDocument();
  });
  it('keeps authenticated API failures visible instead of supplying samples', async () => {
    mockAuthenticated = true;
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('offline'));
    render(<JobsView />);
    expect(await screen.findByRole('alert')).toHaveTextContent('دریافت فرصت‌ها ممکن نشد');
    expect(screen.queryByRole('button', { name: /شرکت پیشگامان فناوری/ })).not.toBeInTheDocument();
  });
  it('accepts bare backend responses and reports an actual empty result', async () => {
    mockAuthenticated = true;
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { items: [] } });
    render(<JobsView />);
    expect(await screen.findByText('هیچ شغلی با این مشخصات یافت نشد.')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/api/jobs?limit=50');
    expect(screen.queryByText('۹۲٪')).not.toBeInTheDocument();
  });
});
