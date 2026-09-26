import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('super_admin');
  const [error, setError] = useState('');
  
  // Invitation fields
  const [inviteToken, setInviteToken] = useState(null);
  const [isInvite, setIsInvite] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  const { register, loginWithToken } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (token) {
      setInviteToken(token);
      validateInviteToken(token);
    }
  }, [location]);

  const validateInviteToken = async (token) => {
    try {
      const res = await axios.get(`/invitations/validate/${token}`);
      if (res.data.valid) {
        setIsInvite(true);
        setEmail(res.data.email);
        setRole(res.data.role);
        setWorkspaceName(res.data.workspaceName);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid or expired invitation token.');
      showToast('Invalid or expired invitation token', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isInvite) {
      try {
        const res = await axios.post('/invitations/accept', {
          token: inviteToken,
          name,
          password
        });
        
        if (res.data.success) {
          showToast('Invitation accepted! Welcome to the workspace.', 'success');
          // If loginWithToken exists in AuthContext, we can use it, otherwise redirect to login
          if (loginWithToken) {
             loginWithToken(res.data.token, res.data.user);
          }
          navigate('/');
        }
      } catch (err) {
        console.error(err);
        showToast(err.response?.data?.message || 'Failed to accept invitation.', 'error');
        setError('Failed to accept invitation. Please try again.');
      }
    } else {
      const success = await register(name, email, password, role);
      if (success) {
        showToast('Account successfully created! Welcome.', 'success');
        navigate('/');
      } else {
        showToast('Registration failed.', 'error');
        setError('Registration failed. Please try again.');
      }
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="mb-10 lg:hidden flex items-center">
            <img src="/logo-round.svg" alt="Madhura Logo" className="w-10 h-10 mr-3 shadow-[0_0_10px_rgba(255,202,34,0.3)] rounded-full" />
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-[#1b2b4c] text-[color:var(--text-primary)]">Madhura</span><span className="text-[#ffca22]">WS</span>
            </h1>
          </div>

          {!isInvite && !inviteToken ? (
            <div className="bg-bg-secondary border border-border/80 p-8 rounded-3xl text-center space-y-5 shadow-soft">
              <div className="w-16 h-16 bg-accent-blue/10 text-accent-blue rounded-2xl flex items-center justify-center mx-auto border border-accent-blue/20 shadow-sm">
                <Lock size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary font-outfit mb-2">Registration Closed</h2>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Invite-Only Workspace
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                The initial Managing Director account is already created. New team members must be invited by their Managing Director or HR.
              </p>
              <div className="pt-3">
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#1b2b4c] text-white hover:bg-[#ffca22] hover:text-[#1b2b4c] font-bold py-3.5 px-4 rounded-xl transition-all duration-300 shadow-md cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
                Accept Invitation
              </h2>
              <p className="text-text-secondary mb-8">
                Join <strong className="text-text-primary">{workspaceName || 'the workspace'}</strong> by setting up your credentials.
              </p>

              {error && (
                <div className="bg-danger/10 text-danger px-4 py-3 rounded-lg mb-6 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue transition-colors"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue transition-colors opacity-70 cursor-not-allowed bg-bg-secondary"
                    placeholder="you@company.com"
                    required
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Create Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border border-border rounded-lg px-4 py-3 pr-10 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue transition-colors"
                      placeholder="••••••••"
                      minLength="6"
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
                  className="w-full bg-[#1b2b4c] text-white hover:bg-[#ffca22] hover:text-[#1b2b4c] hover:shadow-lg hover:-translate-y-0.5 font-bold py-3.5 px-4 rounded-xl transition-all duration-300 mt-4 cursor-pointer"
                >
                  Join Workspace
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-text-secondary">
                Already registered?{' '}
                <Link to="/login" className="text-[#1b2b4c] text-[color:var(--text-primary)] hover:text-[#ffca22] font-bold transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
