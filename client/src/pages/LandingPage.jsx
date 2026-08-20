import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Users, CheckCircle, Shield, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans flex flex-col">
      {/* Navbar */}
      <nav className="w-full bg-bg-secondary border-b border-border py-4 px-6 sm:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-blue flex items-center justify-center shadow-sm">
            <LayoutDashboard className="text-accent-text w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-heading-color">Madhura Workspace</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-text-secondary hover:text-accent-blue transition-colors">
            Log in
          </Link>
          <Link to="/register" className="text-sm font-semibold bg-accent-blue text-accent-text px-5 py-2 rounded-lg hover:bg-accent-indigo transition-colors shadow-sm">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center text-center px-4 pt-20 pb-16 sm:pt-32 sm:pb-24 max-w-5xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-extrabold text-heading-color tracking-tight leading-tight mb-6">
          The all-in-one workspace <br className="hidden sm:block" /> for your entire team
        </h1>
        <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mb-10 leading-relaxed">
          Madhura Workspace is an internal project management and productivity platform. We help teams collaborate on tasks, manage support tickets, sync Google Calendars, and communicate effectively in one secure dashboard.
        </p>
        <div className="flex gap-4">
          <Link to="/register" className="flex items-center gap-2 bg-accent-blue text-accent-text text-lg font-semibold px-8 py-4 rounded-xl hover:bg-accent-indigo transition-transform hover:-translate-y-1 shadow-lg">
            Get Started <ArrowRight size={20} />
          </Link>
          <Link to="/login" className="flex items-center gap-2 bg-bg-secondary text-heading-color border border-border text-lg font-semibold px-8 py-4 rounded-xl hover:bg-border/50 transition-colors shadow-sm">
            Login to Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left w-full">
          <div className="bg-bg-secondary p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-6">
              <CheckCircle className="text-accent-blue w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-heading-color mb-3">Project Management</h3>
            <p className="text-text-secondary leading-relaxed">
              Track tasks through custom Kanban boards. Organize your workflow seamlessly from start to finish.
            </p>
          </div>

          <div className="bg-bg-secondary p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-6">
              <Users className="text-accent-blue w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-heading-color mb-3">Team Collaboration</h3>
            <p className="text-text-secondary leading-relaxed">
              Real-time chat, internal support tickets, and direct Google Email integrations to keep everyone on the same page.
            </p>
          </div>

          <div className="bg-bg-secondary p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-6">
              <Shield className="text-accent-blue w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-heading-color mb-3">Secure & Private</h3>
            <p className="text-text-secondary leading-relaxed">
              Role-based access controls and enterprise-grade security for your data, integrating safely with Google APIs.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border bg-bg-secondary py-8 px-6 text-center text-sm text-text-secondary flex flex-col sm:flex-row justify-between items-center">
        <p>&copy; {new Date().getFullYear()} Madhura Tech. All rights reserved.</p>
        <div className="flex gap-6 mt-4 sm:mt-0">
          <Link to="/privacy" className="hover:text-accent-blue transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-accent-blue transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
