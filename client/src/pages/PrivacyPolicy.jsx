import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-bg-secondary p-8 md:p-12 rounded-2xl shadow-sm border border-border">
        <div className="mb-8 border-b border-border pb-6">
          <Link to="/login" className="text-accent-blue hover:underline text-sm mb-4 inline-block">&larr; Back to Home</Link>
          <h1 className="text-3xl font-extrabold text-heading-color mb-2">Privacy Policy</h1>
          <p className="text-text-secondary text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-text-primary">
          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">1. Introduction</h2>
            <p>
              Welcome to Madhura Workspace. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you as to how we look after your personal data when you visit our application 
              and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">2. The Data We Collect About You</h2>
            <p className="mb-2">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc pl-5 space-y-1 text-text-secondary">
              <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
              <li><strong>Google OAuth Data:</strong> If you connect your Google account, we access the specific scopes you grant (like your email address, basic profile, calendar, or emails) solely to provide the integrated workspace features to you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">3. How We Use Your Data</h2>
            <p>
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data to 
              provide the workspace services, manage your account, and integrate with external APIs (like Google Workspace) exactly 
              as you authorize us to do. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">4. Google API Services Usage Disclosure</h2>
            <p>
              Madhura Workspace's use and transfer to any other app of information received from Google APIs will adhere to the 
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline mx-1">Google API Services User Data Policy</a>, 
              including the Limited Use requirements. We only request scopes necessary to perform the tasks you initiate within the workspace.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">5. Data Security</h2>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, 
              or accessed in an unauthorized way, altered, or disclosed. Access to your personal data is limited to those employees, 
              agents, contractors, and other third parties who have a business need to know.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-heading-color mb-3">6. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact us at: <br/>
              <strong className="text-accent-blue mt-2 inline-block">madhuratechcbe@gmail.com</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
