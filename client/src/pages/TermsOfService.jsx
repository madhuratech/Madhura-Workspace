import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-bg-secondary p-8 md:p-12 rounded-2xl shadow-sm border border-border">
        <div className="mb-8 border-b border-border pb-6">
          <Link to="/login" className="text-accent-blue hover:underline text-sm mb-4 inline-block">&larr; Back to Home</Link>
          <h1 className="text-3xl font-extrabold text-heading-color mb-2">Terms of Service</h1>
          <p className="text-text-secondary text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-text-primary">
          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using Madhura Workspace, you agree to be bound by these Terms of Service. If you disagree 
              with any part of the terms, you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">2. Description of Service</h2>
            <p>
              Madhura Workspace is an internal project management and communication tool. We provide various features including 
              task tracking, team chat, ticketing, and integrations with third-party services like Google Workspace.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">3. User Accounts</h2>
            <p>
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. 
              Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">4. Google API Integrations</h2>
            <p>
              If you choose to link your Google Account to Madhura Workspace, we will request permissions to access specific Google APIs 
              (such as Calendar or Gmail) on your behalf. You may revoke these permissions at any time from your Google Account settings. 
              Our use of this data is strictly limited to providing the features you request within Madhura Workspace and is governed by our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">5. Acceptable Use</h2>
            <p>
              You agree not to use the Service for any unlawful purpose, or in any way that interrupts, damages, or impairs the service. 
              You are responsible for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">6. Termination</h2>
            <p>
              We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, 
              including without limitation if you breach the Terms.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">7. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at: <br/>
              <strong className="text-accent-blue mt-2 inline-block">madhuratechcbe@gmail.com</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
