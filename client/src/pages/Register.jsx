import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <h1 className="text-5xl font-extrabold text-text-primary tracking-tight mb-4">
            Madhura<span className="text-accent-blue">Workspace</span>
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed">
            The minimalist, all-in-one platform for modern teams. Streamline your workflow, collaborate seamlessly, and achieve more.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="mb-10 lg:hidden">
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
              Madhura<span className="text-accent-blue">WS</span>
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            {isInvite ? 'Accept Invitation' : 'Create an account'}
          </h2>
          <p className="text-text-secondary mb-8">
            {isInvite ? `Join ${workspaceName || 'the workspace'} by setting up your account.` : 'Set up your workspace super admin account.'}
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
              <label className="block text-sm font-semibold text-text-primary mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-transparent border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue transition-colors ${isInvite ? 'opacity-70 cursor-not-allowed bg-bg-secondary' : ''}`}
                placeholder="you@company.com"
                required
                disabled={isInvite}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue transition-colors"
                placeholder="••••••••"
                minLength="6"
                required
              />
            </div>
            {!isInvite && (
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Account Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-accent-blue transition-colors appearance-none"
                >
                  <option value="super_admin">Super Admin (Initial Setup)</option>
                </select>
                <p className="text-xs text-text-secondary mt-2">Note: Employees do not use this page. They are created by the Super Admin internally.</p>
              </div>
            )}
            <button 
              type="submit" 
              className="w-full bg-text-primary text-bg-primary hover:bg-text-secondary font-bold py-3 px-4 rounded-lg transition-colors mt-4"
            >
              Sign Up
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-text-primary hover:text-accent-blue font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
