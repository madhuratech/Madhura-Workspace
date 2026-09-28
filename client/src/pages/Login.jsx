import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const { login } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      showToast('Login Successful! Welcome back.', 'success');
      navigate('/');
    } else {
      showToast('Invalid email or password', 'error');
      setError('Invalid email or password');
    }
  };

  const handleOpenForgot = () => {
    setForgotEmail(email || '');
    setForgotError('');
    setForgotSuccess(false);
    setForgotMessage('');
    setShowForgotModal(true);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await axios.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotSuccess(true);
      setForgotMessage(res.data?.message || 'Password reset request sent to Managing Director and HR.');
      showToast('Password reset request sent to MD & HR!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit reset request. Please check the email.';
      setForgotError(msg);
      showToast(msg, 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-bg-primary">
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-bg-secondary border-r border-border p-12">
        <div className="max-w-md">
          <div className="flex items-center mb-6">
            <img src="/logo-round.svg" alt="Madhura Logo" className="w-16 h-16 mr-4 shadow-[0_0_15px_rgba(255,202,34,0.3)] rounded-full" />
            <h1 className="text-5xl font-extrabold tracking-tight">
              <span className="text-[#1b2b4c] text-[color:var(--text-primary)]">Madhura</span><span className="text-[#ffca22]">Workspace</span>
            </h1>
          </div>
          <p className="text-text-secondary text-lg leading-relaxed">
            The minimalist, all-in-one platform for modern teams. Streamline your workflow, collaborate seamlessly, and achieve more.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden flex items-center">
            <img src="/logo-round.svg" alt="Madhura Logo" className="w-10 h-10 mr-3 shadow-[0_0_10px_rgba(255,202,34,0.3)] rounded-full" />
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-[#1b2b4c] text-[color:var(--text-primary)]">Madhura</span><span className="text-[#ffca22]">WS</span>
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Welcome back</h2>
          <p className="text-text-secondary mb-8">Please enter your details to sign in.</p>

          {error && (
            <div className="bg-danger/10 text-danger px-4 py-3 rounded-lg mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-text-primary">Password</label>
                <button
                  type="button"
                  onClick={handleOpenForgot}
                  className="text-xs font-semibold text-accent-blue hover:text-amber-500 hover:underline transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border border-border rounded-lg px-4 py-3 pr-10 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-[#1b2b4c] text-white hover:bg-[#ffca22] hover:text-[#1b2b4c] hover:shadow-lg hover:-translate-y-0.5 font-bold py-3 px-4 rounded-lg transition-all duration-300 mt-2 cursor-pointer"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/40 text-center">
            <p className="text-xs text-text-secondary flex items-center justify-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Enterprise Workspace &bull; Invite-Only Access
            </p>
            <p className="text-[11px] text-text-secondary/70 mt-1">
              New team members and password resets are provisioned by Managing Director / HR.
            </p>
          </div>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-bg-primary border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-secondary/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/10 text-accent-blue flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <h3 className="font-bold text-text-primary text-base">Reset Password</h3>
              </div>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {forgotSuccess ? (
                <div className="text-center py-4 space-y-4">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-text-primary">Request Dispatched!</h4>
                    <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                      {forgotMessage}
                    </p>
                  </div>
                  <div className="p-3 bg-bg-secondary rounded-xl border border-border text-xs text-text-secondary text-left space-y-1">
                    <p className="font-semibold text-text-primary">What happens next?</p>
                    <p>&bull; MD or HR will set a new password for your account.</p>
                    <p>&bull; Contact your administrator or check with HR to receive your new login credentials.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-2.5 bg-accent-blue hover:bg-accent-indigo text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer mt-2"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Enter your registered email address below. A password reset request will be automatically dispatched to your <strong className="text-text-primary">Managing Director (MD)</strong> and <strong className="text-text-primary">HR</strong> to set a new password for you.
                  </p>

                  {forgotError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 text-danger text-xs font-medium">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">Registered Email</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-1 focus:ring-accent-blue transition-all"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-indigo text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Sending Request...</span>
                        </>
                      ) : (
                        <span>Request Reset from MD / HR</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
