import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
              Madhura<span className="text-accent-blue">WS</span>
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
              <label className="block text-sm font-semibold text-text-primary mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-text-primary text-bg-primary hover:bg-text-secondary font-bold py-3 px-4 rounded-lg transition-colors mt-2"
            >
              Sign In
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="text-text-primary hover:text-accent-blue font-semibold transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
