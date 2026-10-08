// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLoginForm } from '../hooks/useLoginForm';
import { useRegisterForm } from '../hooks/useRegisterForm';
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const fetchMock = vi.fn();
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Login() {
  const form = useLoginForm();
  return <form onSubmit={form.handleSubmit}><input name="email" aria-label="email" defaultValue="test@example.com" /><input name="password" aria-label="password" defaultValue="Password1" /><button disabled={form.isSubmitting}>Submit</button><p>{form.submitNotice}</p></form>;
}
function Register() {
  const form = useRegisterForm();
  return <form onSubmit={form.handleSubmit}>{(['name', 'email', 'password', 'confirmPassword'] as const).map(field => <input key={field} name={field} aria-label={field} value={form.values[field]} onChange={form.handleChange(field)} />)}<input type="checkbox" aria-label="consent" checked={form.dataPrivacyConsent} onChange={event => form.handleDataPrivacyConsentChange(event.target.checked)} /><button disabled={form.isSubmitting}>Submit</button><p>{form.submitNotice}</p></form>;
}
function mount(child: React.ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{child}</QueryClientProvider>); }
describe('auth forms use the server', () => {
  it('logs in with a same-origin HttpOnly-cookie request and redirects only on success', async () => {
    fetchMock.mockResolvedValue(Response.json({ status: true, data: { user: { id: 'user' } } }));
    mount(<Login />); fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/homepage'));
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({ method: 'POST', credentials: 'same-origin', body: JSON.stringify({ email: 'test@example.com', password: 'Password1' }) }));
    expect(localStorage.length).toBe(0);
  });
  it('shows an API failure without pretending login succeeded', async () => {
    fetchMock.mockResolvedValue(Response.json({ status: false, error: { message: 'Invalid email or password' } }, { status: 401 }));
    mount(<Login />); fireEvent.click(screen.getByText('Submit'));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument(); expect(router.replace).not.toHaveBeenCalled();
  });
  it('registers matching passwords and consent without silently persisting client-only name', async () => {
    fetchMock.mockResolvedValue(Response.json({ status: true, data: { user: { id: 'user' } } }, { status: 201 }));
    mount(<Register />);
    for (const [field, value] of Object.entries({ name: 'Test Person', email: 'test@example.com', password: 'Password1', confirmPassword: 'Password1' })) fireEvent.change(screen.getByLabelText(field), { target: { value } });
    fireEvent.click(screen.getByLabelText('consent')); fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login?registered=1'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'test@example.com', password: 'Password1', confirmPassword: 'Password1', dataPrivacyConsent: true });
  });
});
